"""
ChiPi Tutor Module — Router Registration
"""
from .routes import router
from .routes_phase2 import router as router_phase2
from .routes_parent import router as router_parent
from .school_feed_config import router as router_school_config
from .monday_board_setup import router as router_monday_setup
from .school_feed_ingest import router as router_ingest

__all__ = ["router", "router_phase2", "router_parent", "router_school_config", "router_monday_setup", "router_ingest"]
