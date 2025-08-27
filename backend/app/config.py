import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Forçar carregamento do .env
load_dotenv()

class Settings(BaseSettings):
    app_name: str = "ERP Sistema"
    debug: bool = True
    environment: str = "development"
    
    # Database - PostgreSQL 
    database_url: str = os.getenv("DATABASE_URL", "postgresql://erp_user:erp_password@localhost:5432/erp_db")
    
    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Email
    smtp_host: Optional[str] = os.getenv("SMTP_HOST")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: Optional[str] = os.getenv("SMTP_USERNAME")
    smtp_password: Optional[str] = os.getenv("SMTP_PASSWORD")
    smtp_from: str = os.getenv("SMTP_FROM", "noreply@yourcompany.com")
    
    # WhatsApp Baileys
    baileys_api_url: str = "http://localhost:3001"
    baileys_api_token: Optional[str] = None
    whatsapp_enabled: bool = True
    
    # URLs
    frontend_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignorar campos extras do .env


settings = Settings()