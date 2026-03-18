"""
ChiPi Tutor Module — Router Registration
"""
from .routes import router
from .routes_phase2 import router as router_phase2
from .routes_parent import router as router_parent

__all__ = ["router", "router_phase2", "router_parent"]
