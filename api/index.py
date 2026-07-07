import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vercel")

try:
    from app.main import app
    logger.info("App loaded successfully")
except Exception as e:
    logger.critical("Failed to start app: %s", e, exc_info=True)

    def app(environ, start_response):
        body = f'{{"error": "App initialization failed"}}'.encode()
        start_response("500 Internal Server Error", [("Content-Type", "application/json")])
        return [body]
