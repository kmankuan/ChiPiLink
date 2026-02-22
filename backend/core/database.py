"""
Database configuration and connection for ChiPi Link
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import bcrypt
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'chipi_link')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Import collection constants after db is defined
from .constants import (
    AuthCollections, StoreCollections, PinpanClubCollections,
    CommunityCollections, CoreCollections
)


def get_database():
    """Get database instance - useful for dependency injection"""
    return db


async def close_database():
    """Close database connection"""
    client.close()


async def seed_admin_user():
    """
    Ensure an admin user exists with valid credentials.
    Always force-sets password_hash and is_admin to guarantee login works.
    """
    import logging
    logger = logging.getLogger("seed")
    admin_email = os.environ.get('ADMIN_EMAIL', 'teck@koh.one')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Acdb##0897')

    try:
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        existing = await db[AuthCollections.USERS].find_one({"email": admin_email})

        if not existing:
            admin_doc = {
                "user_id": f"admin_{uuid.uuid4().hex[:8]}",
                "name": "Administrador",
                "last_name": "ChiPi Link",
                "email": admin_email,
                "phone": "",
                "password_hash": hashed_password,
                "is_admin": True,
                "students": [],
                "address": {},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db[AuthCollections.USERS].insert_one(admin_doc)
            logger.info(f"Admin user CREATED: {admin_email}")
        else:
            # Always force-update password_hash and is_admin to guarantee login works
            await db[AuthCollections.USERS].update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hashed_password, "is_admin": True}}
            )
            logger.info(f"Admin user ENSURED: {admin_email} (password_hash + is_admin forced)")

    except Exception as e:
        logger.error(f"SEED ADMIN FAILED: {e}", exc_info=True)


async def seed_site_config():
    """
    Create default site configuration if it doesn't exist.
    """
    try:
        existing_config = await db[CoreCollections.SITE_CONFIG].find_one({"config_id": "main"})
        
        if not existing_config:
            config_doc = {
                "config_id": "main",
                "site_name": "ChiPi Link",
                "description": "Tu Super App",
                "color_primario": "#16a34a",
                "color_secundario": "#0f766e",
                "footer_texto": "© 2025 ChiPi Link - Todos los derechos reservados",
                "meta_titulo": "ChiPi Link | Tu Super App",
                "meta_description": "La mejor plataforma para tu negocio"
            }
            
            await db[CoreCollections.SITE_CONFIG].insert_one(config_doc)
            print("✅ Site config created")
        else:
            print("✅ Site config already exists")
            
    except Exception as e:
        print(f"⚠️ Error seeding site config: {e}")


async def seed_landing_page():
    """
    Create default landing page with initial blocks if it doesn't exist.
    """
    try:
        existing_page = await db[CoreCollections.PAGES].find_one({"page_id": "landing"})
        
        if existing_page and existing_page.get("bloques") and len(existing_page.get("bloques", [])) > 0:
            print(f"✅ Landing page already has {len(existing_page.get('bloques', []))} blocks")
            return
        
        # Create initial blocks for the Super App landing page
        initial_blocks = [
            {
                "bloque_id": f"block_{uuid.uuid4().hex[:8]}",
                "tipo": "hero",
                "orden": 1,
                "active": True,
                "publicado": True,
                "config": {
                    "titulo": "Bienvenido a ChiPi Link",
                    "subtitulo": "Tu comunidad china en Panama, conectada",
                    "description": "La super app que conecta a la comunidad china en Panama con servicios, comercio y entretenimiento.",
                    "cta_texto": "Explorar",
                    "cta_link": "/unatienda",
                    "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
                    "estilo": "gradient"
                }
            },
            {
                "bloque_id": f"block_{uuid.uuid4().hex[:8]}",
                "tipo": "features",
                "orden": 2,
                "active": True,
                "publicado": True,
                "config": {
                    "titulo": "Nuestros Servicios",
                    "subtitulo": "Todo lo que necesitas en un solo lugar",
                    "features": [
                        {
                            "icono": "Store",
                            "titulo": "Tienda Online",
                            "description": "Compra productos de nuestra comunidad"
                        },
                        {
                            "icono": "Users",
                            "titulo": "Comunidad",
                            "description": "Conecta con otros miembros"
                        },
                        {
                            "icono": "Calendar",
                            "titulo": "Eventos",
                            "description": "Participa en actividades y torneos"
                        },
                        {
                            "icono": "MessageSquare",
                            "titulo": "Soporte",
                            "description": "Asistencia en tu idioma"
                        }
                    ],
                    "columnas": 4
                }
            },
            {
                "bloque_id": f"block_{uuid.uuid4().hex[:8]}",
                "tipo": "cta",
                "orden": 3,
                "active": True,
                "publicado": True,
                "config": {
                    "titulo": "¿Listo para comenzar?",
                    "description": "Join a nuestra comunidad y descubre todo lo que tenemos para ofrecer.",
                    "cta_texto": "Registrarse",
                    "cta_link": "/registro",
                    "cta_secundario_texto": "Ver Tienda",
                    "cta_secundario_link": "/unatienda",
                    "estilo": "centered"
                }
            }
        ]
        
        landing_doc = {
            "page_id": "landing",
            "titulo": "Page Principal",
            "bloques": initial_blocks,
            "publicada": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Use upsert to update or create
        await db[CoreCollections.PAGES].update_one(
            {"page_id": "landing"},
            {"$set": landing_doc},
            upsert=True
        )
        
        print(f"✅ Landing page created with {len(initial_blocks)} blocks")
        
    except Exception as e:
        print(f"⚠️ Error seeding landing page: {e}")


async def seed_translations():
    """
    Sync translations from JSON files to database on startup.
    This ensures all translation keys are available in the admin panel.
    """
    import json
    
    try:
        # Check if translations already exist
        count = await db[CoreCollections.TRANSLATIONS].count_documents({})
        if count > 0:
            print(f"✅ Translations already synced ({count} entries)")
            return
        
        base_path = "/app/frontend/src/i18n/locales"
        synced = 0
        
        def flatten_dict(d, parent_key=''):
            items = []
            for k, v in d.items():
                new_key = f"{parent_key}.{k}" if parent_key else k
                if isinstance(v, dict):
                    items.extend(flatten_dict(v, new_key))
                else:
                    items.append((new_key, str(v)))
            return items
        
        for lang in ["es", "zh", "en"]:
            file_path = f"{base_path}/{lang}.json"
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                flat = flatten_dict(data)
                
                for key, value in flat:
                    await db[CoreCollections.TRANSLATIONS].update_one(
                        {"key": key, "lang": lang},
                        {
                            "$set": {"value": value},
                            "$setOnInsert": {
                                "key": key,
                                "lang": lang,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                        },
                        upsert=True
                    )
                    synced += 1
            except FileNotFoundError:
                print(f"⚠️ Translation file not found: {file_path}")
            except Exception as e:
                print(f"⚠️ Error loading {lang} translations: {e}")
        
        print(f"✅ Translations synced: {synced} entries")
        
    except Exception as e:
        print(f"⚠️ Error seeding translations: {e}")


async def _safe_index(collection, keys, **kwargs):
    """Create an index, silently ignoring conflicts with existing indexes."""
    try:
        await collection.create_index(keys, **kwargs)
    except Exception:
        pass


async def create_indexes():
    """
    Create database indexes for optimized queries.
    Each index is created independently so one conflict doesn't block the rest.
    """
    import logging
    logger = logging.getLogger("indexes")
    try:
        users = db[AuthCollections.USERS]
        students = db[StoreCollections.STUDENTS]
        orders = db[StoreCollections.ORDERS]
        products = db[StoreCollections.PRODUCTS]
        categories = db[StoreCollections.CATEGORIES]

        await asyncio.gather(
            _safe_index(students, "estado"),
            _safe_index(students, "sync_id", unique=True, sparse=True),
            _safe_index(users, "user_id", unique=True, sparse=True),
            _safe_index(users, "email", unique=True, sparse=True),
            _safe_index(orders, "order_id", unique=True),
            _safe_index(orders, "status"),
            _safe_index(orders, "user_id"),
            _safe_index(orders, "created_at"),
            _safe_index(products, "book_id", unique=True),
            _safe_index(products, "category"),
            _safe_index(products, "grade"),
            _safe_index(products, "active"),
            _safe_index(categories, "category_id", unique=True),
            _safe_index(products, [("category", 1), ("active", 1)]),
            _safe_index(products, [("grade", 1), ("active", 1)]),
            _safe_index(orders, [("estado", 1), ("created_at", -1)]),
            _safe_index(db.oauth_states, "state", unique=True),
            _safe_index(db.oauth_states, "created_at", expireAfterSeconds=600),
        )
        logger.info("Database indexes ensured")
    except Exception as e:
        logger.warning(f"Index creation issue: {e}")
