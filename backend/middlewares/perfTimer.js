const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'perf_logs.jsonl');

// Ensure log file exists
try {
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '');
} catch (e) {
  // ignore
}

module.exports = function (req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1000000; // ns -> ms
      const route = req.route && req.route.path ? req.route.path : req.path;
      const entry = {
        ts: new Date().toISOString(),
        method: req.method,
        route,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        requestId: req.requestId || null,
        ip: req.ip || null,
      };
      // append as newline-delimited JSON for easy parsing
      fs.appendFile(LOG_PATH, JSON.stringify(entry) + '\n', (err) => {
        if (err) {
          // best-effort logging only
          // console.error('perf log write error', err && err.message);
        }
      });
    } catch (e) {
      // swallow
    }
  });
  next();
};
