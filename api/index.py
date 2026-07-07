import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "smart_school_backend"))

# Test: does pydantic-settings import work?
from pydantic_settings import BaseSettings
print("pydantic_settings OK", flush=True)

from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "ok", "pydantic_settings": True}
