from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")

    app_name: str = "WeCrew InfraAsset"
    app_env: str = "development"
    app_secret_key: str = "change-me-in-production-use-64-random-bytes"
    api_host: str = "0.0.0.0"
    api_port: int = 8080
    web_origin: str = "http://localhost:3000"

    database_url: str = "sqlite+pysqlite:///./infraasset.db"
    redis_url: str = "redis://localhost:6379/0"

    oidc_issuer: str = ""
    oidc_client_id: str = "infraasset"
    oidc_client_secret: str = ""
    oidc_audience: str = "infraasset"

    vault_addr: str = ""
    vault_token: str = ""

    demo_seed: bool = True
    demo_admin_email: str = "admin@wecrew.in"
    demo_admin_password: str = "WeCrew!admin"

    access_token_minutes: int = 480
    algorithm: str = "HS256"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def environment(self) -> Literal["development", "uat", "production", "test"]:
        value = self.app_env.lower()
        if value in {"development", "uat", "production", "test"}:
            return value  # type: ignore[return-value]
        return "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
