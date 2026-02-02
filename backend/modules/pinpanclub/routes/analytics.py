"""
Analytics - API Routes
Endpoints for analytics dashboard
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def get_analytics_dashboard():
    """Get analytics dashboard data"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    
    # Total active players (players with matches in the last week)
    active_players = await db.pingpong_players.count_documents({})
    
    # Matches this week (Super Pin)
    superpin_matches = await db.pinpanclub_superpin_matches.count_documents({
        "created_at": {"$gte": week_ago.isoformat()}
    })
    
    # Matches last week for comparison
    superpin_last_week = await db.pinpanclub_superpin_matches.count_documents({
        "created_at": {"$gte": two_weeks_ago.isoformat(), "$lt": week_ago.isoformat()}
    })
    
    # Rapid Pin matches this week
    rapidpin_matches = await db.pinpanclub_rapidpin_matches.count_documents({
        "created_at": {"$gte": week_ago.isoformat()}
    })
    
    rapidpin_last_week = await db.pinpanclub_rapidpin_matches.count_documents({
        "created_at": {"$gte": two_weeks_ago.isoformat(), "$lt": week_ago.isoformat()}
    })
    
    # Challenges completed this week
    challenges_completed = await db.pinpanclub_challenges_progress.count_documents({
        "status": "completed",
        "completed_at": {"$gte": week_ago.isoformat()}
    })
    
    challenges_last_week = await db.pinpanclub_challenges_progress.count_documents({
        "status": "completed",
        "completed_at": {"$gte": two_weeks_ago.isoformat(), "$lt": week_ago.isoformat()}
    })
    
    # Calculate changes
    def calc_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100)
    
    matches_change = calc_change(superpin_matches + rapidpin_matches, superpin_last_week + rapidpin_last_week)
    rapidpin_change = calc_change(rapidpin_matches, rapidpin_last_week)
    challenges_change = calc_change(challenges_completed, challenges_last_week)
    
    # Weekly activity (matches per day)
    weekly_activity = []
    for i in range(7):
        day_start = now - timedelta(days=6-i)
        day_end = day_start + timedelta(days=1)
        day_matches = await db.pinpanclub_rapidpin_matches.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        day_superpin = await db.pinpanclub_superpin_matches.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        weekly_activity.append({
            "label": day_start.strftime("%a"),
            "value": day_matches + day_superpin
        })
    
    # Top active players (by matches played)
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago.isoformat()}}},
        {"$group": {
            "_id": "$jugador_a_id",
            "matches_count": {"$sum": 1}
        }},
        {"$sort": {"matches_count": -1}},
        {"$limit": 10}
    ]
    
    top_players_cursor = db.pinpanclub_rapidpin_matches.aggregate(pipeline)
    top_players_raw = await top_players_cursor.to_list(length=10)
    
    # Enrich with player info
    top_active_players = []
    for entry in top_players_raw:
        player = await db.pingpong_players.find_one({"jugador_id": entry["_id"]}, {"_id": 0})
        if player:
            top_active_players.append({
                "jugador_id": entry["_id"],
                "nombre": player.get("nombre"),
                "apodo": player.get("apodo"),
                "matches_count": entry["matches_count"]
            })
    
    # Recent achievements (badges)
    recent_badges = await db.pinpanclub_superpin_badges.find(
        {},
        {"_id": 0}
    ).sort("earned_at", -1).limit(10).to_list(length=10)
    
    recent_achievements = []
    for badge in recent_badges:
        player = await db.pingpong_players.find_one({"jugador_id": badge.get("jugador_id")}, {"_id": 0})
        recent_achievements.append({
            "name": badge.get("name"),
            "icon": badge.get("icon"),
            "player_name": player.get("apodo") or player.get("nombre") if player else "Unknown"
        })
    
    # Challenge leaderboard
    challenge_lb = await db.pinpanclub_challenges_leaderboard.find(
        {},
        {"_id": 0}
    ).sort("total_points", -1).limit(10).to_list(length=10)
    
    for entry in challenge_lb:
        player = await db.pingpong_players.find_one({"jugador_id": entry.get("jugador_id")}, {"_id": 0})
        entry["jugador_info"] = {
            "nombre": player.get("nombre") if player else "?",
            "apodo": player.get("apodo") if player else None
        }
    
    # Popular challenges
    popular_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": "$challenge_id",
            "completions": {"$sum": 1}
        }},
        {"$sort": {"completions": -1}},
        {"$limit": 5}
    ]
    
    popular_cursor = db.pinpanclub_challenges_progress.aggregate(popular_pipeline)
    popular_raw = await popular_cursor.to_list(length=5)
    
    popular_challenges = []
    for item in popular_raw:
        challenge = await db.pinpanclub_challenges_definitions.find_one(
            {"challenge_id": item["_id"]},
            {"_id": 0}
        )
        if challenge:
            popular_challenges.append({
                "name": challenge.get("name"),
                "icon": challenge.get("icon"),
                "points_reward": challenge.get("points_reward"),
                "completions": item["completions"]
            })
    
    # Daily matches (for chart)
    daily_matches = []
    for i in range(7):
        day_start = now - timedelta(days=6-i)
        day_end = day_start + timedelta(days=1)
        count = await db.pinpanclub_rapidpin_matches.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        daily_matches.append({
            "day": day_start.weekday(),
            "count": count
        })
    
    # New players this week
    new_players = await db.pingpong_players.find(
        {"created_at": {"$gte": week_ago.isoformat()}},
        {"_id": 0, "nombre": 1, "apodo": 1}
    ).limit(5).to_list(length=5)
    
    # Activity ranking
    activity_ranking = []
    all_players = await db.pingpong_players.find({}, {"_id": 0}).limit(20).to_list(length=20)
    for player in all_players:
        matches_week = await db.pinpanclub_rapidpin_matches.count_documents({
            "$or": [
                {"jugador_a_id": player.get("jugador_id")},
                {"jugador_b_id": player.get("jugador_id")}
            ],
            "created_at": {"$gte": week_ago.isoformat()}
        })
        activity_ranking.append({
            "jugador_id": player.get("jugador_id"),
            "nombre": player.get("nombre"),
            "apodo": player.get("apodo"),
            "elo_rating": player.get("elo_rating", 1000),
            "matches_this_week": matches_week
        })
    
    activity_ranking.sort(key=lambda x: x["matches_this_week"], reverse=True)
    
    return {
        "total_active_players": active_players,
        "players_change": 0,  # Would need historical data
        "matches_this_week": superpin_matches + rapidpin_matches,
        "matches_change": matches_change,
        "superpin_matches": superpin_matches,
        "rapid_pin_matches": rapidpin_matches,
        "rapidpin_change": rapidpin_change,
        "challenges_completed": challenges_completed,
        "challenges_change": challenges_change,
        "weekly_activity": weekly_activity,
        "top_active_players": top_active_players,
        "recent_achievements": recent_achievements,
        "challenge_leaderboard": challenge_lb,
        "popular_challenges": popular_challenges,
        "daily_matches": daily_matches,
        "new_players": new_players,
        "activity_ranking": activity_ranking[:10]
    }


@router.get("/summary")
async def get_analytics_summary():
    """Get analytics summary for the main dashboard"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    # Quick stats
    active_players = await db.pingpong_players.count_documents({})
    
    rapidpin_matches = await db.pinpanclub_rapidpin_matches.count_documents({
        "created_at": {"$gte": week_ago.isoformat()}
    })
    
    challenges_completed = await db.pinpanclub_challenges_progress.count_documents({
        "status": "completed",
        "completed_at": {"$gte": week_ago.isoformat()}
    })
    
    # Top 3 players
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago.isoformat()}}},
        {"$group": {
            "_id": "$jugador_a_id",
            "matches_count": {"$sum": 1}
        }},
        {"$sort": {"matches_count": -1}},
        {"$limit": 3}
    ]
    
    top_cursor = db.pinpanclub_rapidpin_matches.aggregate(pipeline)
    top_raw = await top_cursor.to_list(length=3)
    
    top_players = []
    for entry in top_raw:
        player = await db.pingpong_players.find_one({"jugador_id": entry["_id"]}, {"_id": 0})
        if player:
            top_players.append({
                "nombre": player.get("apodo") or player.get("nombre"),
                "matches": entry["matches_count"]
            })
    
    return {
        "active_players": active_players,
        "matches_this_week": rapidpin_matches,
        "challenges_completed": challenges_completed,
        "top_players": top_players
    }
