"""
Store Module - Inventory Import Routes
CSV-based inventory management for textbooks (Catalog Privado PCA)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel
from enum import Enum
import csv
import io
from datetime import datetime, timezone

from core.database import db
from core.auth import get_admin_user

router = APIRouter(prefix="/inventory-import", tags=["Store - Inventory Import"])


class DuplicateMode(str, Enum):
    """How to handle items with matching codes"""
    REPLACE = "replace"  # Replace existing quantity with new quantity
    ADD = "add"          # Add new quantity to existing quantity
    SKIP = "skip"        # Skip items that already exist


class ImportResult(BaseModel):
    """Result of an import operation"""
    success: bool
    total_processed: int
    created: int
    updated: int
    skipped: int
    errors: list


# CSV Template columns
TEMPLATE_COLUMNS = [
    "codigo",           # Required: Unique product code
    "nombre",           # Required: Product name
    "grado",            # Required: Grade(s) - supports multiple grades separated by comma (e.g., "K4,K5" or "1,2")
    "cantidad",         # Required: Inventory quantity
    "precio",           # Required: Price
    "materia",          # Optional: Subject
    "editorial",        # Optional: Publisher
    "isbn",             # Optional: ISBN
    "descripcion",      # Optional: Description
]


def parse_grades(grado_str: str) -> tuple:
    """
    Parse grade string which may contain multiple grades separated by comma.
    Returns (primary_grade, grades_list).
    Example: "K4,K5" -> ("K4", ["K4", "K5"])
    Example: "1" -> ("1", ["1"])
    """
    if not grado_str:
        return None, []
    
    # Split by comma and clean each grade
    grades = [g.strip() for g in grado_str.split(',') if g.strip()]
    
    if not grades:
        return None, []
    
    # Return primary grade (first one) and full list
    return grades[0], grades


@router.get("/template")
async def download_csv_template(admin: dict = Depends(get_admin_user)):
    """
    Download CSV template for inventory import.
    Returns a CSV file with headers and example data.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(TEMPLATE_COLUMNS)
    
    # Write example rows
    example_data = [
        ["TXT-001", "Mathematics 1er Grado", "1", "50", "25.00", "Mathematics", "Santillana", "978-123456789", "Libro de mathematics para primer grado"],
        ["TXT-002", "Espyearl 2do Grado", "2", "30", "28.50", "Espyearl", "SM", "978-987654321", "Libro de espyearl para segundo grado"],
        ["TXT-003", "Ciencias Prekinder", "Prekinder", "25", "22.00", "Ciencias", "Oxford", "", "Libro de ciencias naturales"],
    ]
    writer.writerows(example_data)
    
    # Prepare response
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=inventory_template.csv"
        }
    )


@router.post("/preview")
async def preview_csv_import(
    file: UploadFile = File(...),
    duplicate_mode: DuplicateMode = Form(DuplicateMode.ADD),
    admin: dict = Depends(get_admin_user)
):
    """
    Preview CSV import before executing.
    Shows what will be created, updated, or skipped.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    
    try:
        # Try UTF-8 first, then latin-1
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        
        reader = csv.DictReader(io.StringIO(text))
        
        # Validate headers
        required_columns = {"codigo", "nombre", "grado", "cantidad", "precio"}
        if not required_columns.issubset(set(reader.fieldnames or [])):
            missing = required_columns - set(reader.fieldnames or [])
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing)}"
            )
        
        # Process rows
        preview_items = []
        errors = []
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 (1 is header)
            codigo = row.get('codigo', '').strip()
            nombre = row.get('nombre', '').strip()
            grado = row.get('grado', '').strip()
            
            # Validate required fields
            if not codigo:
                errors.append({"row": row_num, "error": "Missing codigo"})
                continue
            if not nombre:
                errors.append({"row": row_num, "error": "Missing nombre"})
                continue
            if not grado:
                errors.append({"row": row_num, "error": "Missing grado"})
                continue
            
            # Parse numeric fields
            try:
                cantidad = int(row.get('cantidad', '0').strip() or '0')
            except ValueError:
                errors.append({"row": row_num, "error": f"Invalid cantidad: {row.get('cantidad')}"})
                continue
            
            try:
                precio = float(row.get('precio', '0').strip() or '0')
            except ValueError:
                errors.append({"row": row_num, "error": f"Invalid precio: {row.get('precio')}"})
                continue
            
            # Check if product exists
            existing = await db.productos_privados.find_one(
                {"codigo": codigo},
                {"_id": 0, "libro_id": 1, "nombre": 1, "cantidad_inventario": 1}
            )
            
            action = "create"
            new_quantity = cantidad
            
            if existing:
                if duplicate_mode == DuplicateMode.SKIP:
                    action = "skip"
                    new_quantity = existing.get("cantidad_inventario", 0)
                elif duplicate_mode == DuplicateMode.REPLACE:
                    action = "update_replace"
                    new_quantity = cantidad
                elif duplicate_mode == DuplicateMode.ADD:
                    action = "update_add"
                    new_quantity = existing.get("cantidad_inventario", 0) + cantidad
            
            preview_items.append({
                "row": row_num,
                "codigo": codigo,
                "nombre": nombre,
                "grado": grado,
                "cantidad_csv": cantidad,
                "precio": precio,
                "action": action,
                "existing_quantity": existing.get("cantidad_inventario", 0) if existing else None,
                "new_quantity": new_quantity
            })
        
        # Summary
        actions_count = {
            "create": len([p for p in preview_items if p["action"] == "create"]),
            "update_replace": len([p for p in preview_items if p["action"] == "update_replace"]),
            "update_add": len([p for p in preview_items if p["action"] == "update_add"]),
            "skip": len([p for p in preview_items if p["action"] == "skip"]),
        }
        
        return {
            "success": True,
            "total_rows": len(preview_items) + len(errors),
            "valid_rows": len(preview_items),
            "error_rows": len(errors),
            "actions": actions_count,
            "items": preview_items,
            "errors": errors,
            "duplicate_mode": duplicate_mode
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")


@router.post("/execute")
async def execute_csv_import(
    file: UploadFile = File(...),
    duplicate_mode: DuplicateMode = Form(DuplicateMode.ADD),
    admin: dict = Depends(get_admin_user)
):
    """
    Execute CSV import for inventory.
    
    duplicate_mode options:
    - replace: Replace existing quantity with new quantity
    - add: Add new quantity to existing quantity  
    - skip: Skip items that already exist
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    
    try:
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        
        reader = csv.DictReader(io.StringIO(text))
        
        # Validate headers
        required_columns = {"codigo", "nombre", "grado", "cantidad", "precio"}
        if not required_columns.issubset(set(reader.fieldnames or [])):
            missing = required_columns - set(reader.fieldnames or [])
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing)}"
            )
        
        created = 0
        updated = 0
        skipped = 0
        errors = []
        now = datetime.now(timezone.utc).isoformat()
        
        for row_num, row in enumerate(reader, start=2):
            try:
                codigo = row.get('codigo', '').strip()
                nombre = row.get('nombre', '').strip()
                grado = row.get('grado', '').strip()
                
                if not codigo or not nombre or not grado:
                    errors.append({"row": row_num, "error": "Missing required field"})
                    continue
                
                cantidad = int(row.get('cantidad', '0').strip() or '0')
                precio = float(row.get('precio', '0').strip() or '0')
                
                # Check if exists
                existing = await db.productos_privados.find_one({"codigo": codigo})
                
                if existing:
                    if duplicate_mode == DuplicateMode.SKIP:
                        skipped += 1
                        continue
                    
                    # Calculateste new quantity
                    if duplicate_mode == DuplicateMode.REPLACE:
                        new_cantidad = cantidad
                    else:  # ADD
                        new_cantidad = existing.get("cantidad_inventario", 0) + cantidad
                    
                    # Update existing product
                    await db.productos_privados.update_one(
                        {"codigo": codigo},
                        {"$set": {
                            "nombre": nombre,
                            "grado": grado,
                            "precio": precio,
                            "cantidad_inventario": new_cantidad,
                            "materia": row.get('materia', '').strip() or existing.get("materia"),
                            "editorial": row.get('editorial', '').strip() or existing.get("editorial"),
                            "isbn": row.get('isbn', '').strip() or existing.get("isbn"),
                            "descripcion": row.get('descripcion', '').strip() or existing.get("descripcion"),
                            "updated_at": now,
                            "updated_by": admin.get("user_id")
                        }}
                    )
                    updated += 1
                else:
                    # Create new product
                    libro_id = f"libro_{datetime.now().strftime('%Y%m%d%H%M%S')}_{created:04d}"
                    
                    new_product = {
                        "libro_id": libro_id,
                        "codigo": codigo,
                        "nombre": nombre,
                        "grado": grado,
                        "precio": precio,
                        "cantidad_inventario": cantidad,
                        "materia": row.get('materia', '').strip() or None,
                        "editorial": row.get('editorial', '').strip() or None,
                        "isbn": row.get('isbn', '').strip() or None,
                        "descripcion": row.get('descripcion', '').strip() or None,
                        "imagen_url": None,
                        "activo": True,
                        "destacado": False,
                        "catalogo_tipo": "privado",
                        "created_at": now,
                        "created_by": admin.get("user_id"),
                        "updated_at": now
                    }
                    
                    await db.productos_privados.insert_one(new_product)
                    created += 1
                    
            except Exception as e:
                errors.append({"row": row_num, "error": str(e)})
        
        # Log import
        await db.import_history.insert_one({
            "import_id": f"imp_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "type": "inventory_csv",
            "filename": file.filename,
            "duplicate_mode": duplicate_mode,
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "errors": len(errors),
            "imported_by": admin.get("user_id"),
            "imported_at": now
        })
        
        return {
            "success": True,
            "message": f"Import completed: {created} created, {updated} updated, {skipped} skipped",
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@router.get("/history")
async def get_import_history(
    limit: int = 10,
    admin: dict = Depends(get_admin_user)
):
    """Get recent import history"""
    cursor = db.import_history.find(
        {"type": "inventory_csv"},
        {"_id": 0}
    ).sort("imported_at", -1).limit(limit)
    
    history = await cursor.to_list(length=limit)
    return {"history": history}
