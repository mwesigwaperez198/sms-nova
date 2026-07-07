import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vercel")

try:
    from mangum import Mangum
    from app.main import app
    handler = Mangum(app, lifespan="off")
    logger.info("App loaded successfully")
except Exception as e:
    logger.critical("Failed to start app: %s", e, exc_info=True)

    def handler(event, context):
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": '{"detail": "App failed to initialize. Check server logs."}',
        }
