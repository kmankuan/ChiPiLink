"""
Analytics - Enhanced API Routes
Endpoints for the unified analytics dashboard across all PinPanClub game modes
"""
from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
from core.database import db
from core.constants import PinpanClubCollections

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def calc_change(current, previous):
    if previous == 0:
        return 100 if current > 0 else 0
    return round(((current - previous) / previous) * 100)


async def count_in_range(collection, date_field, start, end, extra_filter=None):
    query = {date_field: {"$gte": start.isoformat(), "$lt": end.isoformat()}}
    if extra_filter:
        query.update(extra_filter)
    return await collection.count_documents(query)


@router.get("/dashboard")
async def get_analytics_dashboard():
    """Get full analytics dashboard data across all game modes"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    month_ago = now - timedelta(days=30)

    rp_matches = db[PinpanClubCollections.RAPIDPIN_MATCHES]
    sp_matches = db["pinpanclub_superpin_matches"]
    players_col = db[PinpanClubCollections.PLAYERS]
    arena_tournaments = db[PinpanClubCollections.ARENA_TOURNAMENTS]
    arena_matches = db[PinpanClubCollections.ARENA_MATCHES]
    ref_profiles = db[PinpanClubCollections.REFEREE_PROFILES]
    hof = db[PinpanClubCollections.HALL_OF_FAME]

    # === OVERVIEW STATS ===
    total_players = await players_col.count_documents({})
    rp_week = await count_in_range(rp_matches, "created_at", week_ago, now)
    rp_prev = await count_in_range(rp_matches, "created_at", two_weeks_ago, week_ago)
    sp_week = await count_in_range(sp_matches, "created_at", week_ago, now)
    sp_prev = await count_in_range(sp_matches, "created_at", two_weeks_ago, week_ago)

    # Arena stats
    arena_total = await arena_tournaments.count_documents({})
    arena_active = await arena_tournaments.count_documents({"status": {"$in": ["registration_open", "in_progress"]}})
    arena_completed = await arena_tournaments.count_documents({"status": "completed"})
    arena_matches_total = await arena_matches.count_documents({})
    arena_matches_week = await count_in_range(arena_matches, "created_at", week_ago, now)
    arena_matches_prev = await count_in_range(arena_matches, "created_at", two_weeks_ago, week_ago)

    # Referee stats
    total_referees = await ref_profiles.count_documents({})
    top_referee = await ref_profiles.find_one({}, {"_id": 0}, sort=[("total_points_earned", -1)])

    # Matches total this week
    total_week = rp_week + sp_week + arena_matches_week
    total_prev = rp_prev + sp_prev + arena_matches_prev

    # === WEEKLY ACTIVITY (last 7 days by game mode) ===
    weekly_activity = []
    for i in range(7):
        day_start = (now - timedelta(days=6 - i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        rp_day = await count_in_range(rp_matches, "created_at", day_start, day_end)
        sp_day = await count_in_range(sp_matches, "created_at", day_start, day_end)
        ar_day = await count_in_range(arena_matches, "created_at", day_start, day_end)
        weekly_activity.append({
            "label": day_start.strftime("%a"),
            "date": day_start.strftime("%m/%d"),
            "rapidpin": rp_day,
            "league": sp_day,
            "arena": ar_day,
            "total": rp_day + sp_day + ar_day,
        })

    # === TOP ACTIVE PLAYERS (by total matches this week) ===
    active_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago.isoformat()}}},
        {"$project": {"players": ["$player_a_id", "$player_b_id"]}},
        {"$unwind": "$players"},
        {"$group": {"_id": "$players", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_raw = await rp_matches.aggregate(active_pipeline).to_list(10)
    top_active_players = []
    for entry in top_raw:
        player = await players_col.find_one({"player_id": entry["_id"]}, {"_id": 0, "name": 1, "nickname": 1, "photo_url": 1, "elo_rating": 1})
        if player:
            top_active_players.append({
                "player_id": entry["_id"],
                "name": player.get("name"),
                "nickname": player.get("nickname"),
                "photo_url": player.get("photo_url"),
                "elo_rating": player.get("elo_rating", 1000),
                "matches_count": entry["count"]
            })

    # === ARENA TOURNAMENTS LIST ===
    recent_tournaments = await arena_tournaments.find(
        {}, {"_id": 0, "tournament_id": 1, "name": 1, "format": 1, "status": 1,
             "max_players": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)

    # Count players per tournament
    for t in recent_tournaments:
        t["player_count"] = await db[PinpanClubCollections.ARENA_MATCHES].count_documents(
            {"tournament_id": t["tournament_id"]}
        )

    # === GAME MODE DISTRIBUTION (all time) ===
    rp_total = await rp_matches.count_documents({})
    sp_total = await sp_matches.count_documents({})
    mode_distribution = {
        "rapidpin": rp_total,
        "league": sp_total,
        "arena": arena_matches_total,
        "total": rp_total + sp_total + arena_matches_total,
    }

    # === HALL OF FAME TOP 5 ===
    hof_top = await hof.find(
        {"total_points": {"$gt": 0}}, {"_id": 0}
    ).sort("total_points", -1).limit(5).to_list(5)
    for idx, entry in enumerate(hof_top, 1):
        entry["rank"] = idx

    # === MONTHLY TREND (last 4 weeks) ===
    monthly_trend = []
    for w in range(4):
        w_start = now - timedelta(weeks=4 - w)
        w_end = w_start + timedelta(weeks=1)
        rp_w = await count_in_range(rp_matches, "created_at", w_start, w_end)
        sp_w = await count_in_range(sp_matches, "created_at", w_start, w_end)
        ar_w = await count_in_range(arena_matches, "created_at", w_start, w_end)
        monthly_trend.append({
            "week": f"W{w + 1}",
            "start": w_start.strftime("%m/%d"),
            "rapidpin": rp_w,
            "league": sp_w,
            "arena": ar_w,
            "total": rp_w + sp_w + ar_w,
        })

    # === NEW PLAYERS THIS WEEK ===
    new_players = await players_col.find(
        {"created_at": {"$gte": week_ago.isoformat()}},
        {"_id": 0, "name": 1, "nickname": 1, "photo_url": 1, "player_id": 1}
    ).limit(5).to_list(5)

    return {
        # Overview
        "total_players": total_players,
        "total_matches_week": total_week,
        "matches_change": calc_change(total_week, total_prev),
        "rapidpin_matches_week": rp_week,
        "rapidpin_change": calc_change(rp_week, rp_prev),
        "league_matches_week": sp_week,
        "league_change": calc_change(sp_week, sp_prev),
        # Arena
        "arena_tournaments_total": arena_total,
        "arena_tournaments_active": arena_active,
        "arena_tournaments_completed": arena_completed,
        "arena_matches_total": arena_matches_total,
        "arena_matches_week": arena_matches_week,
        "arena_change": calc_change(arena_matches_week, arena_matches_prev),
        # Referee
        "total_referees": total_referees,
        "top_referee": {
            "name": top_referee.get("player_name", "N/A") if top_referee else "N/A",
            "matches": top_referee.get("total_matches_refereed", 0) if top_referee else 0,
            "rating": top_referee.get("avg_rating", 0) if top_referee else 0,
        },
        # Charts
        "weekly_activity": weekly_activity,
        "monthly_trend": monthly_trend,
        "mode_distribution": mode_distribution,
        # Lists
        "top_active_players": top_active_players,
        "recent_tournaments": recent_tournaments,
        "hall_of_fame_top": hof_top,
        "new_players": new_players,
    }


@router.get("/summary")
async def get_analytics_summary():
    """Quick summary for embedding in other pages"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total_players = await db[PinpanClubCollections.PLAYERS].count_documents({})
    rp_week = await db[PinpanClubCollections.RAPIDPIN_MATCHES].count_documents(
        {"created_at": {"$gte": week_ago.isoformat()}}
    )
    arena_active = await db[PinpanClubCollections.ARENA_TOURNAMENTS].count_documents(
        {"status": {"$in": ["registration_open", "in_progress"]}}
    )

    return {
        "total_players": total_players,
        "matches_this_week": rp_week,
        "active_tournaments": arena_active,
    }
