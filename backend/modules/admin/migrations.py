"""
Admin Database Migration Routes
Endpoints for running database migrations from admin panel
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from core.auth import get_admin_user
from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/migrations", tags=["Admin - Migrations"])


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
    "colegio": "school",
    "escuela": "school",
    "relacion": "relation_type",
    "tipo_relacion": "relation_type",
    "numero_estudiante": "student_number",
    
    # Order fields
    "pedido": "order",
    "pedidos": "orders",
    "enviado": "submitted",
    "libros": "books",
    "libro": "book",
    
    # User fields
    "telefono": "phone",
    "direccion": "address",
    "correo": "email",
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


async def migrate_collection(collection_name: str, dry_run: bool = False) -> Dict:
    """Migrate a single collection's field names from Spanish to English"""
    collection = db[collection_name]
    total_docs = await collection.count_documents({})
    
    if total_docs == 0:
        return {
            "collection": collection_name,
            "status": "skipped",
            "message": "No documents to migrate",
            "total": 0,
            "migrated": 0
        }
    
    migrated_count = 0
    sample_changes = []
    
    async for doc in collection.find({}):
        updates = {}
        unsets = {}
        doc_id = str(doc.get("_id", ""))
        
        # Check each field in the document
        for spanish_field, english_field in FIELD_MAPPINGS.items():
            if spanish_field in doc and spanish_field != english_field:
                if english_field not in doc:
                    updates[english_field] = doc[spanish_field]
                unsets[spanish_field] = ""
                
                # Record sample change (first 3 only)
                if len(sample_changes) < 3:
                    sample_changes.append({
                        "doc_id": doc_id[:20],
                        "field": f"{spanish_field} -> {english_field}"
                    })
        
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
    
    return {
        "collection": collection_name,
        "status": "completed" if not dry_run else "preview",
        "total": total_docs,
        "migrated": migrated_count,
        "sample_changes": sample_changes
    }


@router.post("/spanish-to-english")
async def run_spanish_to_english_migration(
    dry_run: bool = Query(True, description="If true, only preview changes without applying them"),
    admin: dict = Depends(get_admin_user)
):
    """
    Run database migration to convert Spanish field names to English.
    
    **IMPORTANT**: Run with dry_run=true first to preview changes!
    
    This migration converts:
    - Field names: grado -> grade, activo -> active, catalogo_privado -> is_private_catalog, etc.
    - Status values: aprobado -> approved, pendiente -> pending, etc.
    - Nested enrollment fields
    
    Collections affected:
    - store_products
    - store_student_records
    - store_textbook_orders
    - store_textbook_access_requests
    - auth_users
    """
    logger.info(f"[migration] Starting Spanish to English migration (dry_run={dry_run}) by {admin.get('email')}")
    
    start_time = datetime.now(timezone.utc)
    
    # Collections to migrate
    collections = [
        "store_products",
        "store_student_records", 
        "store_textbook_orders",
        "store_textbook_access_requests",
        "auth_users",
    ]
    
    results = []
    total_migrated = 0
    errors = []
    
    for collection_name in collections:
        try:
            result = await migrate_collection(collection_name, dry_run)
            results.append(result)
            total_migrated += result.get("migrated", 0)
        except Exception as e:
            logger.error(f"[migration] Error migrating {collection_name}: {str(e)}")
            errors.append({
                "collection": collection_name,
                "error": str(e)
            })
    
    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds()
    
    response = {
        "success": len(errors) == 0,
        "dry_run": dry_run,
        "message": "Migration preview completed" if dry_run else "Migration completed successfully",
        "started_at": start_time.isoformat(),
        "finished_at": end_time.isoformat(),
        "duration_seconds": round(duration, 2),
        "total_documents_migrated": total_migrated,
        "collections": results,
        "errors": errors
    }
    
    if dry_run and total_migrated > 0:
        response["next_step"] = "To apply changes, call this endpoint with dry_run=false"
    
    logger.info(f"[migration] Completed: {total_migrated} documents {'would be ' if dry_run else ''}migrated")
    
    return response


@router.get("/status")
async def get_migration_status(
    admin: dict = Depends(get_admin_user)
):
    """
    Check current database field status.
    Shows counts of documents with Spanish vs English field names.
    """
    results = {}
    
    # Check store_products
    products_spanish = await db.store_products.count_documents({
        "$or": [
            {"catalogo_privado": {"$exists": True}},
            {"grado": {"$exists": True}},
            {"activo": {"$exists": True}}
        ]
    })
    products_english = await db.store_products.count_documents({
        "$or": [
            {"is_private_catalog": {"$exists": True}},
            {"grade": {"$exists": True}},
            {"active": {"$exists": True}}
        ]
    })
    results["store_products"] = {
        "spanish_fields": products_spanish,
        "english_fields": products_english,
        "needs_migration": products_spanish > 0
    }
    
    # Check store_student_records
    students_spanish = await db.store_student_records.count_documents({
        "$or": [
            {"grado": {"$exists": True}},
            {"estado": {"$exists": True}},
            {"numero_estudiante": {"$exists": True}}
        ]
    })
    students_english = await db.store_student_records.count_documents({
        "$or": [
            {"grade": {"$exists": True}},
            {"status": {"$exists": True}},
            {"student_number": {"$exists": True}}
        ]
    })
    results["store_student_records"] = {
        "spanish_fields": students_spanish,
        "english_fields": students_english,
        "needs_migration": students_spanish > 0
    }
    
    # Check auth_users
    users_spanish = await db.auth_users.count_documents({
        "$or": [
            {"telefono": {"$exists": True}},
            {"direccion": {"$exists": True}},
            {"es_admin": {"$exists": True}}
        ]
    })
    users_english = await db.auth_users.count_documents({
        "$or": [
            {"phone": {"$exists": True}},
            {"address": {"$exists": True}},
            {"is_admin": {"$exists": True}}
        ]
    })
    results["auth_users"] = {
        "spanish_fields": users_spanish,
        "english_fields": users_english,
        "needs_migration": users_spanish > 0
    }
    
    needs_migration = any(r["needs_migration"] for r in results.values())
    
    return {
        "needs_migration": needs_migration,
        "recommendation": "Run POST /api/admin/migrations/spanish-to-english?dry_run=true to preview changes" if needs_migration else "Database is using English field names",
        "collections": results
    }
