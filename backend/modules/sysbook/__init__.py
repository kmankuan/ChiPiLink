"""
Sysbook Module — School Textbook Management System
Dedicated backend for textbook inventory, students, schools, and related operations.
Separated from the general store (Unatienda) module.
"""
from .routes import router as sysbook_router

__all__ = ["sysbook_router"]
