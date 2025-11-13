# Backend development quick guide

This file lists a few small commands to improve maintainability: linting, formatting and a tiny unit smoke test.

Prerequisites

- Node.js installed (v14+ recommended)
- npm install run from `backend` to install dev dependencies (eslint/prettier)

Install deps

```powershell
cd backend
npm install
```

Linting

```powershell
# run eslint across backend JS files
npm run lint
```

Formatting

```powershell
npm run format
```

Unit smoke test (no test framework required)

```powershell
npm run test:unit
```

Notes

- These are lightweight, low-risk improvements to keep the codebase consistent.
- For CI, add a job that runs `npm ci && npm run lint && npm run test:unit`.
