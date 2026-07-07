import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

# Test 1: config
from app.core.config import get_settings
print("config OK", flush=True)

settings = get_settings()
print(f"DB URL: {settings.database_url}", flush=True)

from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "ok", "config_loaded": True}
