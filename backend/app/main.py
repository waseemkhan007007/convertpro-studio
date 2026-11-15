"""FastAPI application entry point.

Run from the backend/ folder:
    uvicorn app.main:app --reload --port 8000
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import health, tools

settings = get_settings()

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("convertpro")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    app.include_router(health.router, prefix="/api")
    app.include_router(tools.router, prefix="/api")

    logger.info("%s %s started (%s)", settings.app_name, settings.app_version, settings.environment)
    return app


app = create_app()
