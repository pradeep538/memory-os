from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    environment: str = "development"
    
    # Database
    database_url: str = "postgresql://localhost:5432/memory_os"
    
    # API Keys (if needed for integrations)
    backend_api_url: str = "http://localhost:3000"
    
    # Firebase (optional for auth)
    firebase_service_account_path: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
