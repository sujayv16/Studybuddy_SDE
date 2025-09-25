# StudyBuddy (Full‑Stack) — System Overview, Architecture, and Runbook

Connect university students with the right study partners, schedule meetups, and chat in real‑time. This monorepo contains a React SPA frontend and an Express/Socket.IO backend with MongoDB persistence.

Repository: https://github.com/sujayv16/Studybuddy_SDE

## 🔭 System Overview

- Single Page Application (React + TypeScript) served during development by CRA and in production via the backend `build/` directory
- RESTful API for auth, matching, chat, and scheduling
- Real‑time messaging using Socket.IO
- Session‑based authentication (MongoDB session store)
- Observability: health/readiness/status pages, Prometheus metrics, structured logs with request IDs

See `docs/diagrams/` for all diagrams. Start with:
- `docs/diagrams/system-overview.svg` — big picture
- `docs/diagrams/client-server-spa.svg` — client–server SPA pattern
- `docs/diagrams/layered-architecture.svg` — backend layers
- `docs/diagrams/data-model.svg` — Mongoose entities and relations

## ✅ Functional Requirements (condensed)

- Account management: signup, login, logout, profile edit, avatar upload
- University scoping: connect only with students from the same university
- Course management: add/remove courses; show overlap between users
- Matching: find and list compatible buddies (by course/availability)
- Real‑time chat: 1:1 and group chatrooms, message history
- Notifications: new messages, user joins/leaves, schedule updates
- Scheduling: propose/accept study sessions; manage weekly availability
- Search/filter: discover buddies by course and availability
- Responsive UI: desktop, tablet, and mobile layouts

## 🧰 Tech Stack

- Frontend: React 18, TypeScript, React Router, Bootstrap, Socket.IO client
- Backend: Node.js, Express 4, Socket.IO 4, Mongoose 6
- Database: MongoDB (Atlas or local)
- Auth/Sessions: express-session + connect-mongo
- Uploads: Multer (profile images)
- Security: helmet, secure cookies, optional rate limiting
- Observability: winston logs, request IDs, Prometheus (`prom-client`)

## 🔒 Software Quality Attributes (what we prioritized)

- Security
	- Hybrid auth: supports legacy plaintext passwords and bcrypt; auto‑upgrades plaintext to bcrypt on successful login
	- Session hardening: httpOnly, sameSite=lax, secure in production
	- Headers via helmet; optional login rate limiting; avoids logging secrets
- Observability
	- `/healthz`, `/readyz`, `/status` (HTML + JSON) with a light blue theme
	- `/metrics` with `http_request_duration_seconds` histogram plus default metrics
	- Structured logs (winston) with `X-Request-Id` correlation
- Maintainability
	- Layered routing/controllers/models; middleware pipeline
	- Centralized configuration via environment variables

Details and visuals: `docs/diagrams/observability.svg`, `docs/diagrams/security-components.svg`.

## 🧱 Architecture Patterns Used

- Client–Server with SPA: browser SPA talks to REST + WebSocket endpoints
- Layered Architecture: routes/controllers → services/logic → models (Mongoose)
- Middleware Pipeline: helmet → cors → session → requestId → logging → routers → metrics
- Event‑Driven (Socket.IO): chat and scheduling updates via real‑time events
- Active Record (Mongoose): models encapsulate persistence for core entities

See diagrams for each pattern under `docs/diagrams/`.

## 📁 Repository Structure

```
.
├─ backend/
│  ├─ app.js                   # Express app, sessions, CORS, helmet, metrics
│  ├─ bin/www                  # Server bootstrap (PORT=8080 default)
│  ├─ routes/                  # users, match, chat, scheduling, health
│  ├─ sockets/                 # chatSocket.js, meet-upSocket.js
│  ├─ *.model.js               # user, chatroom, message, match, scheduling
│  ├─ middlewares/             # requestId, rateLimit
│  ├─ logging/                 # winston logger
│  ├─ utils/                   # password helpers (bcrypt + hybrid)
│  ├─ build/                   # Production React build (served by backend)
│  └─ public/                  # Static assets
├─ frontend/
│  ├─ src/Components/          # React components (Login, Matching, Chats, etc.)
│  ├─ src/styles/theme.css     # Light blue global theme
│  ├─ package.json             # CRA scripts; proxy → http://localhost:8080
│  └─ public/
├─ docs/
│  └─ diagrams/                # All architecture & flow SVGs + README index
└─ README.md
```

## � API Surfaces (high level)

- `/users` — signup, login, profile, check session
- `/matches` — matching search and lists
- `/chats` — chatroom CRUD, messages
- `/scheduling` — propose/accept/update availability and sessions
- Observability: `/healthz`, `/readyz`, `/status`, `/metrics`
- Socket.IO namespace (default) for chat and scheduling events

## ⚙️ Configuration (Backend .env)

Create `backend/.env` with at least one of the following Mongo modes:

```
# Choose one of: atlas | local | none
MONGO_MODE=atlas

# If using Atlas
MONGO_URL=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# If using local
MONGO_URL_LOCAL=mongodb://localhost:27017/studdybuddy

# Sessions & logging
SESSION_SECRET=replace-with-a-strong-secret
LOG_LEVEL=info
LOG_FORMAT=pretty  # pretty | json

# Server
PORT=8080
NODE_ENV=development
```

Notes:
- Set `MONGO_MODE=none` to skip DB connection (useful for quick UI demos)
- Session cookies are `secure` only in production; use HTTPS in prod

## 🗺️ Frontend Env (optional)

Create `frontend/.env` if you plan to enable maps:

```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## �️ Installation

Prerequisites:
- Node.js 16+ and npm
- MongoDB (local service or Atlas)

Install dependencies:

```powershell
# From repo root
cd backend; npm install; cd ..
cd frontend; npm install; cd ..
```

## ▶️ Running (Development)

Backend (port 8080):

```powershell
cd backend
npm run dev   # uses nodemon
# or
npm start
```

Frontend (port 3000, proxy → 8080):

```powershell
cd frontend
npm start
```

Open http://localhost:3000 for the SPA. The backend API and sockets are proxied at http://localhost:8080.

Health & metrics during dev:
- http://localhost:8080/healthz
- http://localhost:8080/readyz
- http://localhost:8080/status (HTML dashboard)
- http://localhost:8080/metrics (Prometheus)

## 📦 Production Build (served by backend)

```powershell
cd frontend
npm run build

# Copy or set backend to serve the build (already configured to serve backend/build)
# Place the contents of frontend/build into backend/build if not already present

cd ../backend
npm start
```

Visit the backend server URL (default http://localhost:8080) — it serves the built SPA.

## 🧪 Troubleshooting

- Port in use (EADDRINUSE: 8080)
	- Stop the other process or change `PORT` in `backend/.env`
- Cannot connect to MongoDB
	- For local dev on Windows, ensure the MongoDB service is running
	- Or set `MONGO_MODE=none` to skip DB for a quick UI run
- CORS/session issues
	- Frontend `package.json` proxy must be `http://localhost:8080`
	- Use the same hostname and avoid mixing `localhost` with `127.0.0.1`
- Missing session secret
	- Set `SESSION_SECRET` in `backend/.env`

