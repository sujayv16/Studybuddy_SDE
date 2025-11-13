// Simple in-memory response cache middleware with optional Redis backend
// Usage: const cache = require('../middlewares/cache');
// router.get('/path', cache({ ttl: 5000 }), handler)
const DEFAULT_TTL = 10000; // 10s
const MAX_ENTRIES = 1000;
const clientProm = require('prom-client');

// Prometheus counters for cache hits/misses
const cacheHits = new clientProm.Counter({
  name: 'cache_hits_total',
  help: 'Cache hits total',
});
const cacheMisses = new clientProm.Counter({
  name: 'cache_misses_total',
  help: 'Cache misses total',
});

class SimpleCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttl) {
    if (this.store.size > MAX_ENTRIES) {
      // evict oldest
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    const expires = Date.now() + ttl;
    this.store.set(key, { value, expires });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
}

const globalCache = new SimpleCache();
let redisClient = null;
const useRedis =
  String(process.env.CACHE_BACKEND || '').toLowerCase() === 'redis';
if (useRedis) {
  try {
    const rc = require('../utils/redisClient');
    redisClient = rc.getClient();
  } catch (e) {
    console.warn(
      'Could not initialize redis client for cache middleware',
      e.message || e
    );
    redisClient = null;
  }
}

function makeKey(req) {
  // include method + originalUrl; do not include headers or cookies
  return `${req.method}:${req.originalUrl}`;
}

function cacheMiddleware(options) {
  const ttl = (options && options.ttl) || DEFAULT_TTL;
  return function (req, res, next) {
    try {
      if (req.method !== 'GET') return next();
      const key = makeKey(req);

      // Try Redis first when configured
      if (useRedis && redisClient) {
        return redisClient
          .get(key)
          .then((val) => {
            if (val) {
              try {
                const parsed = JSON.parse(val);
                cacheHits.inc();
                if (parsed.headers) res.set(parsed.headers);
                return res.status(200).send(Buffer.from(parsed.body, 'base64'));
              } catch (e) {
                // fallthrough to next
              }
            }
            // Not in redis -> check memory cache as fallback
            const mem = globalCache.get(key);
            if (mem) {
              cacheHits.inc();
              if (mem.headers) res.set(mem.headers);
              return res.status(200).send(mem.body);
            }
            cacheMisses.inc();
            return wrapSendAndProceed();
          })
          .catch((e) => {
            // Redis failed, fallback to in-memory
            const mem = globalCache.get(key);
            if (mem) {
              cacheHits.inc();
              if (mem.headers) res.set(mem.headers);
              return res.status(200).send(mem.body);
            }
            cacheMisses.inc();
            return wrapSendAndProceed();
          });
      }

      const cached = globalCache.get(key);
      if (cached) {
        cacheHits.inc();
        res.set(cached.headers || {});
        return res.status(200).send(cached.body);
      }
      cacheMisses.inc();

      function wrapSendAndProceed() {
        // wrap send to capture response
        const origSend = res.send.bind(res);
        res.send = function (body) {
          try {
            // only cache successful responses
            if (res.statusCode === 200) {
              const headers = {};
              // copy cache-friendly headers
              const headerNames = [
                'content-type',
                'content-length',
                'cache-control',
              ];
              headerNames.forEach((h) => {
                if (res.get(h)) headers[h] = res.get(h);
              });

              // Store in memory
              try {
                globalCache.set(key, { body, headers }, ttl);
              } catch (e) {
                /* ignore */
              }

              // Store in Redis if available (serialize body as base64 to preserve binaries)
              if (useRedis && redisClient) {
                try {
                  const payload = {
                    headers,
                    body: Buffer.isBuffer(body)
                      ? body.toString('base64')
                      : Buffer.from(String(body)).toString('base64'),
                  };
                  redisClient
                    .setex(key, Math.ceil(ttl / 1000), JSON.stringify(payload))
                    .catch(() => {});
                } catch (e) {
                  /* ignore */
                }
              }
            }
          } catch (e) {
            // ignore cache errors
          }
          return origSend(body);
        };
        return next();
      }
      return wrapSendAndProceed();
    } catch (e) {
      return next();
    }
  };
}

module.exports = cacheMiddleware;

// Export helper functions to clear cache from application code
// Clear a specific key (exact match)
cacheMiddleware.clearKey = function (key) {
  try {
    if (useRedis && redisClient) {
      redisClient.del(key).catch(() => {});
    }
    // remove from in-memory store
    if (globalCache && globalCache.store) globalCache.store.delete(key);
  } catch (e) {
    // ignore
  }
};

// Clear any keys containing the given substring (simple pattern)
cacheMiddleware.clearPattern = function (substr) {
  try {
    if (!substr) return;
    if (useRedis && redisClient) {
      // Redis doesn't support listing keys in clustered env; for dev we can use KEYS
      try {
        redisClient
          .keys(`*${substr}*`)
          .then((keys) => {
            if (keys && keys.length) redisClient.del(...keys).catch(() => {});
          })
          .catch(() => {});
      } catch (e) {
        // ignore
      }
    }
    // In-memory: iterate and remove matching keys
    if (globalCache && globalCache.store) {
      for (const k of Array.from(globalCache.store.keys())) {
        if (k.includes(substr)) globalCache.store.delete(k);
      }
    }
  } catch (e) {
    // ignore
  }
};
