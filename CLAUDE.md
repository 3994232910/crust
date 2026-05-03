# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack knowledge management / note-taking app ("Forge") built on the Full Stack FastAPI Template. Features JWT auth, hierarchical markdown notes, item CRUD, admin panel, and 3D model (glTF/GLB) viewing integrated into notes.

## Commands

### Backend (from `/backend`)
```bash
uv sync                                              # Install Python deps
fastapi dev app/main.py                              # Dev server with hot reload
pytest                                               # Run all backend tests
pytest tests/api/routes/test_forge.py               # Run a single test file
alembic revision --autogenerate -m "description"    # Generate migration
alembic upgrade head                                 # Apply migrations
```

### Frontend (from `/frontend`)
```bash
bun install                   # Install deps
bun run dev                   # Vite dev server (port 5173)
bun run build                 # TypeScript check + Vite bundle
bun run lint                  # Format/lint with Biome
bun run generate-client       # Regenerate OpenAPI client from backend
bun run test                  # Playwright E2E tests
```

### Full Stack (Docker)
```bash
docker compose watch          # Full stack with hot reload (recommended for dev)
docker compose up -d          # Background mode
docker compose exec backend bash   # Shell into backend container
bash ./scripts/generate-client.sh  # Regenerate frontend API client
bash ./scripts/test.sh             # Full test suite in Docker
```

**Dev URLs**: Frontend `localhost:5173`, API `localhost:8000`, Swagger `localhost:8000/docs`, Adminer `localhost:8080`, Mailcatcher `localhost:1080`

## Architecture

### Backend (`/backend/app`)
- **FastAPI** with **SQLModel** (SQLAlchemy + Pydantic combined) against PostgreSQL
- Models in `models/` serve as both ORM tables (`table=True`) and Pydantic API schemas — no separate schema layer
- CRUD helpers centralized in `crud.py`; business logic stays thin in route handlers
- Dependency injection via `api/deps.py`: `get_db()` for sessions, `get_current_user()` / `get_current_active_superuser()` for auth
- JWT auth in `core/security.py`; settings loaded via Pydantic in `core/config.py` from `.env`
- Static mounts for avatars and 3D models served directly from FastAPI

### Frontend (`/frontend/src`)
- **React 18 + TypeScript**, file-based routing with **TanStack Router** (new file in `routes/` = new route)
- **TanStack Query** for all server state; `client/` contains the auto-generated OpenAPI client — never edit it manually
- Auth state via `hooks/useAuth.ts` (JWT stored in localStorage, attached to all requests)
- UI built with **shadcn/ui** (Radix primitives) + **Tailwind CSS 4**
- 3D rendering via **Three.js + React Three Fiber** (`components/Forge/Model3DRenderer.tsx`)
- Markdown editing with math, code highlighting, and GFM support via `react-markdown` stack

### Data Flow
1. Route handler renders → TanStack Query hook fetches → auto-generated client sends request with JWT
2. Backend validates token via dependency → queries DB via SQLModel session → returns Pydantic-serialized response
3. Query cache invalidated on mutations; no WebSocket/real-time

### Key Relationships
```
User 1:N Item
User 1:N Forge (Forge.parent_id self-references for hierarchy)
```

## Development Notes

- **After any backend API change**: run `bash scripts/generate-client.sh` to sync the frontend client
- **After any model change**: create an Alembic migration before running the app
- **Routing**: `_layout.tsx` wraps all authenticated routes; unauthenticated pages live at the route root
- **Linting**: backend uses Ruff + MyPy (strict); frontend uses Biome — run linters before committing
- **Email templates**: MJML source lives in `backend/app/email-templates/src/`, compiled HTML in `build/`
- **Environment**: copy `.env.example` to `.env` and set `SECRET_KEY`, DB credentials, and superuser password before first run
