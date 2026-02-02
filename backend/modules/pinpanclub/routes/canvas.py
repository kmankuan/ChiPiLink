"""
Ping Pong Canvas Layouts - API para gestionar layouts de canvas personalizables
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/canvas", tags=["PinpanClub Canvas"])

# ============== MODELS ==============

class LayoutItem(BaseModel):
    """Un widget individual en el layout"""
    i: str  # Widget key
    x: int  # Grid X position
    y: int  # Grid Y position
    w: int  # Width in grid units
    h: int  # Height in grid units
    minW: Optional[int] = 2
    minH: Optional[int] = 2
    maxW: Optional[int] = 12
    maxH: Optional[int] = 8

class CanvasSettings(BaseModel):
    """Configuración del canvas"""
    cols: int = 12
    rowHeight: int = 80
    showQR: bool = True

class LayoutCreate(BaseModel):
    """Create un nuevo layout"""
    name: str
    layout: List[LayoutItem]
    widget_matches: Dict[str, str] = {}  # widget_key -> match_id
    settings: Optional[CanvasSettings] = None
    is_default: bool = False

class LayoutUpdate(BaseModel):
    """Update un layout existente"""
    name: Optional[str] = None
    layout: Optional[List[LayoutItem]] = None
    widget_matches: Optional[Dict[str, str]] = None
    settings: Optional[CanvasSettings] = None
    is_default: Optional[bool] = None

# ============== ENDPOINTS ==============

@router.post("/layouts", response_model=dict)
async def crear_layout(layout_data: LayoutCreate):
    """Create un nuevo layout de canvas"""
    from main import db
    
    layout_id = f"layout_{uuid.uuid4().hex[:12]}"
    
    # If this is set as default, unset other defaults
    if layout_data.is_default:
        await db.pingpong_canvas_layouts.update_many(
            {"is_default": True},
            {"$set": {"is_default": False}}
        )
    
    doc = {
        "layout_id": layout_id,
        "name": layout_data.name,
        "layout": [item.model_dump() for item in layout_data.layout],
        "widget_matches": layout_data.widget_matches,
        "settings": layout_data.settings.model_dump() if layout_data.settings else {
            "cols": 12,
            "rowHeight": 80,
            "showQR": True
        },
        "is_default": layout_data.is_default,
        "fecha_creacion": datetime.now(timezone.utc),
        "fecha_actualizacion": datetime.now(timezone.utc)
    }
    
    await db.pingpong_canvas_layouts.insert_one(doc)
    doc.pop("_id", None)
    
    return {"success": True, "layout": doc}


@router.get("/layouts", response_model=List[dict])
async def listar_layouts():
    """List todos los layouts guardados"""
    from main import db
    
    layouts = await db.pingpong_canvas_layouts.find(
        {},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(50)
    
    return layouts


@router.get("/layouts/{layout_id}", response_model=dict)
async def obtener_layout(layout_id: str):
    """Get un layout specific"""
    from main import db
    
    layout = await db.pingpong_canvas_layouts.find_one(
        {"layout_id": layout_id},
        {"_id": 0}
    )
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    return layout


@router.put("/layouts/{layout_id}", response_model=dict)
async def actualizar_layout(layout_id: str, update: LayoutUpdate):
    """Update un layout existente"""
    from main import db
    
    update_data = {}
    
    if update.name is not None:
        update_data["name"] = update.name
    if update.layout is not None:
        update_data["layout"] = [item.model_dump() for item in update.layout]
    if update.widget_matches is not None:
        update_data["widget_matches"] = update.widget_matches
    if update.settings is not None:
        update_data["settings"] = update.settings.model_dump()
    if update.is_default is not None:
        update_data["is_default"] = update.is_default
        if update.is_default:
            # Unset other defaults
            await db.pingpong_canvas_layouts.update_many(
                {"layout_id": {"$ne": layout_id}, "is_default": True},
                {"$set": {"is_default": False}}
            )
    
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    result = await db.pingpong_canvas_layouts.update_one(
        {"layout_id": layout_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    layout = await db.pingpong_canvas_layouts.find_one(
        {"layout_id": layout_id},
        {"_id": 0}
    )
    
    return {"success": True, "layout": layout}


@router.delete("/layouts/{layout_id}")
async def eliminar_layout(layout_id: str):
    """Delete un layout"""
    from main import db
    
    result = await db.pingpong_canvas_layouts.delete_one({"layout_id": layout_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    return {"success": True, "message": "Layout eliminado"}


@router.post("/layouts/{layout_id}/set-default")
async def establecer_layout_default(layout_id: str):
    """Establecer un layout como predeterminado"""
    from main import db
    
    # Unset all other defaults
    await db.pingpong_canvas_layouts.update_many(
        {},
        {"$set": {"is_default": False}}
    )
    
    # Set this as default
    result = await db.pingpong_canvas_layouts.update_one(
        {"layout_id": layout_id},
        {"$set": {"is_default": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    return {"success": True, "message": "Layout establecido como predeterminado"}


# ============== PRESETS ==============

@router.get("/presets", response_model=List[dict])
async def obtener_presets():
    """Get layouts preconfigurados"""
    presets = [
        {
            "preset_id": "2x3",
            "name": "2x3 (6 mesas)",
            "description": "Layout para 6 mesas en grid 2x3",
            "layout": [
                {"i": "w1", "x": 0, "y": 0, "w": 6, "h": 3, "minW": 2, "minH": 2},
                {"i": "w2", "x": 6, "y": 0, "w": 6, "h": 3, "minW": 2, "minH": 2},
                {"i": "w3", "x": 0, "y": 3, "w": 6, "h": 3, "minW": 2, "minH": 2},
                {"i": "w4", "x": 6, "y": 3, "w": 6, "h": 3, "minW": 2, "minH": 2},
                {"i": "w5", "x": 0, "y": 6, "w": 6, "h": 3, "minW": 2, "minH": 2},
                {"i": "w6", "x": 6, "y": 6, "w": 6, "h": 3, "minW": 2, "minH": 2},
            ],
            "settings": {"cols": 12, "rowHeight": 80}
        },
        {
            "preset_id": "featured",
            "name": "1 Principal + 4 Secundarias",
            "description": "Una mesa destacada grande y 4 mesas secundarias",
            "layout": [
                {"i": "main", "x": 0, "y": 0, "w": 8, "h": 5, "minW": 4, "minH": 3},
                {"i": "s1", "x": 8, "y": 0, "w": 4, "h": 2, "minW": 2, "minH": 2},
                {"i": "s2", "x": 8, "y": 2, "w": 4, "h": 2, "minW": 2, "minH": 2},
                {"i": "s3", "x": 0, "y": 5, "w": 4, "h": 2, "minW": 2, "minH": 2},
                {"i": "s4", "x": 4, "y": 5, "w": 4, "h": 2, "minW": 2, "minH": 2},
            ],
            "settings": {"cols": 12, "rowHeight": 80}
        },
        {
            "preset_id": "tournament",
            "name": "Torneo (2 Finales)",
            "description": "2 mesas principales para finales o semifinales",
            "layout": [
                {"i": "final1", "x": 0, "y": 0, "w": 6, "h": 5, "minW": 4, "minH": 3},
                {"i": "final2", "x": 6, "y": 0, "w": 6, "h": 5, "minW": 4, "minH": 3},
            ],
            "settings": {"cols": 12, "rowHeight": 100}
        },
        {
            "preset_id": "single",
            "name": "Partido Único",
            "description": "Una sola mesa en pantalla completa",
            "layout": [
                {"i": "main", "x": 0, "y": 0, "w": 12, "h": 6, "minW": 6, "minH": 4},
            ],
            "settings": {"cols": 12, "rowHeight": 120}
        },
        {
            "preset_id": "4x2",
            "name": "4x2 (8 mesas)",
            "description": "Layout para 8 mesas en grid 4x2",
            "layout": [
                {"i": "w1", "x": 0, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w2", "x": 3, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w3", "x": 6, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w4", "x": 9, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w5", "x": 0, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w6", "x": 3, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w7", "x": 6, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2},
                {"i": "w8", "x": 9, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2},
            ],
            "settings": {"cols": 12, "rowHeight": 80}
        }
    ]
    
    return presets


@router.post("/layouts/from-preset/{preset_id}")
async def crear_desde_preset(preset_id: str, name: str = "Nuevo Layout"):
    """Create un layout a partir de un preset"""
    from main import db
    
    presets = {
        "2x3": {
            "layout": [
                {"i": "w1", "x": 0, "y": 0, "w": 6, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w2", "x": 6, "y": 0, "w": 6, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w3", "x": 0, "y": 3, "w": 6, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w4", "x": 6, "y": 3, "w": 6, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w5", "x": 0, "y": 6, "w": 6, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w6", "x": 6, "y": 6, "w": 6, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
            ],
            "settings": {"cols": 12, "rowHeight": 80, "showQR": True}
        },
        "featured": {
            "layout": [
                {"i": "main", "x": 0, "y": 0, "w": 8, "h": 5, "minW": 4, "minH": 3, "maxW": 12, "maxH": 8},
                {"i": "s1", "x": 8, "y": 0, "w": 4, "h": 2, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "s2", "x": 8, "y": 2, "w": 4, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "s3", "x": 0, "y": 5, "w": 4, "h": 2, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "s4", "x": 4, "y": 5, "w": 4, "h": 2, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
            ],
            "settings": {"cols": 12, "rowHeight": 80, "showQR": True}
        },
        "tournament": {
            "layout": [
                {"i": "final1", "x": 0, "y": 0, "w": 6, "h": 5, "minW": 4, "minH": 3, "maxW": 12, "maxH": 8},
                {"i": "final2", "x": 6, "y": 0, "w": 6, "h": 5, "minW": 4, "minH": 3, "maxW": 12, "maxH": 8},
            ],
            "settings": {"cols": 12, "rowHeight": 100, "showQR": True}
        },
        "single": {
            "layout": [
                {"i": "main", "x": 0, "y": 0, "w": 12, "h": 6, "minW": 6, "minH": 4, "maxW": 12, "maxH": 8},
            ],
            "settings": {"cols": 12, "rowHeight": 120, "showQR": True}
        },
        "4x2": {
            "layout": [
                {"i": "w1", "x": 0, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w2", "x": 3, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w3", "x": 6, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w4", "x": 9, "y": 0, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w5", "x": 0, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w6", "x": 3, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w7", "x": 6, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
                {"i": "w8", "x": 9, "y": 3, "w": 3, "h": 3, "minW": 2, "minH": 2, "maxW": 12, "maxH": 8},
            ],
            "settings": {"cols": 12, "rowHeight": 80, "showQR": True}
        }
    }
    
    if preset_id not in presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    preset = presets[preset_id]
    layout_id = f"layout_{uuid.uuid4().hex[:12]}"
    
    doc = {
        "layout_id": layout_id,
        "name": name,
        "layout": preset["layout"],
        "widget_matches": {},
        "settings": preset["settings"],
        "is_default": False,
        "preset_origin": preset_id,
        "fecha_creacion": datetime.now(timezone.utc),
        "fecha_actualizacion": datetime.now(timezone.utc)
    }
    
    await db.pingpong_canvas_layouts.insert_one(doc)
    doc.pop("_id", None)
    
    return {"success": True, "layout": doc}
