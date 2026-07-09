import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from app.core.rate_limit import limiter
    HAS_SLOWAPI = True
except ImportError:
    HAS_SLOWAPI = False
    logger.warning("slowapi not available — rate limiting disabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.base import Base
    from app.db.seed import seed_foundation
    from app.db.session import engine as _engine, SessionMaker

    try:
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=_engine)
        db = SessionMaker()
        try:
            _run_migrations(db)
            seed_foundation(db)
        except Exception as e:
            logger.error("Seed failed (non-fatal): %s", e)
        finally:
            db.close()
        logger.info("Database ready")
    except Exception as e:
        logger.warning("Database unavailable at startup (running in stateless mode): %s", e)
    yield


def _run_migrations(db):
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS face_descriptor VARCHAR(2000)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(32)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS plan_id INTEGER",
    ]
    for stmt in migrations:
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration skipped (%s): %s", stmt[:60], e)


def create_app() -> FastAPI:
    settings = get_settings()
    is_prod = settings.environment == "production"

    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    if HAS_SLOWAPI:
        app.state.limiter = limiter
        async def rate_limit_handler(_request, _exc):
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
        app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
        app.add_middleware(SlowAPIMiddleware)

    origins = [str(o) for o in settings.backend_cors_origins] if settings.backend_cors_origins else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=bool(settings.backend_cors_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/api/health", tags=["health"])
    def health_check() -> dict:
        db_status = "not_checked"
        db_hint = ""
        try:
            from sqlalchemy import text
            with _engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_status = "ok"
        except Exception as e:
            msg = str(e)
            db_status = "error"
            db_hint = msg[:300]
        return {
            "status": "ok",
            "environment": settings.environment,
            "db": db_status,
            "db_hint": db_hint,
        }

    return app


app = create_app()
