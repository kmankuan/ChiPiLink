"""
Database configuration and connection for ChiPi Link
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'chipi_link')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def get_database():
    """Get database instance - useful for dependency injection"""
    return db


async def close_database():
    """Close database connection"""
    client.close()
