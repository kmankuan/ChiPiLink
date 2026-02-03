"""
Database configuration and connection for ChiPi Link
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
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
    Create default admin user if it doesn't exist.
    This ensures there's always an admin account in production.
    """
    try:
        # Check if admin exists
        admin_email = os.environ.get('ADMIN_EMAIL', 'teck@koh.one')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'Acdb##0897')
        
        existing_admin = await db[AuthCollections.USERS].find_one({"email": admin_email})
        
        if not existing_admin:
            # Create admin user with English field names
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
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
            print(f"✅ Admin user created: {admin_email}")
        else:
            print(f"✅ Admin user already exists: {admin_email}")
            
    except Exception as e:
        print(f"⚠️ Error seeding admin user: {e}")


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


async def create_indexes():
    """
    Create database indexes for optimized queries.
    Call this on application startup.
    """
    try:
        # Index for store_students
        await db[StoreCollections.STUDENTS].create_index("estado")
        await db[StoreCollections.STUDENTS].create_index("sync_id", unique=True)
        
        # Index for auth_users (using English field names)
        await db[AuthCollections.USERS].create_index("user_id", unique=True)
        await db[AuthCollections.USERS].create_index("email", unique=True, sparse=True)
        
        # Index for store_orders
        await db[StoreCollections.ORDERS].create_index("order_id", unique=True)
        await db[StoreCollections.ORDERS].create_index("status")
        await db[StoreCollections.ORDERS].create_index("user_id")
        await db[StoreCollections.ORDERS].create_index("created_at")
        
        # Index for store_products
        await db[StoreCollections.PRODUCTS].create_index("book_id", unique=True)
        await db[StoreCollections.PRODUCTS].create_index("category")
        await db[StoreCollections.PRODUCTS].create_index("grade")
        await db[StoreCollections.PRODUCTS].create_index("active")
        
        # Index for store_categories
        await db[StoreCollections.CATEGORIES].create_index("category_id", unique=True)
        
        # Compound indexes for common queries
        await db[StoreCollections.PRODUCTS].create_index([("category", 1), ("active", 1)])
        await db[StoreCollections.PRODUCTS].create_index([("grade", 1), ("active", 1)])
        await db[StoreCollections.ORDERS].create_index([("estado", 1), ("created_at", -1)])
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"⚠️ Error creating indexes (may already exist): {e}")
