from functools import lru_cache
from os import environ

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_cors_origins(raw: str) -> list[str]:
    v = raw.strip()
    if not v:
        return []
    try:
        import json
        parsed = json.loads(v)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except Exception:
        pass
    return [item.strip() for item in v.split(",") if item.strip()]


class Settings(BaseSettings):
    app_name: str = "Smart School Backend"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./smart_school.db"

    secret_key: str = "change-this-secret-before-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 60 * 24 * 7
    rate_limit_default: str = "100/minute"
    rate_limit_auth: str = "10/minute"

    default_country: str = "Uganda"
    default_currency_code: str = "UGX"
    default_timezone: str = "Africa/Kampala"
    two_factor_issuer: str = "NOVARA School"
    resend_api_key: str | None = None
    owner_notification_email: str = "novaratechafrica@gmail.com"

    # Stored as plain str to avoid pydantic-settings' complex-type JSON decoding
    # (which would crash on malformed env var values before our parser runs)
    backend_cors_origins_raw: str = Field(default="", alias="backend_cors_origins")

    initial_super_admin_email: str | None = None
    initial_super_admin_password: str | None = None
    initial_super_admin_name: str = "Platform Owner"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def backend_cors_origins(self) -> list[str]:
        return _parse_cors_origins(self.backend_cors_origins_raw)

    @property
    def database_url_with_ssl(self) -> str:
        if self.database_url.startswith("sqlite"):
            return self.database_url
        url = self.database_url
        if "+psycopg://" in url and "psycopg2" not in url:
            url = url.replace("+psycopg://", "+psycopg2://")
        if "localhost" not in url and "sslmode" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=require"
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
