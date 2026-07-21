import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import engine as _engine

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
    from app.db.session import SessionMaker

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
    from sqlalchemy import inspect

    inspector = inspect(db.bind)
    existing_cols = {c["name"] for c in inspector.get_columns("users")}
    if "profile_photo" not in existing_cols:
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN profile_photo VARCHAR(500)"))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration profile_photo: %s", e)
    if "face_descriptor" not in existing_cols:
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN face_descriptor VARCHAR(5000)"))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration face_descriptor: %s", e)
    else:
        try:
            db.execute(text("ALTER TABLE users ALTER COLUMN face_descriptor TYPE VARCHAR(5000)"))
            db.commit()
        except Exception:
            db.rollback()
    if "totp_secret" not in existing_cols:
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32)"))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration totp_secret: %s", e)
    if "is_2fa_enabled" not in existing_cols:
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN is_2fa_enabled BOOLEAN NOT NULL DEFAULT false"))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration is_2fa_enabled: %s", e)
    rr_cols = {c["name"] for c in inspector.get_columns("registration_requests")}
    if "plan_id" not in rr_cols:
        try:
            db.execute(text("ALTER TABLE registration_requests ADD COLUMN plan_id INTEGER"))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration plan_id: %s", e)
    rk_cols = {c["name"] for c in inspector.get_columns("registration_keys")} if "registration_keys" in inspector.get_table_names() else set()
    if "plan_id" not in rk_cols:
        try:
            db.execute(text("ALTER TABLE registration_keys ADD COLUMN plan_id INTEGER"))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration registration_keys.plan_id: %s", e)
    if "system_settings" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE system_settings (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(100) UNIQUE NOT NULL,
                    value TEXT NOT NULL DEFAULT 'false',
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning("Migration system_settings: %s", e)

    if "cashbook_entries" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE cashbook_entries (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    date VARCHAR(20) NOT NULL,
                    description VARCHAR(200) NOT NULL,
                    amount NUMERIC(12,2) NOT NULL,
                    paid_by VARCHAR(120) NOT NULL,
                    payment_method VARCHAR(50) NOT NULL,
                    receipt_no VARCHAR(50) UNIQUE NOT NULL,
                    entry_type VARCHAR(20) NOT NULL DEFAULT 'Income',
                    created_by_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            db.execute(text("CREATE INDEX idx_cashbook_entries_school_id ON cashbook_entries(school_id)"))
            db.commit()
            logger.info("Created cashbook_entries table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration cashbook_entries: %s", e)

    if "quotations" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE quotations (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    quotation_no VARCHAR(50) UNIQUE NOT NULL,
                    customer VARCHAR(200) NOT NULL,
                    date VARCHAR(20) NOT NULL,
                    items TEXT NOT NULL,
                    notes TEXT DEFAULT '',
                    total NUMERIC(12,2) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
                    created_by_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            db.execute(text("CREATE INDEX idx_quotations_school_id ON quotations(school_id)"))
            db.commit()
            logger.info("Created quotations table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration quotations: %s", e)

    if "requisitions" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE requisitions (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    req_no VARCHAR(50) UNIQUE NOT NULL,
                    department VARCHAR(200) NOT NULL,
                    requested_by VARCHAR(120) NOT NULL,
                    date VARCHAR(20) NOT NULL,
                    items TEXT NOT NULL,
                    purpose TEXT DEFAULT '',
                    total NUMERIC(12,2) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                    created_by_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            db.execute(text("CREATE INDEX idx_requisitions_school_id ON requisitions(school_id)"))
            db.commit()
            logger.info("Created requisitions table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration requisitions: %s", e)

    if "bank_accounts" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE bank_accounts (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    bank_name VARCHAR(200) NOT NULL,
                    account_name VARCHAR(200) NOT NULL,
                    account_number VARCHAR(100) NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            db.execute(text("CREATE INDEX idx_bank_accounts_school_id ON bank_accounts(school_id)"))
            db.commit()
            logger.info("Created bank_accounts table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration bank_accounts: %s", e)

    if "incidents" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE incidents (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER REFERENCES schools(id),
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    severity VARCHAR(20) NOT NULL DEFAULT 'info',
                    status VARCHAR(20) NOT NULL DEFAULT 'open',
                    reported_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    resolved_at TIMESTAMPTZ
                )
            """))
            db.execute(text("CREATE INDEX idx_incidents_school_id ON incidents(school_id)"))
            db.execute(text("CREATE INDEX idx_incidents_status ON incidents(status)"))
            db.commit()
            logger.info("Created incidents table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration incidents: %s", e)

    if "report_remarks" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE report_remarks (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER NOT NULL REFERENCES students(id),
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    academic_year VARCHAR(20) NOT NULL,
                    term VARCHAR(20) NOT NULL,
                    conduct VARCHAR(50),
                    effort VARCHAR(50),
                    participation VARCHAR(50),
                    general_remarks TEXT,
                    teacher_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(student_id, academic_year, term)
                )
            """))
            db.execute(text("CREATE INDEX idx_report_remarks_student_id ON report_remarks(student_id)"))
            db.execute(text("CREATE INDEX idx_report_remarks_school_id ON report_remarks(school_id)"))
            db.commit()
            logger.info("Created report_remarks table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration report_remarks: %s", e)

    if "subjects" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE subjects (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    name VARCHAR(100) NOT NULL,
                    code VARCHAR(20),
                    category VARCHAR(50),
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(school_id, name)
                )
            """))
            db.execute(text("CREATE INDEX idx_subjects_school_id ON subjects(school_id)"))
            db.commit()
            logger.info("Created subjects table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration subjects: %s", e)

    if "school_classes" not in inspector.get_table_names():
        try:
            db.execute(text("""
                CREATE TABLE school_classes (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    name VARCHAR(80) NOT NULL,
                    section VARCHAR(80),
                    capacity INTEGER,
                    class_teacher_id INTEGER REFERENCES users(id),
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(school_id, name)
                )
            """))
            db.execute(text("CREATE INDEX idx_school_classes_school_id ON school_classes(school_id)"))
            db.commit()
            logger.info("Created school_classes table")
        except Exception as e:
            db.rollback()
            logger.warning("Migration school_classes: %s", e)


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
    async def maintenance_and_security(request: Request, call_next) -> Response:
        path = request.url.path
        allowed_during_maintenance = (
            path.startswith("/api/health")
            or path.startswith("/api/v1/auth/login")
            or path.startswith("/api/v1/auth/refresh-token")
            or path.startswith("/api/v1/novara/")
            or path.startswith("/novara/")
            or path == "/docs"
            or path == "/openapi.json"
        )
        if not allowed_during_maintenance:
            try:
                from sqlalchemy import text
                with _engine.connect() as conn:
                    row = conn.execute(
                        text("SELECT value FROM system_settings WHERE key = 'maintenance_mode'")
                    ).one_or_none()
                    if row and row[0] == "true":
                        from fastapi.responses import JSONResponse
                        return JSONResponse(
                            status_code=503,
                            content={
                                "detail": "System is currently under maintenance. Please try again later.",
                                "maintenance": True,
                            },
                        )
            except Exception:
                pass

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
