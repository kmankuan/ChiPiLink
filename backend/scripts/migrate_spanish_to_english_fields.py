"""
PinPanClub - Spanish to English Field Migration
Renames all Spanish field names to English in MongoDB documents.
Run once to migrate existing data.
"""
import asyncio
from core.database import db

# ============== FIELD MAPPINGS ==============

RAPIDPIN_MATCHES_FIELDS = {
    "arbitro_id": "referee_id",
    "arbitro_info": "referee_info",
    "score_ganador": "score_winner",
    "score_perdedor": "score_loser",
    "registrado_por_id": "registered_by_id",
    "confirmado_por_id": "confirmed_by_id",
    "puntos_ganador": "points_winner",
    "puntos_perdedor": "points_loser",
    "puntos_arbitro": "points_referee",
    "fecha_partido": "match_date",
    "fecha_confirmacion": "confirmation_date",
    "estado": "status",
    "notas": "notes",
}

RAPIDPIN_SEASONS_FIELDS = {
    "fecha_inicio": "start_date",
    "fecha_fin": "end_date",
    "estado": "status",
}

RAPIDPIN_RANKINGS_FIELDS = {
    "jugador_id": "player_id",
    "jugador_info": "player_info",
    "posicion": "position",
    "puntos_totales": "total_points",
    "partidos_jugados": "matches_played",
    "partidos_ganados": "matches_won",
    "partidos_perdidos": "matches_lost",
    "partidos_arbitrados": "matches_refereed",
    "puntos_como_jugador": "points_as_player",
    "puntos_como_arbitro": "points_as_referee",
}

# Queue entries (rapidpin_queue) — mostly English already, but some nested fields
RAPIDPIN_QUEUE_FIELDS = {
    "score_ganador": "score_winner",
    "score_perdedor": "score_loser",
}

# Seasons participants
SEASON_PARTICIPANTS_FIELDS = {
    "jugador_id": "player_id",
    "jugador_info": "player_info",
}

# Season rewards
SEASON_REWARDS_FIELDS = {
    "jugador_id": "player_id",
    "jugador_info": "player_info",
}

# Social - follows stats
SOCIAL_FOLLOW_STATS_FIELDS = {
    "jugador_id": "player_id",
}

# Social - activity feed
SOCIAL_ACTIVITY_FIELDS = {
    "jugador_id": "player_id",
    "jugador_info": "player_info",
}

# Achievements
ACHIEVEMENT_PLAYER_FIELDS = {
    "jugador_id": "player_id",
    "jugador_info": "player_info",
}

# Prizes awarded
PRIZES_AWARDED_FIELDS = {
    "jugador_id": "player_id",
    "jugador_info": "player_info",
}

# Also rename nested "apodo" -> "nickname" and "nombre" -> "name" inside info objects
# These are in player_a_info, player_b_info, arbitro_info/referee_info
NESTED_INFO_RENAMES = {
    "apodo": "nickname",
    "nombre": "name",
}


async def rename_fields(collection_name: str, field_map: dict):
    """Rename fields in all documents of a collection"""
    col = db[collection_name]
    count = await col.count_documents({})
    if count == 0:
        print(f"  [{collection_name}] Empty collection, skipping")
        return 0

    # Build $rename operation
    rename_ops = {}
    for old, new in field_map.items():
        # Only rename if old field exists (avoid errors)
        exists_count = await col.count_documents({old: {"$exists": True}})
        if exists_count > 0:
            rename_ops[old] = new

    if not rename_ops:
        print(f"  [{collection_name}] No Spanish fields found, skipping")
        return 0

    result = await col.update_many(
        {},
        {"$rename": rename_ops}
    )
    print(f"  [{collection_name}] Renamed {list(rename_ops.keys())} -> {list(rename_ops.values())} in {result.modified_count}/{count} docs")
    return result.modified_count


async def rename_nested_info_fields(collection_name: str, info_fields: list):
    """Rename nested fields inside info objects (e.g. apodo -> nickname)"""
    col = db[collection_name]
    count = await col.count_documents({})
    if count == 0:
        return 0

    total_modified = 0
    for info_field in info_fields:
        for old_key, new_key in NESTED_INFO_RENAMES.items():
            # Check if any doc has this nested field
            query = {f"{info_field}.{old_key}": {"$exists": True}}
            exists = await col.count_documents(query)
            if exists > 0:
                result = await col.update_many(
                    query,
                    {"$rename": {f"{info_field}.{old_key}": f"{info_field}.{new_key}"}}
                )
                if result.modified_count > 0:
                    print(f"  [{collection_name}] Renamed {info_field}.{old_key} -> {info_field}.{new_key} in {result.modified_count} docs")
                    total_modified += result.modified_count

    return total_modified


async def run_migration():
    print("=" * 60)
    print("PinPanClub: Spanish -> English Field Migration")
    print("=" * 60)

    # 1. RapidPin Matches
    print("\n[1] RapidPin Matches (pinpanclub_rapidpin_matches)")
    await rename_fields("pinpanclub_rapidpin_matches", RAPIDPIN_MATCHES_FIELDS)
    await rename_nested_info_fields("pinpanclub_rapidpin_matches", [
        "player_a_info", "player_b_info", "referee_info"
    ])

    # Also rename old "arbitro_info" nested fields for docs that had it before rename
    await rename_nested_info_fields("pinpanclub_rapidpin_matches", ["arbitro_info"])

    # 2. RapidPin Seasons
    print("\n[2] RapidPin Seasons (pinpanclub_rapidpin_seasons)")
    await rename_fields("pinpanclub_rapidpin_seasons", RAPIDPIN_SEASONS_FIELDS)

    # Also handle legacy collection name
    await rename_fields("rapidpin_seasons", RAPIDPIN_SEASONS_FIELDS)

    # 3. RapidPin Rankings
    print("\n[3] RapidPin Rankings (pinpanclub_rapidpin_rankings)")
    await rename_fields("pinpanclub_rapidpin_rankings", RAPIDPIN_RANKINGS_FIELDS)
    await rename_nested_info_fields("pinpanclub_rapidpin_rankings", ["player_info"])
    # Also rename in old jugador_info before it was renamed
    await rename_nested_info_fields("pinpanclub_rapidpin_rankings", ["jugador_info"])

    # Also handle legacy collection
    await rename_fields("rapidpin_ranking", RAPIDPIN_RANKINGS_FIELDS)
    await rename_nested_info_fields("rapidpin_ranking", ["player_info", "jugador_info"])

    # 4. RapidPin Queue
    print("\n[4] RapidPin Queue (rapidpin_queue)")
    await rename_fields("rapidpin_queue", RAPIDPIN_QUEUE_FIELDS)
    await rename_nested_info_fields("rapidpin_queue", [
        "player1_info", "player2_info", "referee_info"
    ])

    # 5. Season Participants
    print("\n[5] Season Participants (pinpanclub_season_participants)")
    await rename_fields("pinpanclub_season_participants", SEASON_PARTICIPANTS_FIELDS)

    # 6. Season Rewards
    print("\n[6] Season Rewards (pinpanclub_season_rewards)")
    await rename_fields("pinpanclub_season_rewards", SEASON_REWARDS_FIELDS)

    # 7. Social - Follow Stats
    print("\n[7] Social Follow Stats")
    await rename_fields("pinpanclub_follow_stats", SOCIAL_FOLLOW_STATS_FIELDS)

    # 8. Social - Activity Feed
    print("\n[8] Social Activity Feed")
    await rename_fields("pinpanclub_activity_feed", SOCIAL_ACTIVITY_FIELDS)
    await rename_nested_info_fields("pinpanclub_activity_feed", ["player_info", "jugador_info"])

    # 9. Player Achievements
    print("\n[9] Player Achievements")
    await rename_fields("pinpanclub_player_achievements", ACHIEVEMENT_PLAYER_FIELDS)

    # 10. Prizes Awarded
    print("\n[10] Prizes Awarded")
    await rename_fields("pinpanclub_prizes_awarded", PRIZES_AWARDED_FIELDS)

    # 11. Rebuild Hall of Fame with new field names
    print("\n[11] Clearing Hall of Fame cache (will rebuild with English fields)")
    await db["pinpanclub_hall_of_fame"].delete_many({})

    # 12. RapidPin legacy collections (rapidpin_matches, rapidpin_ranking)
    print("\n[12] Legacy RapidPin collections")
    await rename_fields("rapidpin_matches", RAPIDPIN_MATCHES_FIELDS)
    await rename_nested_info_fields("rapidpin_matches", [
        "player_a_info", "player_b_info", "referee_info", "arbitro_info"
    ])

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_migration())
