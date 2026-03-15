"""
Sport Module — Technique Analytics
Analyzes tagged points to generate player weakness/strength reports.
"""
import logging
from typing import Dict, List
from core.database import db
from collections import defaultdict

logger = logging.getLogger("sport.analytics")

C_MATCHES = "sport_matches"
C_LIVE = "sport_live_sessions"
C_PLAYERS = "sport_players"


async def get_player_technique_report(player_id: str) -> Dict:
    """
    Analyze all tagged points for a player and generate a technique report.
    Returns: points won/lost by technique, strengths, weaknesses, recommendations.
    """
    # Gather all live sessions this player participated in
    sessions = await db[C_LIVE].find(
        {"$or": [{"player_a.player_id": player_id}, {"player_b.player_id": player_id}]},
        {"_id": 0, "player_a": 1, "player_b": 1, "all_points": 1, "points": 1}
    ).to_list(100)

    won_by_technique = defaultdict(int)
    lost_by_technique = defaultdict(int)
    total_points_won = 0
    total_points_lost = 0
    serve_aces = 0
    total_serves = 0

    for session in sessions:
        is_a = session.get("player_a", {}).get("player_id") == player_id
        my_side = "a" if is_a else "b"
        opp_side = "b" if is_a else "a"

        points = session.get("all_points") or session.get("points") or []
        for pt in points:
            technique = pt.get("technique")
            if not technique:
                continue

            if pt["scored_by"] == my_side:
                # I scored this point
                total_points_won += 1
                won_by_technique[technique] += 1
                if technique == "serve_ace":
                    serve_aces += 1
            else:
                # Opponent scored on me
                total_points_lost += 1
                lost_by_technique[technique] += 1

            # Track serves
            if pt.get("server") == my_side:
                total_serves += 1

    # Calculate percentages
    total = total_points_won + total_points_lost
    if total == 0:
        return {
            "player_id": player_id,
            "total_analyzed_points": 0,
            "message": "No technique-tagged points found. Referee needs to enable technique tagging during matches.",
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
        }

    # Strengths: techniques I win most with
    strengths = []
    for tech, count in sorted(won_by_technique.items(), key=lambda x: -x[1]):
        pct = round(count / max(total_points_won, 1) * 100)
        strengths.append({"technique": tech, "points_won": count, "percentage": pct})

    # Weaknesses: techniques opponent uses to beat me most
    weaknesses = []
    for tech, count in sorted(lost_by_technique.items(), key=lambda x: -x[1]):
        pct = round(count / max(total_points_lost, 1) * 100)
        weaknesses.append({"technique": tech, "points_lost": count, "percentage": pct})

    # Generate recommendations
    recommendations = []
    if weaknesses:
        top_weakness = weaknesses[0]
        tech_tips = {
            "forehand": "Practice forehand blocking and counter-attack drills",
            "backhand": "Focus on backhand topspin and footwork for backhand defense",
            "smash": "Train soft block returns against smashes, position further from table",
            "serve_ace": "Study opponent's serve patterns, practice return of serve drills",
            "drop_shot": "Improve footwork speed, stay closer to the table",
            "lob": "Practice overhead smash returns against lobs",
            "error": "Focus on consistency drills, reduce unforced errors",
            "block": "Develop more aggressive attack to prevent opponent from blocking",
            "net": "Adjust topspin angle to clear the net with more margin",
        }
        tip = tech_tips.get(top_weakness["technique"], f"Work on defending against {top_weakness['technique']}")
        recommendations.append({"area": top_weakness["technique"], "tip": tip, "urgency": "high"})

    if strengths:
        top_strength = strengths[0]
        recommendations.append({
            "area": top_strength["technique"],
            "tip": f"Your {top_strength['technique']} is your strongest weapon ({top_strength['percentage']}%). Keep developing it.",
            "urgency": "maintain"
        })

    # Serve analysis
    serve_accuracy = round(serve_aces / max(total_serves, 1) * 100) if total_serves > 0 else 0

    return {
        "player_id": player_id,
        "total_analyzed_points": total,
        "points_won": total_points_won,
        "points_lost": total_points_lost,
        "win_rate_tagged": round(total_points_won / max(total, 1) * 100),
        "serve_accuracy": serve_accuracy,
        "serve_aces": serve_aces,
        "total_serves": total_serves,
        "strengths": strengths[:5],
        "weaknesses": weaknesses[:5],
        "won_by_technique": dict(won_by_technique),
        "lost_by_technique": dict(lost_by_technique),
        "recommendations": recommendations,
    }
