"""
Configuration settings for ChiPi Link
"""
import os
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'libros-textbook-store-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Monday.com Configuration
MONDAY_API_KEY = os.environ.get('MONDAY_API_KEY', '')
MONDAY_BOARD_ID_ENV = os.environ.get('MONDAY_BOARD_ID', '')

# CORS Configuration
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

# Frontend URL (for embed codes) - must be set in environment for production
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')


class Settings(BaseModel):
    """Application settings"""
    # Database
    mongo_url: str = os.environ.get('MONGO_URL', '')
    db_name: str = os.environ.get('DB_NAME', 'chipi_link')
    
    # JWT
    jwt_secret: str = JWT_SECRET
    jwt_algorithm: str = JWT_ALGORITHM
    jwt_expiration_hours: int = JWT_EXPIRATION_HOURS
    
    # Monday.com
    monday_api_key: str = MONDAY_API_KEY
    monday_board_id: str = MONDAY_BOARD_ID_ENV
    
    # CORS
    cors_origins: list = CORS_ORIGINS
    
    # Frontend
    frontend_url: str = FRONTEND_URL


settings = Settings()


# Helper to get Monday Board ID from DB or env
async def get_monday_board_id(db):
    """Get Monday Board ID from database or fallback to env"""
    from .constants import CoreCollections
    config = await db[CoreCollections.APP_CONFIG].find_one({"config_key": "monday_board_id"})
    if config and config.get("value"):
        return config["value"]
    return MONDAY_BOARD_ID_ENV
