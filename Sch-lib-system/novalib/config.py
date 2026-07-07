import os
import sys
from pathlib import Path

from novalib import __app_name__, __company__


MAX_BOOKS_DEFAULT = 5
CHECKOUT_DAYS_DEFAULT = 10
DAILY_FINE_UGX_DEFAULT = 500
DEFAULT_ADMIN_EMAIL = "admin@novalib.local"
DEFAULT_ADMIN_PASSWORD = "admin123"


def app_data_dir() -> Path:
    override = os.getenv("NOVALIB_HOME")
    if override:
        return Path(override).expanduser()

    if sys.platform.startswith("win"):
        base = Path(os.getenv("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        return base / __company__ / __app_name__

    return Path.home() / ".local" / "share" / __app_name__.lower()


def database_path() -> Path:
    override = os.getenv("NOVALIB_DB_PATH")
    if override:
        return Path(override).expanduser()
    return app_data_dir() / "novalib.sqlite3"


def log_path() -> Path:
    override = os.getenv("NOVALIB_LOG_PATH")
    if override:
        return Path(override).expanduser()
    return app_data_dir() / "novalib.log"


def resource_path(relative_path: str) -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS) / relative_path
    return Path(__file__).resolve().parent.parent / relative_path
