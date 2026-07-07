from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    backend_cors_origins: list[AnyHttpUrl | str] = Field(default_factory=list)

    initial_super_admin_email: str | None = None
    initial_super_admin_password: str | None = None
    initial_super_admin_name: str = "Platform Owner"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
