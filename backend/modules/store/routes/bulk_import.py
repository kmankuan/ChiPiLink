"""
Store Module - Bulk Import Routes
Endpoints for bulk import from Google Sheets data
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Optional, List
from pydantic import BaseModel

from core.auth import get_admin_user
from ..services.bulk_import_service import bulk_import_service

router = APIRouter(prefix="/bulk-import", tags=["Store - Bulk Import"])


# ============== REQUEST MODELS ==============

class ParseTSVRequest(BaseModel):
    """Request for parsing TSV text"""
    raw_text: str
    has_headers: bool = True


class PreviewStudentsRequest(BaseModel):
    """Request for previewing student import"""
    raw_text: str
    column_mapping: Dict[str, int]  # {"student_number": 0, "full_name": 1, ...}
    grade_default: Optional[str] = None


class ImportStudentsRequest(BaseModel):
    """Request for importing students"""
    raw_text: str
    column_mapping: Dict[str, int]
    grade_default: Optional[str] = None
    sheet_name: str = "Manual Import"
    update_existing: bool = True


class PreviewBooksRequest(BaseModel):
    """Request for previewing book import"""
    raw_text: str
    column_mapping: Dict[str, int]  # {"code": 0, "name": 1, "price": 2, ...}
    catalog_id: Optional[str] = None
    grade_default: Optional[str] = None


class ImportBooksRequest(BaseModel):
    """Request for importing books"""
    raw_text: str
    column_mapping: Dict[str, int]
    catalog_id: Optional[str] = None
    grade_default: Optional[str] = None
    update_existing: bool = True


# ============== ENDPOINTS ==============

@router.post("/parse")
async def parse_tsv(
    request: ParseTSVRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Parse text in TSV (tab-separated) format.
    Useful for detecting data structure before mapping columns.
    """
    result = bulk_import_service.parse_tsv(
        request.raw_text,
        request.has_headers
    )
    return result


@router.post("/students/preview")
async def preview_students(
    request: PreviewStudentsRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Preview student import before executing.
    Shows which records will be created, updated, and any errors.
    """
    result = await bulk_import_service.preview_students(
        request.raw_text,
        request.column_mapping,
        request.grade_default
    )
    return result


@router.post("/students/import")
async def import_students(
    request: ImportStudentsRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Import students from Google Sheets data.
    """
    result = await bulk_import_service.import_students(
        request.raw_text,
        request.column_mapping,
        request.grade_default,
        request.sheet_name,
        request.update_existing,
        admin.get("user_id")
    )
    return result


@router.post("/books/preview")
async def preview_books(
    request: PreviewBooksRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Preview book import before executing.
    """
    result = await bulk_import_service.preview_books(
        request.raw_text,
        request.column_mapping,
        request.catalog_id,
        request.grade_default
    )
    return result


@router.post("/books/import")
async def import_books(
    request: ImportBooksRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Import books from Google Sheets data.
    """
    result = await bulk_import_service.import_books(
        request.raw_text,
        request.column_mapping,
        request.catalog_id,
        request.grade_default,
        request.update_existing,
        admin.get("user_id")
    )
    return result


@router.get("/history")
async def get_import_history(
    type: Optional[str] = None,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """
    Get import history.
    
    Args:
        type: Filter by type ("students" or "books")
        limit: Maximum number of records
    """
    result = await bulk_import_service.get_import_history(type, limit)
    return result


@router.get("/grades")
async def get_available_grades(
    admin: dict = Depends(get_admin_user)
):
    """
    Get list of available grades (from imported students).
    """
    grades = await bulk_import_service.get_available_grades()
    return {"grades": grades}


@router.get("/students")
async def get_imported_students(
    grade: Optional[str] = None,
    search: Optional[str] = None,
    status: str = "active",
    limit: int = 100,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """
    Get imported students with filters.
    """
    from core.database import db
    
    query = {}
    if grade:
        query["grade"] = grado
    if estado:
        query["estado"] = estado
    if buscar:
        query["$or"] = [
            {"full_name": {"$regex": buscar, "$options": "i"}},
            {"numero_estudiante": {"$regex": buscar, "$options": "i"}}
        ]
    
    total = await db.synced_students.count_documents(query)
    
    cursor = db.synced_students.find(
        query,
        {"_id": 0}
    ).sort("full_name", 1).skip(skip).limit(limit)
    
    estudiantes = await cursor.to_list(length=limit)
    
    return {
        "total": total,
        "estudiantes": estudiantes,
        "pagina": skip // limit + 1 if limit > 0 else 1,
        "total_paginas": (total + limit - 1) // limit if limit > 0 else 1
    }
