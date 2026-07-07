from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    super_admin_email: str
    admin_email: str
    super_admin_password: str | None
    admin_password: str | None


def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("SMS_APP_NAME", "Nova SMS Platform"),
        environment=os.getenv("SMS_ENV", "local"),
        super_admin_email=os.getenv("SMS_SUPER_ADMIN_EMAIL", "admin@novasms.local"),
        admin_email=os.getenv("SMS_ADMIN_EMAIL", "admin@novasms.local"),
        super_admin_password=os.getenv("SMS_SUPER_ADMIN_PASSWORD", "school2026"),
        admin_password=os.getenv("SMS_ADMIN_PASSWORD", "school2026"),
    )
