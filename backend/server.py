"""
ChiPi Link - Server Bridge

This file serves as a bridge to maintain backward compatibility with supervisor.
The actual application is in main.py using modular architecture.

The old monolithic server code has been moved to server_backup.py for reference.
"""

# Re-export the app from main.py
from main import app

# Re-export commonly used items for backward compatibility
# (in case any existing routes import from server)
from core.database import db, client
from core.auth import (
    get_current_user,
    get_admin_user,
    get_optional_user,
    hash_password,
    verify_password,
    create_token
)
from core.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    JWT_EXPIRATION_HOURS,
    MONDAY_API_KEY,
    get_monday_board_id
)

# Export app as the main entry point
__all__ = ["app", "db", "client", "get_current_user", "get_admin_user"]
