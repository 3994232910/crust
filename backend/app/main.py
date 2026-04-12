import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pathlib import Path

from app.api.main import api_router
from app.core.config import settings


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
app.include_router(api_router, prefix=settings.API_V1_STR)

from fastapi.middleware.cors import CORSMiddleware

# 👇 必须加在 app = FastAPI() 下面
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源（开发环境用）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)