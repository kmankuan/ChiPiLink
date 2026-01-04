"""
Google Sheets Integration Routes
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone
import hashlib
import httpx
import csv
import io
import re
import uuid
import logging

from core.database import db
from core.auth import get_admin_user
from .models import ConfiguracionSheetSync, EstudianteSincronizado, CambioRegistro

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sheets", tags=["Google Sheets Integration"])


# ============== HELPER FUNCTIONS ==============

def extract_sheet_id(url: str) -> str:
    """Extract Google Sheet ID from URL"""
    patterns = [
        r'/spreadsheets/d/([a-zA-Z0-9-_]+)',
        r'key=([a-zA-Z0-9-_]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return ""


def extract_gid(url: str) -> str:
    """Extract GID (tab ID) from URL"""
    match = re.search(r'gid=([0-9]+)', url)
    return match.group(1) if match else "0"


def calculate_hash(data: dict) -> str:
    """Calculate hash of data for change detection"""
    sorted_str = str(sorted(data.items()))
    return hashlib.md5(sorted_str.encode()).hexdigest()


async def fetch_sheet_data(sheet_id: str, gid: str = "0") -> List[List[str]]:
    """Fetch data from published Google Sheet"""
    # Use CSV export URL for published sheets
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0, follow_redirects=True)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="No se pudo acceder a la hoja. Aseg\u00farese de que est\u00e9 publicada."
            )
        
        # Parse CSV
        content = response.text
        reader = csv.reader(io.StringIO(content))
        return list(reader)


# ============== CONFIG ROUTES ==============

@router.get("/configs")
async def get_sheet_configs(admin: dict = Depends(get_admin_user)):
    """Get all sheet sync configurations"""
    configs = await db.sheet_configs.find({}, {"_id": 0}).to_list(100)
    return configs


@router.get("/configs/{config_id}")
async def get_sheet_config(config_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific sheet sync configuration"""
    config = await db.sheet_configs.find_one({"config_id": config_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Configuraci\u00f3n no encontrada")
    return config


@router.post("/configs")
async def create_sheet_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Create a new sheet sync configuration"""
    sheet_url = config.get("sheet_url", "")
    sheet_id = extract_sheet_id(sheet_url)
    gid = extract_gid(sheet_url)
    
    if not sheet_id:
        raise HTTPException(status_code=400, detail="URL de Google Sheet inv\u00e1lida")
    
    # Try to fetch headers
    try:
        data = await fetch_sheet_data(sheet_id, gid)
        if not data:
            raise HTTPException(status_code=400, detail="La hoja est\u00e1 vac\u00eda")
        
        header_row = config.get("fila_encabezado", 1) - 1
        headers = data[header_row] if len(data) > header_row else []
        
        # Auto-create column mapping
        mapeo = []
        for i, header in enumerate(headers):
            if header.strip():
                mapeo.append({
                    "columna_id": str(i),
                    "nombre_original": header.strip(),
                    "campo_destino": header.strip().lower().replace(" ", "_"),
                    "tipo": "text",
                    "obligatorio": False
                })
        
        new_config = ConfiguracionSheetSync(
            nombre=config.get("nombre", "Nueva Configuraci\u00f3n"),
            sheet_url=sheet_url,
            sheet_id=sheet_id,
            gid=gid,
            mapeo_columnas=mapeo,
            fila_encabezado=config.get("fila_encabezado", 1),
            fila_inicio_datos=config.get("fila_inicio_datos", 2),
            estado="configurando"
        )
        
        doc = new_config.model_dump()
        doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
        
        await db.sheet_configs.insert_one(doc)
        
        return {
            "success": True,
            "config": {k: v for k, v in doc.items() if k != "_id"},
            "headers_detectados": headers,
            "total_filas": len(data) - config.get("fila_inicio_datos", 2) + 1
        }
        
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Error al conectar: {str(e)}")


@router.put("/configs/{config_id}")
async def update_sheet_config(config_id: str, config: dict, admin: dict = Depends(get_admin_user)):
    """Update sheet sync configuration"""
    update_data = {k: v for k, v in config.items() if k not in ["config_id", "_id", "fecha_creacion"]}
    
    result = await db.sheet_configs.update_one(
        {"config_id": config_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Configuraci\u00f3n no encontrada")
    
    updated = await db.sheet_configs.find_one({"config_id": config_id}, {"_id": 0})
    return updated


@router.put("/configs/{config_id}/column-lock/{columna_id}")
async def toggle_column_lock(config_id: str, columna_id: str, locked: bool, admin: dict = Depends(get_admin_user)):
    """Toggle column lock status"""
    result = await db.sheet_configs.update_one(
        {"config_id": config_id, "mapeo_columnas.columna_id": columna_id},
        {"$set": {"mapeo_columnas.$.locked": locked}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Configuraci\u00f3n o columna no encontrada")
    
    return {"success": True, "locked": locked}


@router.delete("/configs/{config_id}")
async def delete_sheet_config(config_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a sheet sync configuration and its data"""
    result = await db.sheet_configs.delete_one({"config_id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Configuraci\u00f3n no encontrada")
    
    # Also delete synced data
    await db.estudiantes_sincronizados.delete_many({"config_id": config_id})
    
    return {"success": True}


# ============== SYNC ROUTES ==============

@router.post("/configs/{config_id}/sync")
async def sync_sheet_data(config_id: str, admin: dict = Depends(get_admin_user)):
    """Manually trigger sync for a configuration"""
    config = await db.sheet_configs.find_one({"config_id": config_id})
    if not config:
        raise HTTPException(status_code=404, detail="Configuraci\u00f3n no encontrada")
    
    try:
        # Fetch fresh data
        data = await fetch_sheet_data(config["sheet_id"], config.get("gid", "0"))
        
        if not data:
            raise HTTPException(status_code=400, detail="No se encontraron datos")
        
        # Get mapping
        mapeo = config.get("mapeo_columnas", [])
        fila_inicio = config.get("fila_inicio_datos", 2) - 1  # 0-indexed
        
        # Get existing records (OPTIMIZED: only fetch needed fields for comparison)
        existing = await db.estudiantes_sincronizados.find(
            {"config_id": config_id, "estado": "activo"},
            {"_id": 0, "sync_id": 1, "fila_original": 1, "datos": 1, "hash_datos": 1}
        ).to_list(10000)
        existing_by_row = {e["fila_original"]: e for e in existing}
        
        cambios: List[CambioRegistro] = []
        nuevos = 0
        modificados = 0
        
        # Process each data row
        for row_idx, row in enumerate(data[fila_inicio:], start=fila_inicio + 1):
            # Skip empty rows
            if not any(cell.strip() for cell in row):
                continue
            
            # Map data according to config
            datos_mapeados = {}
            for col_map in mapeo:
                col_idx = int(col_map["columna_id"])
                if col_idx < len(row):
                    datos_mapeados[col_map["campo_destino"]] = row[col_idx].strip()
            
            hash_nuevo = calculate_hash(datos_mapeados)
            
            if row_idx in existing_by_row:
                # Check for changes
                existing_record = existing_by_row[row_idx]
                if existing_record["hash_datos"] != hash_nuevo:
                    # Record modified
                    cambios.append(CambioRegistro(
                        tipo="modificado",
                        sync_id=existing_record["sync_id"],
                        valor_anterior=existing_record["datos"],
                        valor_nuevo=datos_mapeados
                    ))
                    
                    await db.estudiantes_sincronizados.update_one(
                        {"sync_id": existing_record["sync_id"]},
                        {"$set": {
                            "datos": datos_mapeados,
                            "hash_datos": hash_nuevo,
                            "fecha_sincronizacion": datetime.now(timezone.utc)
                        }}
                    )
                    modificados += 1
                
                # Remove from existing dict to track deletions
                del existing_by_row[row_idx]
            else:
                # New record
                new_record = EstudianteSincronizado(
                    config_id=config_id,
                    fila_original=row_idx,
                    datos=datos_mapeados,
                    hash_datos=hash_nuevo
                )
                doc = new_record.model_dump()
                doc["fecha_sincronizacion"] = doc["fecha_sincronizacion"].isoformat()
                
                await db.estudiantes_sincronizados.insert_one(doc)
                
                cambios.append(CambioRegistro(
                    tipo="nuevo",
                    sync_id=new_record.sync_id,
                    valor_nuevo=datos_mapeados
                ))
                nuevos += 1
        
        # Mark remaining as deleted
        eliminados = 0
        for row_idx, record in existing_by_row.items():
            await db.estudiantes_sincronizados.update_one(
                {"sync_id": record["sync_id"]},
                {"$set": {"estado": "eliminado"}}
            )
            cambios.append(CambioRegistro(
                tipo="eliminado",
                sync_id=record["sync_id"],
                valor_anterior=record["datos"]
            ))
            eliminados += 1
        
        # Update config status
        total_activos = await db.estudiantes_sincronizados.count_documents(
            {"config_id": config_id, "estado": "activo"}
        )
        
        await db.sheet_configs.update_one(
            {"config_id": config_id},
            {"$set": {
                "ultima_sincronizacion": datetime.now(timezone.utc).isoformat(),
                "total_registros": total_activos,
                "estado": "activo",
                "mensaje_error": None
            }}
        )
        
        return {
            "success": True,
            "nuevos": nuevos,
            "modificados": modificados,
            "eliminados": eliminados,
            "total_activos": total_activos,
            "cambios": [c.model_dump() for c in cambios[:50]]  # Limit response size
        }
        
    except httpx.RequestError as e:
        # Update config with error
        await db.sheet_configs.update_one(
            {"config_id": config_id},
            {"$set": {
                "estado": "error",
                "mensaje_error": str(e)
            }}
        )
        raise HTTPException(status_code=400, detail=f"Error de sincronizaci\u00f3n: {str(e)}")


@router.get("/configs/{config_id}/data")
async def get_synced_data(
    config_id: str,
    estado: Optional[str] = "activo",
    limite: int = 100,
    admin: dict = Depends(get_admin_user)
):
    """Get synced data for a configuration"""
    query = {"config_id": config_id}
    if estado:
        query["estado"] = estado
    
    data = await db.estudiantes_sincronizados.find(query, {"_id": 0}).to_list(limite)
    total = await db.estudiantes_sincronizados.count_documents(query)
    
    return {
        "data": data,
        "total": total
    }


@router.get("/configs/{config_id}/preview")
async def preview_sheet_data(config_id: str, admin: dict = Depends(get_admin_user)):
    """Preview current sheet data without syncing"""
    config = await db.sheet_configs.find_one({"config_id": config_id})
    if not config:
        raise HTTPException(status_code=404, detail="Configuraci\u00f3n no encontrada")
    
    try:
        data = await fetch_sheet_data(config["sheet_id"], config.get("gid", "0"))
        
        if not data:
            return {"preview": [], "total": 0}
        
        # Get header row
        header_row = config.get("fila_encabezado", 1) - 1
        headers = data[header_row] if len(data) > header_row else []
        
        # Get data rows (preview first 20)
        fila_inicio = config.get("fila_inicio_datos", 2) - 1
        preview_rows = data[fila_inicio:fila_inicio + 20]
        
        # Format as objects
        preview = []
        for row in preview_rows:
            if any(cell.strip() for cell in row):
                row_data = {}
                for i, header in enumerate(headers):
                    if header.strip() and i < len(row):
                        row_data[header.strip()] = row[i]
                preview.append(row_data)
        
        return {
            "headers": headers,
            "preview": preview,
            "total_rows": len(data) - fila_inicio
        }
        
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Error al conectar: {str(e)}")
