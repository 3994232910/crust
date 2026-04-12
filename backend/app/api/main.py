from fastapi import APIRouter

from app.api.routes import dashboard, forge, items, login, private, users, utils

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(forge.router)
api_router.include_router(dashboard.router)
api_router.include_router(private.router)
