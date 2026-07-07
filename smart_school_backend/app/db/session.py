import logging
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def _engine_args():
    settings = get_settings()
    url = settings.database_url
    connect_args = {}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif "supabase" in url or "sslmode" not in url:
        if "?" in url:
            url += "&sslmode=require"
        else:
            url += "?sslmode=require"

    return url, connect_args


def get_engine():
    url, connect_args = _engine_args()
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


def get_session_maker():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    session_maker = get_session_maker()
    db = session_maker()
    try:
        yield db
    except Exception as e:
        logger.error("Database session error: %s", e)
        raise
    finally:
        db.close()
