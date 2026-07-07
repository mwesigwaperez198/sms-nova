import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

app = None

try:
    from app.main import app as _app
    app = _app
except Exception:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    err_detail = traceback.format_exc()

    app = FastAPI(title="Smart School (fallback)")

    @app.get("/api/health")
    @app.get("/health")
    async def health():
        return {"status": "error", "detail": err_detail}

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    async def catch_all():
        return JSONResponse(
            status_code=500,
            content={
                "error": "App startup failed",
                "detail": err_detail,
            },
        )
