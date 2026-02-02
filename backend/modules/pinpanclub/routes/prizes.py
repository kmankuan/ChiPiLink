"""
Prizes - API Routes
System for premios avanzado
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.prizes import (
    PrizeDefinition, PrizeDefinitionCreate,
    AwardedPrize,
    PrizeCatalog,
    PrizeType, PrizeStatus
)
from ..services.prizes_service import prize_service

router = APIRouter(prefix="/prizes", tags=["Prizes"])


# ============== PRIZE DEFINITIONS ==============

@router.get("/definitions", response_model=List[PrizeDefinition])
async def get_all_prizes():
    """Get todos prizes"""
    return await prize_service.get_all_prizes()


@router.get("/definitions/{prize_id}", response_model=PrizeDefinition)
async def get_prize(prize_id: str):
    """Get definición de a prize"""
    prize = await prize_service.get_prize(prize_id)
    if not prize:
        raise HTTPException(status_code=404, detail="Premio not found")
    return prize


@router.post("/definitions", response_model=PrizeDefinition)
async def create_prize(
    data: PrizeDefinitionCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a prize (solo admin)"""
    return await prize_service.create_prize(data)


@router.put("/definitions/{prize_id}", response_model=PrizeDefinition)
async def update_prize(
    prize_id: str,
    data: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update a prize (solo admin)"""
    prize = await prize_service.update_prize(prize_id, data)
    if not prize:
        raise HTTPException(status_code=404, detail="Premio not found")
    return prize


@router.get("/definitions/type/{prize_type}")
async def get_prizes_by_type(prize_type: PrizeType):
    """Get premios by type"""
    prizes = await prize_service.get_prizes_by_type(prize_type)
    return {"type": prize_type, "prizes": prizes}


# ============== PRIZE CATALOG ==============

@router.get("/catalog")
async def get_prize_catalog():
    """Get catalog of prizes"""
    catalog = await prize_service.get_or_create_default_catalog()
    return catalog


@router.get("/catalog/season/{season_id}")
async def get_season_catalog(season_id: str):
    """Get catalog de a season"""
    catalog = await prize_service.get_season_catalog(season_id)
    if not catalog:
        # Returnsr catalog by default
        catalog = await prize_service.get_or_create_default_catalog()
    return catalog


# ============== AWARD PRIZES ==============

@router.post("/award")
async def award_prize(
    prize_id: str,
    jugador_id: str,
    awarded_for: str,
    position: Optional[int] = None,
    season_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Otorgar premio a a player (solo admin)"""
    try:
        award = await prize_service.award_prize(
            prize_id=prize_id,
            jugador_id=jugador_id,
            awarded_for=awarded_for,
            position=position,
            season_id=season_id
        )
        return award
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/award/season/{season_id}")
async def award_season_prizes(
    season_id: str,
    player_rankings: List[dict],
    referee_rankings: Optional[List[dict]] = None,
    admin: dict = Depends(get_admin_user)
):
    """Otorgar premios de temporada automaticmente (solo admin)"""
    awarded = await prize_service.award_season_prizes(
        season_id,
        player_rankings,
        referee_rankings
    )
    return {"season_id": season_id, "awarded": awarded, "total": len(awarded)}


# ============== PLAYER PRIZES ==============

@router.get("/player/{jugador_id}")
async def get_player_prizes(
    jugador_id: str,
    status: Optional[str] = None
):
    """Get premios de a player"""
    prizes = await prize_service.get_player_prizes(jugador_id, status)
    return {"jugador_id": jugador_id, "prizes": prizes, "total": len(prizes)}


@router.get("/season/{season_id}")
async def get_season_prizes(season_id: str):
    """Get premios otorgados en a season"""
    prizes = await prize_service.get_season_awarded_prizes(season_id)
    return {"season_id": season_id, "prizes": prizes, "total": len(prizes)}


@router.post("/award/{award_id}/status")
async def update_prize_status(
    award_id: str,
    status: PrizeStatus,
    admin: dict = Depends(get_admin_user)
):
    """Update estado de a prize otorgado (solo admin)"""
    success = await prize_service.update_prize_status(award_id, status)
    return {"success": success, "new_status": status}


@router.post("/award/{award_id}/deliver")
async def mark_prize_delivered(
    award_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Marcar premio como entregado (solo admin)"""
    success = await prize_service.mark_prize_delivered(award_id)
    return {"success": success}
