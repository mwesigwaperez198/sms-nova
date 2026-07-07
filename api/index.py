import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

app = None

try:
    from app.main import app as _main_app
    app = _main_app
except Exception:
    import json

    async def app(scope, receive, send):
        if scope["type"] != "http":
            return
        body = json.dumps({"error": "App startup failed"}).encode()
        await send({"type": "http.response.start", "status": 500, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": body})
