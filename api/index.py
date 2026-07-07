import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

results = {}

try:
    from app.core.config import get_settings, Settings
    results["config_module"] = "ok"
except Exception as e:
    results["config_module"] = str(e)

from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "ok", "imports": results}
