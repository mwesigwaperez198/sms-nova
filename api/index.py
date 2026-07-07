import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

results = {}

try:
    from app.core.config import get_settings, Settings
    results["config_module"] = "ok"
except Exception as e:
    results["config_module"] = "err: " + str(e)

try:
    from app.core.security import hash_password, verify_password
    results["security_module"] = "ok"
except Exception as e:
    results["security_module"] = "err: " + str(e)

try:
    from app.db.session import get_db
    results["session_module"] = "ok"
except Exception as e:
    results["session_module"] = "err: " + str(e)

try:
    from app.models.user import User
    results["user_model"] = "ok"
except Exception as e:
    results["user_model"] = "err: " + str(e)

try:
    from app.api.router import api_router
    results["api_router"] = "ok"
except Exception as e:
    results["api_router"] = "err: " + str(e)

app = None

try:
    from app.main import app as _main_app
    app = _main_app
    results["main_app"] = "ok"
except Exception as e:
    results["main_app"] = "err: " + str(e)
    from fastapi import FastAPI
    app = FastAPI()


@app.get("/api/imports")
async def import_results():
    return {"status": "ok", "imports": results}
