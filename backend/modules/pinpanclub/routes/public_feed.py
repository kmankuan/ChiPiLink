"""
PinPanClub Public Activity Feed API
Endpoints publics para mostrar actividades del club sin authentication
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["PinPanClub - Public Feed"])


@router.get("/activity-feed")
async def get_public_activity_feed(
    lang: str = Query("es", description="Language code: es, en, zh"),
    include_matches: bool = True,
    include_leaderboard: bool = True,
    include_challenges: bool = True,
    include_achievements: bool = True,
    include_stats: bool = True,
    include_tournaments: bool = True,
    matches_limit: int = Query(5, ge=1, le=20),
    leaderboard_limit: int = Query(10, ge=1, le=50),
    challenges_limit: int = Query(4, ge=1, le=10),
    achievements_limit: int = Query(6, ge=1, le=20),
    tournaments_limit: int = Query(3, ge=1, le=10)
):
    """
    Get public activity feed for PinPanClub
    This endpoint is accessible without authentication
    """
    result = {
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lang": lang
    }
    
    try:
        # Recent Matches (Super Pin + Rapid Pin)
        if include_matches:
            matches = []
            
            # Super Pin matches
            superpin_matches = await db.pinpanclub_superpin_matches.find(
                {"estado": "completado"},
                {"_id": 0, "partido_id": 1, "jugador1_id": 1, "jugador2_id": 1, 
                 "winner_id": 1, "resultado": 1, "fecha_partido": 1, "liga_id": 1}
            ).sort("fecha_partido", -1).limit(matches_limit).to_list(matches_limit)
            
            # Enrich with player names
            for match in superpin_matches:
                p1 = await db.pingpong_players.find_one(
                    {"jugador_id": match.get("jugador1_id")},
                    {"_id": 0, "name": 1, "apodo": 1, "avatar_url": 1}
                )
                p2 = await db.pingpong_players.find_one(
                    {"jugador_id": match.get("jugador2_id")},
                    {"_id": 0, "name": 1, "apodo": 1, "avatar_url": 1}
                )
                matches.append({
                    "match_id": match.get("partido_id"),
                    "type": "superpin",
                    "player1": {
                        "id": match.get("jugador1_id"),
                        "name": p1.get("name") if p1 else "Jugador 1",
                        "nickname": p1.get("apodo") if p1 else None,
                        "avatar": p1.get("avatar_url") if p1 else None
                    },
                    "player2": {
                        "id": match.get("jugador2_id"),
                        "name": p2.get("name") if p2 else "Jugador 2",
                        "nickname": p2.get("apodo") if p2 else None,
                        "avatar": p2.get("avatar_url") if p2 else None
                    },
                    "winner_id": match.get("winner_id"),
                    "result": match.get("resultado"),
                    "date": match.get("fecha_partido")
                })
            
            # Rapid Pin matches
            rapidpin_matches = await db.pinpanclub_rapidpin_matches.find(
                {"status": "completed"},
                {"_id": 0}
            ).sort("completed_at", -1).limit(matches_limit).to_list(matches_limit)
            
            for match in rapidpin_matches:
                p1 = await db.pingpong_players.find_one(
                    {"jugador_id": match.get("player1_id")},
                    {"_id": 0, "name": 1, "apodo": 1, "avatar_url": 1}
                )
                p2 = await db.pingpong_players.find_one(
                    {"jugador_id": match.get("player2_id")},
                    {"_id": 0, "name": 1, "apodo": 1, "avatar_url": 1}
                )
                matches.append({
                    "match_id": match.get("match_id"),
                    "type": "rapidpin",
                    "player1": {
                        "id": match.get("player1_id"),
                        "name": p1.get("name") if p1 else "Jugador 1",
                        "nickname": p1.get("apodo") if p1 else None,
                        "avatar": p1.get("avatar_url") if p1 else None
                    },
                    "player2": {
                        "id": match.get("player2_id"),
                        "name": p2.get("name") if p2 else "Jugador 2",
                        "nickname": p2.get("apodo") if p2 else None,
                        "avatar": p2.get("avatar_url") if p2 else None
                    },
                    "winner_id": match.get("winner_id"),
                    "result": f"{match.get('player1_score', 0)}-{match.get('player2_score', 0)}",
                    "date": match.get("completed_at")
                })
            
            # Sort combined and limit
            matches.sort(key=lambda x: x.get("date", ""), reverse=True)
            result["recent_matches"] = matches[:matches_limit]
        
        # Leaderboard
        if include_leaderboard:
            # Get from Super Pin rankings
            rankings = await db.pinpanclub_superpin_rankings.find(
                {"active": True},
                {"_id": 0, "jugador_id": 1, "puntos": 1, "posicion": 1, 
                 "partidos_ganados": 1, "partidos_perdidos": 1}
            ).sort("puntos", -1).limit(leaderboard_limit).to_list(leaderboard_limit)
            
            leaderboard = []
            for i, rank in enumerate(rankings):
                player = await db.pingpong_players.find_one(
                    {"jugador_id": rank.get("jugador_id")},
                    {"_id": 0, "name": 1, "apodo": 1, "avatar_url": 1}
                )
                leaderboard.append({
                    "position": i + 1,
                    "player_id": rank.get("jugador_id"),
                    "name": player.get("name") if player else "Jugador",
                    "nickname": player.get("apodo") if player else None,
                    "avatar": player.get("avatar_url") if player else None,
                    "points": rank.get("puntos", 0),
                    "wins": rank.get("partidos_ganados", 0),
                    "losses": rank.get("partidos_perdidos", 0)
                })
            
            result["leaderboard"] = leaderboard
        
        # Active Challenges
        if include_challenges:
            # Get current week's challenges
            now = datetime.now(timezone.utc)
            start_of_week = now - timedelta(days=now.weekday())
            
            challenges = await db.pinpanclub_challenges_weekly.find(
                {
                    "week_start": {"$lte": now.isoformat()},
                    "week_end": {"$gte": now.isoformat()}
                },
                {"_id": 0}
            ).limit(challenges_limit).to_list(challenges_limit)
            
            # Enrich with definitions
            enriched_challenges = []
            for ch in challenges:
                definition = await db.pinpanclub_challenges_definitions.find_one(
                    {"challenge_id": ch.get("challenge_id")},
                    {"_id": 0}
                )
                if definition:
                    name_key = f"name_{lang}" if f"name_{lang}" in definition else "name_es"
                    desc_key = f"description_{lang}" if f"description_{lang}" in definition else "description_es"
                    enriched_challenges.append({
                        "challenge_id": ch.get("challenge_id"),
                        "name": definition.get(name_key, definition.get("name_es", "Reto")),
                        "description": definition.get(desc_key, ""),
                        "icon": definition.get("icon", "🎯"),
                        "difficulty": definition.get("difficulty", "normal"),
                        "points": definition.get("points_reward", 0),
                        "type": definition.get("type", "general")
                    })
            
            result["active_challenges"] = enriched_challenges
        
        # Recent Achievements
        if include_achievements:
            recent_time = datetime.now(timezone.utc) - timedelta(days=7)
            
            player_achievements = await db.pinpanclub_player_achievements.find(
                {"unlocked_at": {"$gte": recent_time.isoformat()}},
                {"_id": 0}
            ).sort("unlocked_at", -1).limit(achievements_limit).to_list(achievements_limit)
            
            achievements = []
            for pa in player_achievements:
                # Get achievement details
                achievement = await db.pinpanclub_achievements.find_one(
                    {"achievement_id": pa.get("achievement_id")},
                    {"_id": 0}
                )
                # Get player details
                player = await db.pingpong_players.find_one(
                    {"jugador_id": pa.get("jugador_id")},
                    {"_id": 0, "name": 1, "apodo": 1, "avatar_url": 1}
                )
                
                if achievement and player:
                    name_key = f"name_{lang}" if f"name_{lang}" in achievement else "name_es"
                    achievements.append({
                        "achievement_id": pa.get("achievement_id"),
                        "name": achievement.get(name_key, achievement.get("name_es", "Logro")),
                        "icon": achievement.get("icon", "🏆"),
                        "rarity": achievement.get("rarity", "common"),
                        "player": {
                            "id": pa.get("jugador_id"),
                            "name": player.get("name"),
                            "nickname": player.get("apodo"),
                            "avatar": player.get("avatar_url")
                        },
                        "unlocked_at": pa.get("unlocked_at")
                    })
            
            result["recent_achievements"] = achievements
        
        # Stats
        if include_stats:
            # Count active players (with matches in last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            active_count = await db.pinpanclub_superpin_rankings.count_documents({"active": True})
            total_matches = await db.pinpanclub_superpin_matches.count_documents({"estado": "completado"})
            rapidpin_matches = await db.pinpanclub_rapidpin_matches.count_documents({"status": "completed"})
            
            result["stats"] = {
                "active_players": active_count,
                "total_superpin_matches": total_matches,
                "total_rapidpin_matches": rapidpin_matches,
                "total_matches": total_matches + rapidpin_matches
            }
        
        # Upcoming Tournaments
        if include_tournaments:
            now = datetime.now(timezone.utc)
            
            tournaments = await db.pinpanclub_superpin_tournaments.find(
                {
                    "$or": [
                        {"estado": "programado"},
                        {"estado": "inscripciones_abiertas"},
                        {"estado": "en_progreso"}
                    ]
                },
                {"_id": 0, "torneo_id": 1, "name": 1, "fecha_inicio": 1, 
                 "fecha_fin": 1, "estado": 1, "max_participantes": 1, "participantes": 1}
            ).sort("fecha_inicio", 1).limit(tournaments_limit).to_list(tournaments_limit)
            
            result["upcoming_tournaments"] = [
                {
                    "tournament_id": t.get("torneo_id"),
                    "name": t.get("name"),
                    "start_date": t.get("fecha_inicio"),
                    "end_date": t.get("fecha_fin"),
                    "status": t.get("estado"),
                    "max_participants": t.get("max_participantes", 0),
                    "current_participants": len(t.get("participantes", []))
                }
                for t in tournaments
            ]
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching public activity feed: {e}")
        return {
            "success": False,
            "error": str(e),
            "recent_matches": [],
            "leaderboard": [],
            "active_challenges": [],
            "recent_achievements": [],
            "stats": {},
            "upcoming_tournaments": []
        }


@router.get("/stats-summary")
async def get_public_stats_summary():
    """Get quick stats summary for display"""
    try:
        active_players = await db.pinpanclub_superpin_rankings.count_documents({"active": True})
        total_matches = await db.pinpanclub_superpin_matches.count_documents({"estado": "completado"})
        rapidpin_matches = await db.pinpanclub_rapidpin_matches.count_documents({"status": "completed"})
        
        # This week's activity
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())
        
        this_week_matches = await db.pinpanclub_superpin_matches.count_documents({
            "estado": "completado",
            "fecha_partido": {"$gte": week_start.isoformat()}
        })
        
        return {
            "success": True,
            "stats": {
                "active_players": active_players,
                "total_matches": total_matches + rapidpin_matches,
                "superpin_matches": total_matches,
                "rapidpin_matches": rapidpin_matches,
                "this_week_matches": this_week_matches
            }
        }
    except Exception as e:
        logger.error(f"Error fetching stats summary: {e}")
        return {"success": False, "stats": {}}
