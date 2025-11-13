/**
 * Simple benchmarking script for local API endpoints.
 * Usage: node tools/bench.js --url http://localhost:8080 --endpoints "/matches/candidates,/matches/buddies" --concurrency 20 --requests 200
 * It will perform the requested number of requests split across concurrency and report p50/p95/p99 and mean.
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');
// Simple CLI arg parsing to avoid external dependency on yargs
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i+1] && !argv[i+1].startsWith('--') ? argv[i+1] : true;
      args[k] = v;
      if (v !== true) i++;
    }
  }
  if (!args.url || !args.endpoints) {
    console.error('Usage: node tools/bench.js --url http://localhost:8080 --endpoints "/matches/candidates,/matches/buddies" --concurrency 20 --requests 200');
    process.exit(2);
  }
  const base = args.url.replace(/\/$/, '');
  const endpoints = args.endpoints.split(',').map(e => e.trim()).filter(Boolean);
  const concurrency = Math.max(1, parseInt(args.concurrency || '10', 10));
  const totalRequests = Math.max(1, parseInt(args.requests || '100', 10));
  return { base, endpoints, concurrency, totalRequests };
}

const { base, endpoints, concurrency, totalRequests } = parseArgs();

function doRequest(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const start = process.hrtime.bigint();
    const req = lib.request(parsed, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const dur = Number(end - start) / 1000000;
        resolve({ status: res.statusCode, durationMs: dur });
      });
    });
    req.on('error', (e) => {
      const end = process.hrtime.bigint();
      const dur = Number(end - start) / 1000000;
      resolve({ status: 0, durationMs: dur, error: e.message });
    });
    req.end();
  });
}

async function runFor(endpoint) {
  console.log('Running bench for', endpoint);
  const results = [];
  const promises = [];
  let inflight = 0;
  let done = 0;

  function scheduleNext() {
    if (results.length >= totalRequests) return;
    if (inflight >= concurrency) return;
    inflight++;
    const url = base + endpoint;
    doRequest(url).then((r) => {
      results.push(r);
      inflight--;
      done++;
      if (results.length < totalRequests) scheduleNext();
    });
  }

  // kick off initial
  for (let i = 0; i < concurrency && i < totalRequests; i++) scheduleNext();

  // wait until enough results
  while (results.length < totalRequests) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 50));
    if (results.length > 0 && results.length % 50 === 0) process.stdout.write('.');
  }

  const durations = results.map(r => r.durationMs).sort((a,b)=>a-b);
  const mean = durations.reduce((a,b)=>a+b,0)/durations.length;
  function pct(p){
    const idx = Math.floor((p/100) * durations.length);
    return durations[Math.min(idx, durations.length-1)];
  }
  return {
    total: durations.length,
    mean,
    p50: pct(50),
    p95: pct(95),
    p99: pct(99),
    raw: durations
  };
}

(async ()=>{
  const report = {};
  for (const ep of endpoints) {
    try {
      const r = await runFor(ep);
      report[ep] = r;
      console.log('\nResult for', ep);
      console.log('count', r.total, 'mean', r.mean.toFixed(2), 'p50', r.p50.toFixed(2), 'p95', r.p95.toFixed(2), 'p99', r.p99.toFixed(2));
    } catch (e) {
      console.error('bench error', e && e.message);
    }
  }
  const fs = require('fs');
  const out = { ts: new Date().toISOString(), base, concurrency, totalRequests, report };
  const outPath = 'tools/bench-result-' + Date.now() + '.json';
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Saved report to', outPath);
})();
