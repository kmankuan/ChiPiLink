"""
ChiPi Tutor Module — Router Registration
"""
from .routes import router
from .routes_phase2 import router as router_phase2

__all__ = ["router", "router_phase2"]
