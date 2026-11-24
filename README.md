# 🔥 HackForge

> **AI-Powered Hackathon Management Platform** — team formation, project evaluation, and everything in between.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         HackForge                               │
│                                                                 │
│  ┌──────────────┐     REST/JSON      ┌────────────────────┐     │
│  │              │ ─────────────────► │                    │     │
│  │   Frontend   │                    │      Backend       │     │
│  │  React+Vite  │ ◄───────────────── │  Node/Express/     │     │
│  │  Tailwind    │     REST/JSON      │  MongoDB           │     │
│  │  :5173       │                    │  :4000             │     │
│  └──────────────┘                    └────────┬───────────┘     │
│                                               │                 │
│                                    HTTP/JSON  │                 │
│                                   (internal)  │                 │
│                                               ▼                 │
│                                    ┌──────────────────┐         │
│                                    │   AI Service     │         │
│                                    │  Python/FastAPI  │         │
│                                    │  :8000           │         │
│                                    └──────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Services

| Service      | Stack                          | Port | Responsibility                                   |
|--------------|--------------------------------|------|--------------------------------------------------|
| `frontend`   | React 18, Vite, Tailwind CSS   | 5173 | UI — hackathon browsing, team management, dashboards |
| `backend`    | Node.js, Express, MongoDB/Mongoose | 4000 | CRUD operations, authentication (JWT), business logic |
| `ai-service` | Python 3.11, FastAPI           | 8000 | AI team formation & project evaluation scoring   |

## Data Flow

```
Frontend  ──[CRUD / Auth]──►  Backend  ──[Team Formation]──►  AI Service
                                       ──[Eval Scoring]────►  AI Service
```

1. **Frontend → Backend**: All user-facing operations (create hackathon, register team, submit project) go through the Express REST API. Auth is handled via JWT tokens.
2. **Backend → AI Service**: The backend calls the AI service internally (never exposed to the browser) for:
   - **Team Formation** — suggests optimal team compositions based on skill profiles.
   - **Evaluation Scoring** — scores submitted projects using criteria-weighted AI analysis.

---

## Project Structure

```
HackForge/
├── frontend/            # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/         # Axios client wrappers
│   │   ├── components/  # Shared UI components
│   │   ├── pages/       # Route-level page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── store/       # State management (Zustand)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/             # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/      # DB connection, env config
│   │   ├── controllers/ # Route handler logic
│   │   ├── middleware/  # Auth, error handling, logging
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # Express routers
│   │   └── services/    # Business logic & AI service calls
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── ai-service/          # Python + FastAPI
│   ├── app/
│   │   ├── api/         # FastAPI routers
│   │   ├── core/        # Config, logging
│   │   ├── models/      # Pydantic schemas
│   │   └── services/    # ML/AI logic
│   ├── main.py
│   └── requirements.txt
│
├── docker-compose.yml   # Run all three services locally
└── README.md            # This file
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- MongoDB (local or Atlas connection string)
- Docker & Docker Compose (optional)

### Option A — Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env   # fill in your values
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- AI Service: http://localhost:8000

### Option B — Manual

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, AI_SERVICE_URL
npm run dev
```

**AI Service**
```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Health Checks

```bash
curl http://localhost:4000/api/health   # Backend
curl http://localhost:8000/health       # AI Service
# Frontend health is just loading http://localhost:5173
```

---

## Environment Variables

### `backend/.env`

| Variable        | Description                          | Example                        |
|-----------------|--------------------------------------|--------------------------------|
| `PORT`          | Express server port                  | `4000`                         |
| `MONGO_URI`     | MongoDB connection string            | `mongodb://localhost:27017/hackforge` |
| `JWT_SECRET`    | Secret key for JWT signing           | `change_me_in_production`      |
| `AI_SERVICE_URL`| Internal URL of the AI service       | `http://ai-service:8000`       |
| `NODE_ENV`      | Runtime environment                  | `development`                  |

### `ai-service/.env`

| Variable   | Description         | Example       |
|------------|---------------------|---------------|
| `ENV`      | Runtime environment | `development` |
| `LOG_LEVEL`| Logging verbosity   | `info`        |

---

## Contributing

Business logic is **not yet implemented** — this repository is the scaffolding skeleton. See individual service READMEs for next steps.
