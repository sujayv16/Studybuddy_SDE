Metrics tools

- tools/bench.js  - simple synthetic bench tool (already in repo)
- tools/aggregate_metrics.js - new: aggregates perf logs and bench results and generates:
  - tools/metrics-summary.json
  - tools/metrics-summary.csv
  - tools/metrics-report.html (open in browser)

Usage:
1) Ensure backend is running (so perf logs are produced):
   - cd backend
   - npm run dev

2) Run bench as needed from repo root, e.g.:
   node tools/bench.js --url http://localhost:8080 --endpoints "/matches/candidates,/matches/buddies" --concurrency 20 --requests 200

3) Run aggregator:
   node tools/aggregate_metrics.js --perf backend/perf_logs.jsonl --benchDir tools --metricsUrl http://localhost:8080/metrics

4) Open `tools/metrics-report.html` in your browser to view a human-readable summary and simple charts.

Notes:
- The aggregator reads `backend/perf_logs.jsonl` (NDJSON of per-request timings) and any `bench-result*.json` files in the specified benchDir.
- For production-grade dashboards, use Prometheus + Grafana and export instrumentation (we already expose `/metrics`).
