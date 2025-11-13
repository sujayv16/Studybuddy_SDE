# StudyBuddy (Full‑Stack) — System Overview, Architecture, and Runbook

Connect university students with the right study partners, schedule meetups, and chat in real‑time. This monorepo contains a React SPA frontend and an Express/Socket.IO backend with MongoDB persistence.

Repository: https://github.com/sujayv16/Studybuddy_SDE

## 🔭 System Overview

- Single Page Application (React + TypeScript) served during development by CRA and in production via the backend `build/` directory
- RESTful API for auth, matching, chat, and scheduling
- Real‑time messaging using Socket.IO
- Session‑based authentication (MongoDB session store)
- Observability: health/readiness/status pages, Prometheus metrics, structured logs with request IDs

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

# StudyBuddy

[Existing README content remains unchanged...]

## Quality Attributes (Non-Functional Requirements)

The StudyBuddy platform emphasizes five key quality attributes to ensure robust, scalable, secure, maintainable, observable, and inclusive software.

### Performance
The system is optimized for high responsiveness and low latency even under heavy usage. Techniques such as client-side debouncing of search and pagination requests, lean and indexed MongoDB queries, aggregation facets, Redis in-memory caching, and response compression significantly reduce backend load and improve data retrieval speeds. Benchmark logs tracking p50, p95, and p99 latency metrics provide objective evidence of performance improvements.

### Security
Security is enforced across all layers using proven practices. Session management employs secure cookies with httpOnly and sameSite flags, user passwords are hashed and salted via bcrypt, and HTTP headers are protected using Helmet middleware. Optional rate limiting backed by Redis prevents abuse, while observability features log and expose security-related events for audit and monitoring.

### Maintainability
The codebase follows a modular layered architecture separating routes, controllers, models, and middleware for clarity and extensibility. Environment variables centralized in configuration files simplify deployments. Developer telemetry, including request IDs and performance logs, assists in debugging and onboarding.

### Observability
Real-time system health is monitored via dedicated endpoints (/healthz, /readyz, /status) and Prometheus metrics (/metrics). Structured, request-correlated logging using Winston with request IDs enables effective tracing of operations and troubleshooting.

### Accessibility
To provide an inclusive user experience, the platform offers dark/light mode toggling and dynamic font size adjustment controls. These accessibility features enhance usability for diverse user needs, ensuring better readability and comfort.

---

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

