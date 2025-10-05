"""
Configuration management for the application
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    app_name: str = "Budget Buddy API"
    debug: bool = True

    # Google API
    google_api_key: str
    google_sheets_credentials_path: str = "cred/gen-lang-client-0229471649-dff2869d47fc.json"
    google_sheet_name: str = "Receipts"

    # Gemini Configuration
    gemini_model_id: str = "gemini-2.0-flash"

    # Supabase
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    supabase_anon_key: Optional[str] = None

    # CORS
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]

    # Upload Configuration
    upload_dir: str = "uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
