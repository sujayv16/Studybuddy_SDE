#!/usr/bin/env node
/*
  Aggregate perf logs and bench results into human readable JSON/CSV/HTML report.

  Usage:
    node tools/aggregate_metrics.js [--perf logsPath] [--benchDir tools] [--metricsUrl http://localhost:8080/metrics]

  Outputs:
    - tools/metrics-summary.json
    - tools/metrics-summary.csv
    - tools/metrics-report.html

*/
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { perf: path.join(__dirname, '..', 'backend', 'perf_logs.jsonl'), benchDir: path.join(__dirname), metricsUrl: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--perf') out.perf = args[++i];
    if (a === '--benchDir') out.benchDir = args[++i];
    if (a === '--metricsUrl') out.metricsUrl = args[++i];
  }
  return out;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  if (Number.isInteger(idx)) return sorted[idx];
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function statsFromArray(arr) {
  if (!arr || !arr.length) return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, stddev: 0 };
  const sorted = arr.slice().sort((a, b) => a - b);
  const count = arr.length;
  const sum = arr.reduce((s, v) => s + v, 0);
  const mean = sum / count;
  const sq = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
  const stddev = Math.sqrt(sq / count);
  return {
    count,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stddev,
  };
}

async function readPerfLogs(perfPath) {
  if (!fs.existsSync(perfPath)) return {};
  const raw = fs.readFileSync(perfPath, 'utf8').trim().split('\n').filter(Boolean);
  const byRoute = Object.create(null);
  for (const line of raw) {
    try {
      const rec = JSON.parse(line);
      const key = (rec.route || rec.path || rec.url || rec.reqPath || 'unknown');
      const duration = Number(rec.durationMs || rec.duration || rec.ms || rec.t || 0);
      if (!byRoute[key]) byRoute[key] = [];
      byRoute[key].push(duration);
    } catch (e) { /* ignore parse errors */ }
  }
  const out = {};
  for (const k of Object.keys(byRoute)) out[k] = statsFromArray(byRoute[k]);
  return out;
}

function readBenchResults(benchDir) {
  const files = fs.readdirSync(benchDir).filter(f => f.startsWith('bench-result') && f.endsWith('.json'));
  const byEndpoint = Object.create(null);
  for (const f of files) {
    try {
      const full = path.join(benchDir, f);
      const j = JSON.parse(fs.readFileSync(full, 'utf8'));
      // expect structure: { endpoint: { count, mean, p50, p95, p99, ... } }
      for (const ep of Object.keys(j)) {
        const rec = j[ep];
        if (!byEndpoint[ep]) byEndpoint[ep] = [];
        // choose duration numbers array if present, else use mean
        if (Array.isArray(rec.durations)) byEndpoint[ep].push(...rec.durations);
        else if (rec.mean) byEndpoint[ep].push(rec.mean);
      }
    } catch (e) { /* ignore malformed files */ }
  }
  const out = {};
  for (const k of Object.keys(byEndpoint)) out[k] = statsFromArray(byEndpoint[k]);
  return out;
}

function fetchMetrics(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

async function buildReport(opts) {
  console.log('Reading perf logs from', opts.perf);
  const perf = await readPerfLogs(opts.perf);
  console.log('Reading bench results from', opts.benchDir);
  const bench = readBenchResults(opts.benchDir);
  let metricsRaw = null;
  if (opts.metricsUrl) {
    console.log('Fetching /metrics from', opts.metricsUrl);
    metricsRaw = await fetchMetrics(opts.metricsUrl).catch(() => null);
  }

  const summary = { generatedAt: new Date().toISOString(), perf, bench, metrics: metricsRaw ? metricsRaw : null };

  const outJson = path.join(__dirname, 'metrics-summary.json');
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
  console.log('Wrote', outJson);

  // CSV: rows for perf and bench
  const rows = [];
  rows.push('source,route_or_endpoint,count,min,mean,p50,p95,p99,max,stddev');
  for (const k of Object.keys(perf)) rows.push(['perf', k, perf[k].count, perf[k].min, perf[k].mean.toFixed(2), perf[k].p50, perf[k].p95, perf[k].p99, perf[k].max, perf[k].stddev.toFixed(2)].join(','));
  for (const k of Object.keys(bench)) rows.push(['bench', k, bench[k].count, bench[k].min, bench[k].mean.toFixed(2), bench[k].mean.toFixed(2), bench[k].p50, bench[k].p95, bench[k].p99, bench[k].max, bench[k].stddev.toFixed(2)].join(','));
  const outCsv = path.join(__dirname, 'metrics-summary.csv');
  fs.writeFileSync(outCsv, rows.join('\n'));
  console.log('Wrote', outCsv);

  // HTML report (simple, uses Chart.js from CDN)
  const htmlPath = path.join(__dirname, 'metrics-report.html');
  const html = buildHtmlReport(summary);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Wrote', htmlPath);
}

function buildHtmlReport(summary) {
  const perfKeys = Object.keys(summary.perf || {});
  const benchKeys = Object.keys(summary.bench || {});
  const safe = (v) => (v === null || v === undefined ? '' : v);
  // Embed JSON data
  const dataJson = JSON.stringify(summary);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Metrics Report</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}table{border-collapse:collapse;width:100%;margin-bottom:12px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f2f2f2}</style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h2>Metrics Summary</h2>
  <p>Generated at: ${summary.generatedAt}</p>
  <h3>Perf logs (per-route)</h3>
  <table>
    <thead><tr><th>Route</th><th>count</th><th>mean (ms)</th><th>p50</th><th>p95</th><th>p99</th><th>min</th><th>max</th></tr></thead>
    <tbody>
    ${perfKeys.map(k => `<tr><td>${k}</td><td>${safe(summary.perf[k].count)}</td><td>${safe(summary.perf[k].mean.toFixed(2))}</td><td>${safe(summary.perf[k].p50)}</td><td>${safe(summary.perf[k].p95)}</td><td>${safe(summary.perf[k].p99)}</td><td>${safe(summary.perf[k].min)}</td><td>${safe(summary.perf[k].max)}</td></tr>`).join('\n')}
    </tbody>
  </table>

  <h3>Bench results (endpoints)</h3>
  <table>
    <thead><tr><th>Endpoint</th><th>count</th><th>mean (ms)</th><th>p50</th><th>p95</th><th>p99</th><th>min</th><th>max</th></tr></thead>
    <tbody>
    ${benchKeys.map(k => `<tr><td>${k}</td><td>${safe(summary.bench[k].count)}</td><td>${safe(summary.bench[k].mean.toFixed(2))}</td><td>${safe(summary.bench[k].p50)}</td><td>${safe(summary.bench[k].p95)}</td><td>${safe(summary.bench[k].p99)}</td><td>${safe(summary.bench[k].min)}</td><td>${safe(summary.bench[k].max)}</td></tr>`).join('\n')}
    </tbody>
  </table>

  <h3>Visual: Bench mean comparison</h3>
  <canvas id="benchChart" width="800" height="300"></canvas>

  <script>
    const summary = ${dataJson};
    const benchKeys = Object.keys(summary.bench || {});
    const labels = benchKeys;
    const means = benchKeys.map(k => summary.bench[k].mean || 0);
    const p95 = benchKeys.map(k => summary.bench[k].p95 || 0);
    const ctx = document.getElementById('benchChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'mean (ms)', data: means, backgroundColor: 'rgba(54,162,235,0.6)' },
          { label: 'p95 (ms)', data: p95, backgroundColor: 'rgba(255,99,132,0.6)' }
        ]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  </script>
</body>
</html>`;
}

async function main() {
  const opts = parseArgs();
  await buildReport(opts);
}

main().catch((e) => { console.error(e); process.exit(1); });
