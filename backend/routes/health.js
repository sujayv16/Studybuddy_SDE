const express = require('express');
const os = require('os');
const router = express.Router();
const mongoose = require('mongoose');

function dbState() {
  const state = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

function collectStatus() {
  const mem = process.memoryUsage();
  const cpuLoad = os.loadavg ? os.loadavg() : [];
  const db = dbState();
  const status = db === 'connected' ? 'ok' : db === 'connecting' ? 'degraded' : 'down';
  return {
    status,
    timestamp: new Date().toISOString(),
  uptimeSec: Math.round(process.uptime()),
    node: {
      version: process.version,
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
      },
      cpuLoad,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
    },
    dependencies: {
      mongo: db,
    },
    request: {
      id: undefined, // filled at runtime if middleware sets req.requestId
    },
  };
}

// Liveness probe with content negotiation (JSON default, HTML if requested)
router.get('/healthz', (req, res) => {
  const payload = collectStatus();
  payload.request.id = req.requestId;
  const accept = String(req.headers['accept'] || '').toLowerCase();
  if (accept.includes('text/html')) {
    const color = payload.status === 'ok' ? '#16a34a' : payload.status === 'degraded' ? '#d97706' : '#dc2626';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><meta charset="utf-8"/><style>body{margin:40px;font-family:system-ui;background:radial-gradient(1000px 700px at 10% -10%, #f2f7ff, #eaf2ff), radial-gradient(1000px 700px at 110% 110%, #ffffff, #f7fbff);color:#0b1220}.chip{display:inline-block;padding:4px 10px;border-radius:999px;background:${color}1a;border:1px solid ${color}55;color:${color};font-weight:600}</style><h1>Health</h1><p><span class="chip">${payload.status.toUpperCase()}</span></p><p>Uptime: ${formatUptime(payload.uptimeSec)}</p><p>Timestamp: ${payload.timestamp}</p>`);
  } else {
    res.json({ status: payload.status === 'down' ? 'degraded' : 'ok', uptimeSec: payload.uptimeSec, timestamp: payload.timestamp });
  }
});

// Readiness probe with content negotiation
router.get('/readyz', (req, res) => {
  const payload = collectStatus();
  payload.request.id = req.requestId;
  const code = payload.status === 'ok' ? 200 : payload.status === 'degraded' ? 200 : 503;
  const accept = String(req.headers['accept'] || '').toLowerCase();
  if (accept.includes('text/html')) {
    const color = payload.status === 'ok' ? '#16a34a' : payload.status === 'degraded' ? '#d97706' : '#dc2626';
    const fmt = (n) => `${(n/1024/1024).toFixed(1)} MB`;
    res.status(code).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><meta charset="utf-8"/><style>body{margin:40px;font-family:system-ui;background:radial-gradient(1000px 700px at 10% -10%, #f2f7ff, #eaf2ff), radial-gradient(1000px 700px at 110% 110%, #ffffff, #f7fbff);color:#0b1220}table{border-collapse:collapse}td{padding:6px 10px;border-bottom:1px dashed #dbe7ff}.chip{display:inline-block;padding:4px 10px;border-radius:999px;background:${color}1a;border:1px solid ${color}55;color:${color};font-weight:600}</style><h1>Readiness</h1><p><span class="chip">${payload.status.toUpperCase()}</span></p><p>Timestamp: ${payload.timestamp} &middot; Uptime: ${formatUptime(payload.uptimeSec)}</p><h3>Node</h3><table><tr><td>Version</td><td>${payload.node.version}</td></tr><tr><td>PID</td><td>${payload.node.pid}</td></tr><tr><td>Platform</td><td>${payload.node.platform} ${payload.node.arch}</td></tr><tr><td>RSS</td><td>${fmt(payload.node.memory.rss)}</td></tr><tr><td>Heap Used</td><td>${fmt(payload.node.memory.heapUsed)} / ${fmt(payload.node.memory.heapTotal)}</td></tr></table><h3>Dependencies</h3><table><tr><td>MongoDB</td><td>${payload.dependencies.mongo}</td></tr></table>`);
  } else {
    res.status(code).json(payload);
  }
});

// Human-friendly HTML status dashboard
router.get('/status', (req, res) => {
  const s = collectStatus();
  s.request.id = req.requestId;
    const color = s.status === 'ok' ? '#16a34a' : s.status === 'degraded' ? '#d97706' : '#dc2626';
  const badge = s.status.toUpperCase();
  const fmtBytes = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const cpu = s.node.cpuLoad && s.node.cpuLoad.length ? s.node.cpuLoad.map((v) => v.toFixed(2)).join(' / ') : 'n/a';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>StuddyBuddy Status</title>
      <style>
            :root { --bg:#f2f7ff; --card:#ffffff; --muted:#6b7280; --ok:${color}; --border:#dbe7ff; }
            body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji; background: radial-gradient(1000px 700px at 10% -10%, #f2f7ff, #eaf2ff), radial-gradient(1000px 700px at 110% 110%, #ffffff, #f7fbff); color:#0b1220; }
            .wrap { max-width: 920px; margin: 40px auto; padding: 0 16px; }
        .headline { display:flex; align-items:center; gap:12px; }
            .badge { padding:4px 10px; border-radius:999px; font-weight:600; background:${color}1a; color:${color}; border:1px solid ${color}55; }
            .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-top:16px; }
            .card { background:#ffffff; border:1px solid var(--border); border-radius:10px; padding:16px; box-shadow:0 10px 30px rgba(0,0,0,.08); }
            .k { color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
            .v { font-size:14px; font-weight:600; margin-top:4px; color:#0b1220; }
        table { width:100%; border-collapse: collapse; }
            td { padding:6px 0; border-bottom:1px dashed var(--border); }
            .muted { color:#6b7280; font-size:12px; }
            .foot { margin-top:24px; color:#6b7280; font-size:12px; }
            a { color:#2563eb; text-decoration:none; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="headline">
          <h1 style="margin:0; font-size:22px;">StuddyBuddy • Status</h1>
          <span class="badge">${badge}</span>
        </div>
        <p class="muted">${s.timestamp} • Request ID: ${s.request.id || 'n/a'}</p>
        <div class="grid">
          <div class="card">
            <div class="k">Application</div>
            <div class="v">Node ${s.node.version} on ${s.node.platform} ${s.node.arch}</div>
            <table>
              <tr><td>PID</td><td class="v">${s.node.pid}</td></tr>
              <tr><td>Uptime</td><td class="v">${s.uptimeSec}s</td></tr>
              <tr><td>Env</td><td class="v">${s.node.env.NODE_ENV}</td></tr>
              <tr><td>CWD</td><td class="v">${s.node.cwd}</td></tr>
            </table>
          </div>
          <div class="card">
            <div class="k">Resources</div>
            <table>
              <tr><td>RSS</td><td class="v">${fmtBytes(s.node.memory.rss)}</td></tr>
              <tr><td>Heap Used</td><td class="v">${fmtBytes(s.node.memory.heapUsed)} / ${fmtBytes(s.node.memory.heapTotal)}</td></tr>
              <tr><td>External</td><td class="v">${fmtBytes(s.node.memory.external)}</td></tr>
              <tr><td>CPU Load (1m/5m/15m)</td><td class="v">${cpu}</td></tr>
            </table>
          </div>
          <div class="card">
            <div class="k">Dependencies</div>
            <table>
              <tr><td>MongoDB</td><td class="v">${s.dependencies.mongo}</td></tr>
            </table>
          </div>
        </div>
        <div class="foot">Hints: JSON probes at <a href="/healthz">/healthz</a> and <a href="/readyz">/readyz</a>. This page is for quick human checks.</div>
      </div>
    </body>
  </html>`);
});

module.exports = router;
