"""
Database Migration Script: Spanish to English Field Names
This script converts all Spanish field names to English equivalents in the database.

Run this script ONCE on your production database before deploying the English-only codebase.

Usage:
    python scripts/migrate_spanish_to_english.py

Collections affected:
    - store_products: Product catalog
    - store_student_records: Student records
    - store_textbook_orders: Textbook orders
    - auth_users: User accounts
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'chipilink')


# Field name mappings: Spanish -> English
FIELD_MAPPINGS = {
    # Common fields
    "nombre": "name",
    "nombre_completo": "full_name",
    "descripcion": "description",
    "activo": "active",
    "creado_en": "created_at",
    "actualizado_en": "updated_at",
    "fecha_creacion": "created_at",
    "fecha_actualizacion": "updated_at",
    
    # Product fields
    "grado": "grade",
    "grados": "grades",
    "materia": "subject",
    "precio": "price",
    "cantidad": "quantity",
    "cantidad_reservada": "reserved_quantity",
    "inventario": "inventory_quantity",
    "destacado": "featured",
    "catalogo_privado": "is_private_catalog",
    "es_catalogo_privado": "is_private_catalog",
    "codigo": "code",
    "editorial": "publisher",
    "categoria": "category",
    
    # Student/Enrollment fields
    "estudiante": "student",
    "estudiantes": "students",
    "año": "year",
    "estado": "status",
    "aprobado": "approved",
    "aprobada": "approved",
    "pendiente": "pending",
    "rechazado": "rejected",
    "rechazada": "rejected",
    "colegio": "school",
    "escuela": "school",
    "relacion": "relation_type",
    "tipo_relacion": "relation_type",
    "numero_estudiante": "student_number",
    
    # Order fields
    "pedido": "order",
    "pedidos": "orders",
    "total": "total",
    "enviado": "submitted",
    "libros": "books",
    "libro": "book",
    
    # User fields
    "telefono": "phone",
    "direccion": "address",
    "correo": "email",
    "contrasena": "password",
    "es_admin": "is_admin",
    "es_activo": "is_active",
}

# Status value mappings
STATUS_MAPPINGS = {
    "aprobado": "approved",
    "aprobada": "approved",
    "pendiente": "pending",
    "rechazado": "rejected",
    "rechazada": "rejected",
    "enviado": "submitted",
    "borrador": "draft",
    "completado": "completed",
    "cancelado": "cancelled",
}


async def migrate_collection(db, collection_name: str, dry_run: bool = False):
    """Migrate a single collection's field names from Spanish to English"""
    collection = db[collection_name]
    total_docs = await collection.count_documents({})
    
    if total_docs == 0:
        print(f"  ⏭️  {collection_name}: No documents to migrate")
        return 0
    
    print(f"  📄 {collection_name}: Processing {total_docs} documents...")
    
    migrated_count = 0
    
    async for doc in collection.find({}):
        updates = {}
        unsets = {}
        
        # Check each field in the document
        for spanish_field, english_field in FIELD_MAPPINGS.items():
            if spanish_field in doc and spanish_field != english_field:
                # If English field doesn't exist, rename
                if english_field not in doc:
                    updates[english_field] = doc[spanish_field]
                unsets[spanish_field] = ""
        
        # Check for status value migrations in nested fields
        if "enrollments" in doc and isinstance(doc["enrollments"], list):
            new_enrollments = []
            enrollments_changed = False
            
            for enrollment in doc["enrollments"]:
                new_enrollment = dict(enrollment)
                
                # Migrate field names
                for spanish, english in FIELD_MAPPINGS.items():
                    if spanish in new_enrollment:
                        if english not in new_enrollment:
                            new_enrollment[english] = new_enrollment[spanish]
                        del new_enrollment[spanish]
                        enrollments_changed = True
                
                # Migrate status values
                if "status" in new_enrollment:
                    status = new_enrollment["status"]
                    if status in STATUS_MAPPINGS:
                        new_enrollment["status"] = STATUS_MAPPINGS[status]
                        enrollments_changed = True
                
                new_enrollments.append(new_enrollment)
            
            if enrollments_changed:
                updates["enrollments"] = new_enrollments
        
        # Migrate status field values
        if "status" in doc and doc["status"] in STATUS_MAPPINGS:
            updates["status"] = STATUS_MAPPINGS[doc["status"]]
        
        # Apply updates
        if updates or unsets:
            update_query = {}
            if updates:
                update_query["$set"] = updates
            if unsets:
                update_query["$unset"] = unsets
            
            if not dry_run:
                await collection.update_one({"_id": doc["_id"]}, update_query)
            
            migrated_count += 1
    
    print(f"  ✅ {collection_name}: Migrated {migrated_count} documents")
    return migrated_count


async def run_migration(dry_run: bool = False):
    """Run the full migration"""
    print("\n" + "=" * 60)
    print("Database Migration: Spanish to English Field Names")
    print("=" * 60)
    
    if dry_run:
        print("\n⚠️  DRY RUN MODE - No changes will be made\n")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"\nConnected to: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    print(f"Started at: {datetime.now(timezone.utc).isoformat()}\n")
    
    # Collections to migrate
    collections = [
        "store_products",
        "store_student_records", 
        "store_textbook_orders",
        "store_textbook_access_requests",
        "auth_users",
        "users",  # Legacy collection if exists
    ]
    
    total_migrated = 0
    
    for collection_name in collections:
        try:
            count = await migrate_collection(db, collection_name, dry_run)
            total_migrated += count
        except Exception as e:
            print(f"  ❌ {collection_name}: Error - {str(e)}")
    
    print(f"\n{'=' * 60}")
    print(f"Migration {'simulation' if dry_run else 'completed'}!")
    print(f"Total documents {'would be ' if dry_run else ''}migrated: {total_migrated}")
    print(f"Finished at: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60 + "\n")
    
    if dry_run:
        print("To run the actual migration, execute without --dry-run flag")
    
    client.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate Spanish field names to English")
    parser.add_argument("--dry-run", action="store_true", help="Simulate migration without making changes")
    args = parser.parse_args()
    
    asyncio.run(run_migration(dry_run=args.dry_run))
