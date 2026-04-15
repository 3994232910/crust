import uuid
from datetime import datetime, timezone, timedelta

import jwt
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from starlette.staticfiles import StaticFiles
from pathlib import Path

from app.api.main import api_router
from app.core.config import settings
from app.core.db import engine
from app.core.security import ALGORITHM


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

'''
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
    )
'''
    
# Mount static files for avatars
avatars_dir = Path("avatars")
avatars_dir.mkdir(exist_ok=True)
app.mount("/avatars", StaticFiles(directory=avatars_dir), name="avatars")

# Mount static files for 3D models
models_dir = Path("models")
models_dir.mkdir(exist_ok=True)
app.mount("/models", StaticFiles(directory=models_dir), name="models")

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

_PING_INTERVAL = timedelta(minutes=5)
_SKIP_PING_PREFIXES = ("/avatars", "/models", f"{settings.API_V1_STR}/openapi")


@app.middleware("http")
async def activity_ping_middleware(request: Request, call_next):
    response = await call_next(request)

    path = request.url.path
    if any(path.startswith(p) for p in _SKIP_PING_PREFIXES):
        return response

    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return response

    token = auth_header[7:]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = uuid.UUID(str(payload["sub"]))
    except Exception:
        return response

    try:
        # Lazy import to avoid circular dependency at module load time
        from app.models.dashboard import UserActivityPing  # noqa: PLC0415

        now = datetime.now(timezone.utc)
        with Session(engine) as session:
            recent = session.exec(
                select(UserActivityPing)
                .where(UserActivityPing.user_id == user_id)
                .where(UserActivityPing.pinged_at >= now - _PING_INTERVAL)
            ).first()
            if not recent:
                session.add(UserActivityPing(user_id=user_id, pinged_at=now))
                session.commit()
    except Exception:
        pass

    return response


app.include_router(api_router, prefix=settings.API_V1_STR)
