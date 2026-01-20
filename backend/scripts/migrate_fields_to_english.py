"""
Migration Script - Rename Spanish field names to English
Run this ONCE to migrate existing data in MongoDB
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
    
    total_modified = 0
    
    # Rename each field individually (more robust)
    for old_field, new_field in field_map.items():
        # Only rename if old field exists and new field doesn't
        query = {old_field: {"$exists": True}}
        count = await collection.count_documents(query)
        
        if count > 0:
            result = await collection.update_many(
                query,
                {"$rename": {old_field: new_field}}
            )
            if result.modified_count > 0:
                print(f"    - {old_field} → {new_field}: {result.modified_count} docs")
                total_modified += result.modified_count
    
    if total_modified == 0:
        print(f"  ✓ {collection_name}: No documents to migrate (already migrated or empty)")
    else:
        print(f"  ✓ {collection_name}: Total {total_modified} field renames")
    
    return total_modified


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
    print(f"Migration complete! Total field renames: {total_migrated}")
    print("=" * 60)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
