"""
PinpanClub - Main Router
Aggregates all module routers
"""
from fastapi import APIRouter

from .players import router as players_router
from .matches import router as matches_router
from .monday import router as monday_router
from .sponsors import router as sponsors_router
from .canvas import router as canvas_router
from .websocket import ws_router
from .superpin import router as superpin_router
from .rapidpin import router as rapidpin_router
from .social import router as social_router
from .challenges import router as challenges_router
from .prizes import router as prizes_router
from .achievements import router as achievements_router
from .analytics import router as analytics_router
from .rank_rewards import router as rank_rewards_router
from .seasons import router as seasons_router
from .public_feed import router as public_feed_router

# Main module router
router = APIRouter(prefix="/pinpanclub", tags=["PinpanClub"])

# Include sub-routers
router.include_router(players_router)
router.include_router(matches_router)
router.include_router(monday_router)
router.include_router(sponsors_router)
router.include_router(canvas_router)
router.include_router(ws_router)
router.include_router(superpin_router)
router.include_router(rapidpin_router)
router.include_router(social_router)
router.include_router(challenges_router)
router.include_router(prizes_router)
router.include_router(achievements_router)
router.include_router(analytics_router)
router.include_router(rank_rewards_router)
router.include_router(seasons_router)
router.include_router(public_feed_router)

# Re-export for backwards compatibility with old routes
pinpanclub_router = router
