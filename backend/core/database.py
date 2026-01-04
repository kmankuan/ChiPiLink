"""
Database configuration and connection for ChiPi Link
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
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
