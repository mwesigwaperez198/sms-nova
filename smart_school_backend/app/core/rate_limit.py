import logging

logger = logging.getLogger(__name__)

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    from app.core.config import get_settings

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[get_settings().rate_limit_default],
    )
    HAS_LIMITER = True
except Exception:
    limiter = None
    HAS_LIMITER = False
    logger.warning("slowapi or its dependencies not available — rate limits disabled")
