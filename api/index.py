import json
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

try:
    from app.main import app
except Exception:
    err = traceback.format_exc()

    async def app(scope, receive, send):
        if scope["type"] != "http":
            return
        body = json.dumps({"error": "App startup failed", "detail": err}).encode()
        await send({"type": "http.response.start", "status": 500, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": body})
