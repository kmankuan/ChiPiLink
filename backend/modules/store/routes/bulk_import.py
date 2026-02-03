"""
Store Module - Bulk Import Routes
Endpoints for import masiva desde datos copiados de Google Sheets
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Optional, List
from pydantic import BaseModel

from core.auth import get_admin_user
from ..services.bulk_import_service import bulk_import_service

router = APIRouter(prefix="/bulk-import", tags=["Store - Bulk Import"])


# ============== REQUEST MODELS ==============

class ParseTSVRequest(BaseModel):
    """Request para parsear texto TSV"""
    raw_text: str
    has_headers: bool = True


class PreviewEstudiantesRequest(BaseModel):
    """Request para previsualizar import de estudiantes"""
    raw_text: str
    column_mapping: Dict[str, int]  # {"numero_estudiante": 0, "nombre_completo": 1, ...}
    grado_default: Optional[str] = None


class ImportEstudiantesRequest(BaseModel):
    """Request para importar estudiantes"""
    raw_text: str
    column_mapping: Dict[str, int]
    grado_default: Optional[str] = None
    hoja_name: str = "Import Manual"
    actualizar_existentes: bool = True


class PreviewLibrosRequest(BaseModel):
    """Request para previsualizar import de libros"""
    raw_text: str
    column_mapping: Dict[str, int]  # {"code": 0, "name": 1, "price": 2, ...}
    catalogo_id: Optional[str] = None
    grado_default: Optional[str] = None


class ImportLibrosRequest(BaseModel):
    """Request para importar libros"""
    raw_text: str
    column_mapping: Dict[str, int]
    catalogo_id: Optional[str] = None
    grado_default: Optional[str] = None
    actualizar_existentes: bool = True


# ============== ENDPOINTS ==============

@router.post("/parse")
async def parse_tsv(
    request: ParseTSVRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Parsear texto en formato TSV (tab-separated).
    Useful para detectar la estructura de los datos antes de mapear columnas.
    """
    result = bulk_import_service.parse_tsv(
        request.raw_text,
        request.has_headers
    )
    return result


@router.post("/estudiantes/preview")
async def preview_estudiantes(
    request: PreviewEstudiantesRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Previsualizar import de estudiantes antes de ejecutarla.
    Muestra what registros se will create, will update, y cualquier error.
    """
    result = await bulk_import_service.preview_estudiantes(
        request.raw_text,
        request.column_mapping,
        request.grade_default
    )
    return result


@router.post("/estudiantes/import")
async def import_estudiantes(
    request: ImportEstudiantesRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Importar estudiantes desde datos copiados de Google Sheets.
    """
    result = await bulk_import_service.importar_estudiantes(
        request.raw_text,
        request.column_mapping,
        request.grade_default,
        request.hoja_nombre,
        request.actualizar_existentes,
        admin.get("user_id")
    )
    return result


@router.post("/libros/preview")
async def preview_libros(
    request: PreviewLibrosRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Previsualizar import de libros antes de ejecutarla.
    """
    result = await bulk_import_service.preview_libros(
        request.raw_text,
        request.column_mapping,
        request.catalogo_id,
        request.grade_default
    )
    return result


@router.post("/libros/import")
async def import_libros(
    request: ImportLibrosRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Importar libros desde datos copiados de Google Sheets.
    """
    result = await bulk_import_service.importar_libros(
        request.raw_text,
        request.column_mapping,
        request.catalogo_id,
        request.grade_default,
        request.actualizar_existentes,
        admin.get("user_id")
    )
    return result


@router.get("/history")
async def get_import_history(
    tipo: Optional[str] = None,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener historial de importaciones.
    
    Args:
        tipo: Filtrar by type ("estudiantes" o "libros")
        limit: Number maximum de registros
    """
    result = await bulk_import_service.get_import_history(tipo, limit)
    return result


@router.get("/grados")
async def get_grados_disponibles(
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener lista de grados disponibles (de estudiantes importados).
    """
    grados = await bulk_import_service.get_grados_disponibles()
    return {"grades": grados}


@router.get("/estudiantes")
async def get_estudiantes_importados(
    grade: Optional[str] = None,
    buscar: Optional[str] = None,
    estado: str = "active",
    limit: int = 100,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener estudiantes importados con filtros.
    """
    from core.database import db
    
    query = {}
    if grado:
        query["grade"] = grado
    if estado:
        query["estado"] = estado
    if buscar:
        query["$or"] = [
            {"nombre_completo": {"$regex": buscar, "$options": "i"}},
            {"numero_estudiante": {"$regex": buscar, "$options": "i"}}
        ]
    
    total = await db.estudiantes_sincronizados.count_documents(query)
    
    cursor = db.estudiantes_sincronizados.find(
        query,
        {"_id": 0}
    ).sort("nombre_completo", 1).skip(skip).limit(limit)
    
    estudiantes = await cursor.to_list(length=limit)
    
    return {
        "total": total,
        "estudiantes": estudiantes,
        "pagina": skip // limit + 1 if limit > 0 else 1,
        "total_paginas": (total + limit - 1) // limit if limit > 0 else 1
    }
