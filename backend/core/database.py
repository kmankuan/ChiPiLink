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
        
        existing_admin = await db.clientes.find_one({"email": admin_email})
        
        if not existing_admin:
            # Create admin user
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            admin_doc = {
                "cliente_id": f"admin_{uuid.uuid4().hex[:8]}",
                "nombre": "Administrador",
                "apellido": "ChiPi Link",
                "email": admin_email,
                "telefono": "",
                "contrasena_hash": hashed_password,
                "es_admin": True,
                "estudiantes": [],
                "direccion": {},
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            }
            
            await db.clientes.insert_one(admin_doc)
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
        existing_config = await db.site_config.find_one({"config_id": "main"})
        
        if not existing_config:
            config_doc = {
                "config_id": "main",
                "nombre_sitio": "ChiPi Link",
                "descripcion": "Tu Super App",
                "color_primario": "#16a34a",
                "color_secundario": "#0f766e",
                "footer_texto": "© 2025 ChiPi Link - Todos los derechos reservados",
                "meta_titulo": "ChiPi Link | Tu Super App",
                "meta_descripcion": "La mejor plataforma para tu negocio"
            }
            
            await db.site_config.insert_one(config_doc)
            print("✅ Site config created")
        else:
            print("✅ Site config already exists")
            
    except Exception as e:
        print(f"⚠️ Error seeding site config: {e}")


async def create_indexes():
    """
    Create database indexes for optimized queries.
    Call this on application startup.
    """
    try:
        # Index for estudiantes_sincronizados - most queried collection
        await db.estudiantes_sincronizados.create_index("estado")
        await db.estudiantes_sincronizados.create_index("sync_id", unique=True)
        
        # Index for clientes
        await db.clientes.create_index("cliente_id", unique=True)
        await db.clientes.create_index("email", unique=True, sparse=True)
        
        # Index for pedidos (orders)
        await db.pedidos.create_index("pedido_id", unique=True)
        await db.pedidos.create_index("estado")
        await db.pedidos.create_index("cliente_id")
        await db.pedidos.create_index("fecha_creacion")
        
        # Index for libros (products)
        await db.libros.create_index("libro_id", unique=True)
        await db.libros.create_index("categoria")
        await db.libros.create_index("grado")
        await db.libros.create_index("activo")
        
        # Index for categorias
        await db.categorias.create_index("categoria_id", unique=True)
        
        # Compound indexes for common queries
        await db.libros.create_index([("categoria", 1), ("activo", 1)])
        await db.libros.create_index([("grado", 1), ("activo", 1)])
        await db.pedidos.create_index([("estado", 1), ("fecha_creacion", -1)])
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"⚠️ Error creating indexes (may already exist): {e}")
