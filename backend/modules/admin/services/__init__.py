"""
Admin Services Layer
Business logic extracted from routes for cleaner separation of concerns.
"""
from .module_status_service import module_status_service
from .ui_style_service import ui_style_service
from .dashboard_service import dashboard_service

__all__ = ["module_status_service", "ui_style_service", "dashboard_service"]
