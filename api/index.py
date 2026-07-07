import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

try:
    from app.main import app
except Exception:
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    err = traceback.format_exc()
    app = FastAPI()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
    async def error_handler(request: Request, full_path: str):
        return JSONResponse(status_code=500, content={"error": "App startup failed", "detail": err})
