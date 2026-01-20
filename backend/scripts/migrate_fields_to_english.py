"""
Migration Script - Rename Spanish field names to English
Run this ONCE to migrate existing data in MongoDB

This script renames fields from Spanish to English in:
- auth_users collection
- auth_sessions collection  
- user_roles collection
- user_permissions collection

Usage: python -m scripts.migrate_fields_to_english
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'chipilink_prod')


# Field mappings: Spanish -> English
USER_FIELD_MAP = {
    "cliente_id": "user_id",
    "nombre": "name",
    "apellido": "last_name",
    "telefono": "phone",
    "direccion": "address",
    "contrasena_hash": "password_hash",
    "es_admin": "is_admin",
    "estudiantes": "students",
    "fecha_creacion": "created_at",
    "fecha_actualizacion": "updated_at",
    "ultimo_login": "last_login",
    "activo": "is_active"
}

SESSION_FIELD_MAP = {
    "sesion_id": "session_id",
    "cliente_id": "user_id",
    "fecha_creacion": "created_at",
    "fecha_expiracion": "expires_at"
}

ROLE_ASSIGNMENT_FIELD_MAP = {
    "cliente_id": "user_id",
    "fecha_asignacion": "assigned_at",
    "asignado_por": "assigned_by"
}


async def migrate_collection(db, collection_name: str, field_map: dict):
    """Migrate fields in a collection from Spanish to English"""
    collection = db[collection_name]
    
    # Build rename operations
    rename_ops = {old: new for old, new in field_map.items()}
    
    # Count documents that need migration
    count = 0
    for old_field in field_map.keys():
        count += await collection.count_documents({old_field: {"$exists": True}})
    
    if count == 0:
        print(f"  ✓ {collection_name}: No documents to migrate")
        return 0
    
    # Perform the rename
    result = await collection.update_many(
        {},
        {"$rename": rename_ops}
    )
    
    print(f"  ✓ {collection_name}: Migrated {result.modified_count} documents")
    return result.modified_count


async def main():
    print("=" * 60)
    print("Field Migration: Spanish → English")
    print("=" * 60)
    print(f"Database: {DB_NAME}")
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    total_migrated = 0
    
    # Migrate auth_users
    print("Migrating auth_users...")
    total_migrated += await migrate_collection(db, "auth_users", USER_FIELD_MAP)
    
    # Migrate auth_sessions
    print("Migrating auth_sessions...")
    total_migrated += await migrate_collection(db, "auth_sessions", SESSION_FIELD_MAP)
    
    # Migrate user_roles
    print("Migrating user_roles...")
    total_migrated += await migrate_collection(db, "user_roles", ROLE_ASSIGNMENT_FIELD_MAP)
    
    # Migrate user_permissions
    print("Migrating user_permissions...")
    total_migrated += await migrate_collection(db, "user_permissions", {"cliente_id": "user_id"})
    
    print()
    print("=" * 60)
    print(f"Migration complete! Total documents modified: {total_migrated}")
    print("=" * 60)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
