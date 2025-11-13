const Redis = require('ioredis');
const logger = require('../logging/logger');

let client = null;

function createClient() {
  if (client) return client;
  const url =
    process.env.REDIS_URL || process.env.REDIS_URI || 'redis://127.0.0.1:6379';
  const opts = {
    maxRetriesPerRequest: 3,
    // Auto-reconnect strategy with backoff
    retryStrategy: (times) => Math.min(200 + times * 50, 2000),
  };
  client = new Redis(url, opts);

  client.on('error', (err) => {
    logger && logger.warn && logger.warn('redis_error', { error: err.message });
    console.error('Redis error', err && err.message);
  });

  client.on('connect', () => {
    console.log('✅ Redis client connecting...');
  });

  client.on('ready', () => {
    console.log('✅ Redis client ready');
  });

  client.on('close', () => {
    console.log('⚠️ Redis connection closed');
  });

  return client;
}

function getClient() {
  if (!client) return createClient();
  return client;
}

async function ping() {
  try {
    const c = getClient();
    const r = await c.ping();
    return r === 'PONG';
  } catch (e) {
    return false;
  }
}

module.exports = { getClient, createClient, ping };
