"""
Demo Data Seed Script
Puebla todos los modules con datos de demostración realistas
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
import random
import uuid

from core.database import db
from core.auth import get_admin_user

router = APIRouter(prefix="/seed", tags=["Demo Data"])

# Demo Players for PinPanClub
DEMO_PLAYERS = [
    {"nombre": "Carlos Mendoza", "apodo": "El Rayo", "email": "carlos@demo.com", "nivel": "avanzado", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos"},
    {"nombre": "María González", "apodo": "La Tigresa", "email": "maria@demo.com", "nivel": "intermedio", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=maria"},
    {"nombre": "Juan Pérez", "apodo": "Speedy", "email": "juan@demo.com", "nivel": "avanzado", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=juan"},
    {"nombre": "Ana López", "apodo": "La Cobra", "email": "ana@demo.com", "nivel": "principiante", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=ana"},
    {"nombre": "Pedro Sánchez", "apodo": "Thunder", "email": "pedro@demo.com", "nivel": "intermedio", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=pedro"},
    {"nombre": "Laura Martínez", "apodo": "Flash", "email": "laura@demo.com", "nivel": "avanzado", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=laura"},
    {"nombre": "Roberto Chen", "apodo": "Dragon", "email": "roberto@demo.com", "nivel": "intermedio", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=roberto"},
    {"nombre": "Sofia Wang", "apodo": "Phoenix", "email": "sofia@demo.com", "nivel": "avanzado", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia"},
    {"nombre": "Miguel Torres", "apodo": "El Maestro", "email": "miguel@demo.com", "nivel": "profesional", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=miguel"},
    {"nombre": "Isabella Rodríguez", "apodo": "La Reina", "email": "isabella@demo.com", "nivel": "intermedio", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=isabella"},
    {"nombre": "David Kim", "apodo": "Samurai", "email": "david@demo.com", "nivel": "avanzado", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=david"},
    {"nombre": "Valentina Cruz", "apodo": "Valkyrie", "email": "valentina@demo.com", "nivel": "principiante", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=valentina"},
]

# Demo Challenges
DEMO_CHALLENGES = [
    {
        "challenge_id": "ch_win_streak",
        "name_es": "Racha Ganadora",
        "name_en": "Winning Streak",
        "description_es": "Gana 3 partidos consecutivos",
        "description_en": "Win 3 consecutive matches",
        "icon": "🔥",
        "type": "matches",
        "target_value": 3,
        "points_reward": 150,
        "difficulty": "normal"
    },
    {
        "challenge_id": "ch_rapid_master",
        "name_es": "Maestro del Rapid Pin",
        "name_en": "Rapid Pin Master",
        "description_es": "Completa 5 partidas de Rapid Pin",
        "description_en": "Complete 5 Rapid Pin matches",
        "icon": "⚡",
        "type": "rapidpin",
        "target_value": 5,
        "points_reward": 200,
        "difficulty": "normal"
    },
    {
        "challenge_id": "ch_social_butterfly",
        "name_es": "Mariposa Social",
        "name_en": "Social Butterfly",
        "description_es": "Juega contra 5 oponentes diferentes",
        "description_en": "Play against 5 different opponents",
        "icon": "🦋",
        "type": "opponents",
        "target_value": 5,
        "points_reward": 100,
        "difficulty": "easy"
    },
    {
        "challenge_id": "ch_comeback_king",
        "name_es": "Rey del Comeback",
        "name_en": "Comeback King",
        "description_es": "Gana un partido después de ir perdiendo 0-2",
        "description_en": "Win a match after being down 0-2",
        "icon": "👑",
        "type": "special",
        "target_value": 1,
        "points_reward": 300,
        "difficulty": "hard"
    },
]

# Demo Achievements
DEMO_ACHIEVEMENTS = [
    {
        "achievement_id": "ach_first_win",
        "name_es": "Primera Victoria",
        "name_en": "First Win",
        "description_es": "Gana tu primer partido",
        "description_en": "Win your first match",
        "icon": "🏆",
        "rarity": "common",
        "points": 50
    },
    {
        "achievement_id": "ach_10_wins",
        "name_es": "Decálogo",
        "name_en": "Decalogue",
        "description_es": "Acumula 10 victorias",
        "description_en": "Accumulate 10 wins",
        "icon": "🎯",
        "rarity": "rare",
        "points": 200
    },
    {
        "achievement_id": "ach_perfect_game",
        "name_es": "Juego Perfecto",
        "name_en": "Perfect Game",
        "description_es": "Gana un partido 3-0",
        "description_en": "Win a match 3-0",
        "icon": "⭐",
        "rarity": "epic",
        "points": 150
    },
    {
        "achievement_id": "ach_legend",
        "name_es": "Leyenda",
        "name_en": "Legend",
        "description_es": "Alcanza el top 3 from ranking",
        "description_en": "Reach the top 3 ranking",
        "icon": "👑",
        "rarity": "legendary",
        "points": 500
    },
]


@router.post("/demo-data")
async def seed_demo_data(admin: dict = Depends(get_admin_user)):
    """
    Puebla todos los modules con datos de demostración
    """
    results = {
        "pinpanclub": {},
        "users_wallets": {},
        "memberships": {},
        "notifications": {}
    }
    
    now = datetime.now(timezone.utc)
    
    # ============== PINPANCLUB MODULE ==============
    
    # 1. Create demo players
    player_ids = []
    for player in DEMO_PLAYERS:
        player_id = f"player_{uuid.uuid4().hex[:8]}"
        player_doc = {
            "jugador_id": player_id,
            "nombre": player["nombre"],
            "apodo": player["apodo"],
            "email": player["email"],
            "nivel": player["nivel"],
            "avatar_url": player["avatar_url"],
            "activo": True,
            "fecha_registro": (now - timedelta(days=random.randint(30, 365))).isoformat(),
            "partidos_jugados": random.randint(10, 100),
            "partidos_ganados": random.randint(5, 50),
            "racha_actual": random.randint(0, 5),
            "mejor_racha": random.randint(3, 10)
        }
        await db.pingpong_players.update_one(
            {"email": player["email"]},
            {"$set": player_doc},
            upsert=True
        )
        player_ids.append(player_id)
    
    results["pinpanclub"]["players_created"] = len(DEMO_PLAYERS)
    
    # 2. Create rankings
    points_base = 1500
    for i, player_id in enumerate(player_ids):
        points = points_base - (i * random.randint(30, 80))
        wins = random.randint(10, 50)
        losses = random.randint(5, 30)
        
        ranking_doc = {
            "jugador_id": player_id,
            "puntos": max(points, 800),
            "posicion": i + 1,
            "partidos_ganados": wins,
            "partidos_perdidos": losses,
            "activo": True,
            "liga_id": "liga_principal",
            "ultima_actualizacion": now.isoformat()
        }
        await db.pinpanclub_superpin_rankings.update_one(
            {"jugador_id": player_id},
            {"$set": ranking_doc},
            upsert=True
        )
    
    results["pinpanclub"]["rankings_created"] = len(player_ids)
    
    # 3. Create demo matches (Super Pin)
    matches_created = 0
    for _ in range(30):
        p1, p2 = random.sample(player_ids, 2)
        winner = random.choice([p1, p2])
        scores = random.choice([
            {"p1": 3, "p2": 0}, {"p1": 3, "p2": 1}, {"p1": 3, "p2": 2},
            {"p1": 0, "p2": 3}, {"p1": 1, "p2": 3}, {"p1": 2, "p2": 3}
        ])
        
        match_date = now - timedelta(days=random.randint(1, 60), hours=random.randint(0, 23))
        
        match_doc = {
            "partido_id": f"match_{uuid.uuid4().hex[:8]}",
            "jugador1_id": p1,
            "jugador2_id": p2,
            "ganador_id": winner,
            "resultado": f"{scores['p1']}-{scores['p2']}",
            "puntos_jugador1": scores['p1'],
            "puntos_jugador2": scores['p2'],
            "estado": "completado",
            "tipo": "regular",
            "liga_id": "liga_principal",
            "fecha_partido": match_date.isoformat(),
            "duracion_minutos": random.randint(15, 45)
        }
        await db.pinpanclub_superpin_matches.insert_one(match_doc)
        matches_created += 1
    
    results["pinpanclub"]["superpin_matches_created"] = matches_created
    
    # 4. Create Rapid Pin matches
    rapid_matches = 0
    for _ in range(20):
        p1, p2 = random.sample(player_ids, 2)
        p1_score = random.randint(5, 11)
        p2_score = random.randint(5, 11) if p1_score < 11 else random.randint(0, 9)
        winner = p1 if p1_score > p2_score else p2
        
        match_date = now - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23))
        
        rapid_doc = {
            "match_id": f"rapid_{uuid.uuid4().hex[:8]}",
            "player1_id": p1,
            "player2_id": p2,
            "player1_score": p1_score,
            "player2_score": p2_score,
            "winner_id": winner,
            "status": "completed",
            "started_at": (match_date - timedelta(minutes=random.randint(5, 15))).isoformat(),
            "completed_at": match_date.isoformat(),
            "duration_seconds": random.randint(180, 600)
        }
        await db.pinpanclub_rapidpin_matches.insert_one(rapid_doc)
        rapid_matches += 1
    
    results["pinpanclub"]["rapidpin_matches_created"] = rapid_matches
    
    # 5. Create challenges definitions
    for challenge in DEMO_CHALLENGES:
        challenge_doc = {
            **challenge,
            "is_active": True,
            "created_at": now.isoformat()
        }
        await db.pinpanclub_challenges_definitions.update_one(
            {"challenge_id": challenge["challenge_id"]},
            {"$set": challenge_doc},
            upsert=True
        )
    
    # 6. Create weekly challenges
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=6)
    
    for challenge in DEMO_CHALLENGES[:3]:
        weekly_doc = {
            "weekly_id": f"weekly_{uuid.uuid4().hex[:8]}",
            "challenge_id": challenge["challenge_id"],
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "is_active": True
        }
        await db.pinpanclub_challenges_weekly.update_one(
            {"challenge_id": challenge["challenge_id"], "week_start": week_start.isoformat()},
            {"$set": weekly_doc},
            upsert=True
        )
    
    results["pinpanclub"]["challenges_created"] = len(DEMO_CHALLENGES)
    
    # 7. Create achievements
    for ach in DEMO_ACHIEVEMENTS:
        ach_doc = {
            **ach,
            "is_active": True,
            "created_at": now.isoformat()
        }
        await db.pinpanclub_achievements.update_one(
            {"achievement_id": ach["achievement_id"]},
            {"$set": ach_doc},
            upsert=True
        )
    
    # 8. Assign some achievements to players
    achievements_assigned = 0
    for player_id in player_ids[:8]:
        num_achievements = random.randint(1, 3)
        selected_achs = random.sample(DEMO_ACHIEVEMENTS, num_achievements)
        
        for ach in selected_achs:
            player_ach = {
                "jugador_id": player_id,
                "achievement_id": ach["achievement_id"],
                "unlocked_at": (now - timedelta(days=random.randint(1, 30))).isoformat()
            }
            await db.pinpanclub_player_achievements.update_one(
                {"jugador_id": player_id, "achievement_id": ach["achievement_id"]},
                {"$set": player_ach},
                upsert=True
            )
            achievements_assigned += 1
    
    results["pinpanclub"]["achievements_assigned"] = achievements_assigned
    
    # 9. Create a demo tournament
    tournament_doc = {
        "torneo_id": f"torneo_{uuid.uuid4().hex[:8]}",
        "nombre": "Torneo de Primavera 2026",
        "descripcion": "Gran torneo de temporada con premios especiales",
        "fecha_inicio": (now + timedelta(days=7)).isoformat(),
        "fecha_fin": (now + timedelta(days=14)).isoformat(),
        "estado": "inscripciones_abiertas",
        "max_participantes": 16,
        "participantes": player_ids[:8],
        "premio_1": "500 ChipiPoints + Trofeo",
        "premio_2": "250 ChipiPoints",
        "premio_3": "100 ChipiPoints",
        "created_at": now.isoformat()
    }
    await db.pinpanclub_superpin_tournaments.update_one(
        {"nombre": "Torneo de Primavera 2026"},
        {"$set": tournament_doc},
        upsert=True
    )
    
    results["pinpanclub"]["tournaments_created"] = 1
    
    # ============== USERS & WALLETS MODULE ==============
    
    # Create demo user profiles with wallets
    demo_users = [
        {"nombre": "Demo Usuario", "email": "demo@chipilink.com", "tipo": "regular"},
        {"nombre": "Demo Padre", "email": "padre@chipilink.com", "tipo": "parent"},
        {"nombre": "Demo Niño", "email": "nino@chipilink.com", "tipo": "child"},
    ]
    
    user_ids_created = []
    for user in demo_users:
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        
        # User profile
        profile = {
            "user_id": user_id,
            "email": user["email"],
            "nombre": user["nombre"],
            "tipo_usuario": user["tipo"],
            "fecha_registro": (now - timedelta(days=random.randint(30, 180))).isoformat(),
            "activo": True,
            "preferencias": {
                "idioma": "es",
                "notifications": True
            }
        }
        await db.users_profiles.update_one(
            {"email": user["email"]},
            {"$set": profile},
            upsert=True
        )
        
        # Wallet
        usd_balance = round(random.uniform(20, 200), 2)
        chipipoints = random.randint(100, 2000)
        
        wallet = {
            "wallet_id": f"wallet_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "balance_usd": usd_balance,
            "chipipoints": chipipoints,
            "total_deposited": usd_balance + random.randint(50, 300),
            "total_spent": random.randint(10, 100),
            "is_active": True,
            "created_at": (now - timedelta(days=random.randint(30, 180))).isoformat()
        }
        await db.wallet_wallets.update_one(
            {"user_id": user_id},
            {"$set": wallet},
            upsert=True
        )
        
        # Create some transactions
        for _ in range(random.randint(3, 8)):
            tx_type = random.choice(["deposit", "payment", "points_earned", "points_spent"])
            tx = {
                "transaction_id": f"tx_{uuid.uuid4().hex[:8]}",
                "wallet_id": wallet["wallet_id"],
                "user_id": user_id,
                "type": tx_type,
                "amount": round(random.uniform(5, 50), 2),
                "currency": "USD" if tx_type in ["deposit", "payment"] else "POINTS",
                "description": f"Demo transaction - {tx_type}",
                "status": "completed",
                "created_at": (now - timedelta(days=random.randint(1, 60))).isoformat()
            }
            await db.wallet_transactions.insert_one(tx)
        
        user_ids_created.append(user_id)
    
    results["users_wallets"]["users_created"] = len(demo_users)
    results["users_wallets"]["wallets_created"] = len(demo_users)
    
    # ============== MEMBERSHIPS MODULE ==============
    
    # Assign memberships to some users
    plans = await db.users_membership_plans.find({"is_active": True}).to_list(10)
    
    if plans:
        for i, user_id in enumerate(user_ids_created):
            if i < len(plans):
                plan = plans[i % len(plans)]
                
                membership = {
                    "membership_id": f"memb_{uuid.uuid4().hex[:8]}",
                    "user_id": user_id,
                    "plan_id": plan["plan_id"],
                    "status": "active",
                    "visits_used": random.randint(0, plan.get("total_visits", 5) - 1) if plan.get("total_visits") else 0,
                    "total_visits": plan.get("total_visits"),
                    "start_date": (now - timedelta(days=random.randint(5, 20))).isoformat(),
                    "end_date": (now + timedelta(days=plan.get("duration_days", 30))).isoformat(),
                    "created_at": now.isoformat()
                }
                await db.users_memberships.update_one(
                    {"user_id": user_id, "status": "active"},
                    {"$set": membership},
                    upsert=True
                )
                
                # Create visit history
                for _ in range(random.randint(2, 6)):
                    visit_date = now - timedelta(days=random.randint(1, 15))
                    duration = random.randint(30, 180)
                    
                    visit = {
                        "visit_id": f"visit_{uuid.uuid4().hex[:8]}",
                        "user_id": user_id,
                        "membership_id": membership["membership_id"],
                        "check_in_time": visit_date.isoformat(),
                        "check_out_time": (visit_date + timedelta(minutes=duration)).isoformat(),
                        "duration_minutes": duration,
                        "check_in_method": random.choice(["qr", "manual"]),
                        "visit_type": "regular" if duration > 60 else "quick"
                    }
                    await db.users_membership_visits.insert_one(visit)
        
        results["memberships"]["memberships_created"] = len(user_ids_created)
    
    # ============== NOTIFICATIONS MODULE ==============
    
    # Create sample posts
    sample_posts = [
        {
            "title": {"es": "¡Nuevo Torneo de Primavera!", "en": "New Spring Tournament!", "zh": "新春季锦标赛！"},
            "summary": {"es": "Inscripciones abiertas", "en": "Registration open", "zh": "报名开放"},
            "category_id": "cat_announcements"
        },
        {
            "title": {"es": "Mantenimiento Programado", "en": "Scheduled Maintenance", "zh": "计划维护"},
            "summary": {"es": "El club estará cerrado el domingo", "en": "Club closed on Sunday", "zh": "周日俱乐部关闭"},
            "category_id": "cat_announcements"
        },
        {
            "title": {"es": "Nuevos Premios Disponibles", "en": "New Rewards Available", "zh": "新奖励可用"},
            "summary": {"es": "Canjea tus ChipiPoints", "en": "Redeem your ChipiPoints", "zh": "兑换您的ChipiPoints"},
            "category_id": "cat_weekly_challenges"
        }
    ]
    
    for post in sample_posts:
        post_doc = {
            "post_id": f"post_{uuid.uuid4().hex[:8]}",
            "title": post["title"],
            "summary": post["summary"],
            "content_blocks": [
                {"type": "paragraph", "content": post["summary"]["es"], "id": f"block_{uuid.uuid4().hex[:6]}"}
            ],
            "category_id": post["category_id"],
            "status": "sent",
            "author_id": admin.get("user_id", "admin"),
            "views": random.randint(10, 100),
            "likes": random.randint(5, 30),
            "created_at": (now - timedelta(days=random.randint(1, 14))).isoformat(),
            "published_at": (now - timedelta(days=random.randint(1, 14))).isoformat()
        }
        await db.notifications_posts.update_one(
            {"title.es": post["title"]["es"]},
            {"$set": post_doc},
            upsert=True
        )
    
    results["notifications"]["posts_created"] = len(sample_posts)
    
    return {
        "success": True,
        "message": "Demo data seeded successfully",
        "results": results,
        "timestamp": now.isoformat()
    }


@router.delete("/demo-data")
async def clear_demo_data(admin: dict = Depends(get_admin_user)):
    """
    Elimina todos los datos de demostración
    """
    results = {}
    
    # Clear PinPanClub data
    results["players_deleted"] = (await db.pingpong_players.delete_many({"email": {"$regex": "@demo.com$"}})).deleted_count
    results["matches_deleted"] = (await db.pinpanclub_superpin_matches.delete_many({"partido_id": {"$regex": "^match_"}})).deleted_count
    results["rapid_deleted"] = (await db.pinpanclub_rapidpin_matches.delete_many({"match_id": {"$regex": "^rapid_"}})).deleted_count
    results["rankings_deleted"] = (await db.pinpanclub_superpin_rankings.delete_many({"jugador_id": {"$regex": "^player_"}})).deleted_count
    results["achievements_deleted"] = (await db.pinpanclub_player_achievements.delete_many({"jugador_id": {"$regex": "^player_"}})).deleted_count
    
    # Clear demo users
    results["users_deleted"] = (await db.users_profiles.delete_many({"email": {"$regex": "@chipilink.com$"}})).deleted_count
    results["wallets_deleted"] = (await db.wallet_wallets.delete_many({"user_id": {"$regex": "^user_"}})).deleted_count
    
    return {
        "success": True,
        "message": "Demo data cleared",
        "results": results
    }


@router.get("/demo-stats")
async def get_demo_stats():
    """
    Obtiene statistics de datos de demostración
    """
    stats = {
        "pinpanclub": {
            "players": await db.pingpong_players.count_documents({}),
            "superpin_matches": await db.pinpanclub_superpin_matches.count_documents({}),
            "rapidpin_matches": await db.pinpanclub_rapidpin_matches.count_documents({}),
            "rankings": await db.pinpanclub_superpin_rankings.count_documents({}),
            "challenges": await db.pinpanclub_challenges_definitions.count_documents({}),
            "achievements": await db.pinpanclub_achievements.count_documents({}),
            "player_achievements": await db.pinpanclub_player_achievements.count_documents({}),
            "tournaments": await db.pinpanclub_superpin_tournaments.count_documents({})
        },
        "users_wallets": {
            "profiles": await db.users_profiles.count_documents({}),
            "wallets": await db.wallet_wallets.count_documents({}),
            "transactions": await db.wallet_transactions.count_documents({})
        },
        "memberships": {
            "plans": await db.users_membership_plans.count_documents({}),
            "memberships": await db.users_memberships.count_documents({}),
            "visits": await db.users_membership_visits.count_documents({})
        },
        "notifications": {
            "categories": await db.notifications_categories.count_documents({}),
            "posts": await db.notifications_posts.count_documents({}),
            "devices": await db.notifications_devices.count_documents({})
        }
    }
    
    return {
        "success": True,
        "stats": stats
    }
