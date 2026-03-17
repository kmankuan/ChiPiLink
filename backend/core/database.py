from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
sport_players = db.sport_players
sport_matches = db.sport_matches
sport_leagues = db.sport_leagues
sport_tournaments = db.sport_tournaments
sport_live_sessions = db.sport_live_sessions
sport_settings = db.sport_settings

async def close_db_connection():
    """Close database connection"""
    client.close()
