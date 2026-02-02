"""
Task Supervisor Routes - Endpoints para el Supervisor de Tareas

PLACEHOLDER - Endpoints a implementar:
- GET /task-supervisor/status - Estado del module
- GET/PUT /task-supervisor/config - Configuración
- GET /task-supervisor/display - Datos para pantalla grande
- GET/POST /task-supervisor/people - Personas supervisadas
- GET /task-supervisor/tasks - Tareas sincronizadas de Monday.com
- POST /task-supervisor/tasks/{id}/complete - Marcar tarea completada
- POST /task-supervisor/announce - Generar anuncio de voz
- POST /task-supervisor/sync - Sincronizar con Monday.com
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

from core.database import db
from core.auth import get_admin_user, get_current_user
from .models import TaskSupervisorConfig, SupervisedTask

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/task-supervisor", tags=["Task Supervisor"])


# ============== STATUS ==============

@router.get("/status")
async def get_supervisor_status():
    """Get Task Supervisor module status"""
    config = await db.app_config.find_one({"config_key": "task_supervisor"}, {"_id": 0})
    
    return {
        "module": "task_supervisor",
        "status": "placeholder",
        "configured": config is not None,
        "message": "Task Supervisor - Pantalla de Tareas con Asistente de Voz",
        "planned_features": [
            "Pantalla grande tipo kiosk con tareas de Monday.com",
            "Anuncios por voz (TTS) para recordar tareas",
            "Comandos de voz para marcar tareas completadas",
            "Recordatorios automatics inteligentes",
            "Gamificación con puntos y logros",
            "Supervisión para childs en casa y estudiantes",
            "Sincronización bidireccional con Monday.com",
            "Reportes de productividad para padres/maestros"
        ],
        "required_integrations": [
            "Monday.com (ya integrado) - Para obtener tareas",
            "TTS (OpenAI/ElevenLabs) - Para anuncios de voz",
            "(Opcional) STT - Para comandos de voz"
        ]
    }


# ============== CONFIGURATION ==============

@router.get("/config")
async def get_supervisor_config(admin: dict = Depends(get_admin_user)):
    """Get Task Supervisor configuration (admin only)"""
    config = await db.app_config.find_one({"config_key": "task_supervisor"}, {"_id": 0})
    
    if not config:
        return TaskSupervisorConfig().model_dump()
    
    return config.get("value", TaskSupervisorConfig().model_dump())


@router.put("/config")
async def update_supervisor_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update Task Supervisor configuration"""
    await db.app_config.update_one(
        {"config_key": "task_supervisor"},
        {"$set": {
            "config_key": "task_supervisor",
            "value": config,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Configuración del Task Supervisor actualizada"}


# ============== DISPLAY (KIOSK MODE) ==============

@router.get("/display")
async def get_display_data(person_id: Optional[str] = None):
    """Get data for kiosk display - PLACEHOLDER"""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    # Query for today's tasks
    query = {}
    if person_id:
        query["asignado_a"] = person_id
    
    tasks = await db.supervised_tasks.find(query, {"_id": 0}).sort([
        ("prioridad", -1),
        ("hora_programada", 1)
    ]).to_list(20)
    
    # Get people if no filter
    people = []
    if not person_id:
        people = await db.supervised_people.find({"activo": True}, {"_id": 0}).to_list(20)
    
    return {
        "timestamp": now.isoformat(),
        "fecha": today,
        "tareas": tasks,
        "personas": people,
        "stats": {
            "total": len(tasks),
            "completadas": len([t for t in tasks if t.get("estado") == "completada"]),
            "en_progreso": len([t for t in tasks if t.get("estado") == "en_progreso"]),
            "pendientes": len([t for t in tasks if t.get("estado") == "pendiente"])
        },
        "message": "Display data - Placeholder. Requiere sincronización con Monday.com."
    }


# ============== PEOPLE ==============

@router.get("/people")
async def get_supervised_people(admin: dict = Depends(get_admin_user)):
    """Get supervised people (children/students)"""
    people = await db.supervised_people.find({"activo": True}, {"_id": 0}).to_list(50)
    return people


@router.post("/people")
async def create_supervised_person(person: dict, admin: dict = Depends(get_admin_user)):
    """Create supervised person"""
    doc = {
        "person_id": f"person_{uuid.uuid4().hex[:12]}",
        "nombre": person.get("nombre"),
        "apodo": person.get("apodo"),
        "foto_url": person.get("foto_url"),
        "tipo": person.get("tipo", "nino"),
        "edad": person.get("edad"),
        "monday_user_id": person.get("monday_user_id"),
        "monday_assignee_name": person.get("monday_assignee_name"),
        "voz_preferida": person.get("voz_preferida"),
        "puntos_totales": 0,
        "racha_dias": 0,
        "logros": [],
        "activo": True,
        "fecha_registro": datetime.now(timezone.utc)
    }
    await db.supervised_people.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/people/{person_id}")
async def update_supervised_person(
    person_id: str, 
    person: dict, 
    admin: dict = Depends(get_admin_user)
):
    """Update supervised person"""
    update_data = {k: v for k, v in person.items() if k not in ["person_id", "_id"]}
    
    result = await db.supervised_people.update_one(
        {"person_id": person_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    updated = await db.supervised_people.find_one({"person_id": person_id}, {"_id": 0})
    return updated


# ============== TASKS ==============

@router.get("/tasks")
async def get_supervised_tasks(
    person_id: Optional[str] = None,
    estado: Optional[str] = None,
    fecha: Optional[str] = None,  # YYYY-MM-DD
    admin: dict = Depends(get_admin_user)
):
    """Get supervised tasks - PLACEHOLDER"""
    query = {}
    if person_id:
        query["asignado_a"] = person_id
    if estado:
        query["estado"] = estado
    
    tasks = await db.supervised_tasks.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(100)
    
    return {
        "tasks": tasks,
        "total": len(tasks),
        "message": "Tareas - Placeholder. Use /sync para sincronizar con Monday.com."
    }


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    """Mark task as completed - PLACEHOLDER"""
    now = datetime.now(timezone.utc)
    
    task = await db.supervised_tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Tarea not found")
    
    # Calculate if completed on time
    on_time = True
    if task.get("fecha_limite"):
        limite = task["fecha_limite"]
        if isinstance(limite, str):
            limite = datetime.fromisoformat(limite)
        on_time = now <= limite
    
    # Calculate points
    puntos = 10  # Base points
    if on_time and task.get("duracion_estimada_minutos"):
        puntos += 5  # Bonus for on-time completion
    
    await db.supervised_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "estado": "completada",
            "porcentaje_completado": 100,
            "fecha_fin_real": now,
            "puntos_otorgados": puntos,
            "bonus_tiempo": on_time
        }}
    )
    
    # Update person's points if assigned
    if task.get("asignado_a"):
        await db.supervised_people.update_one(
            {"person_id": task["asignado_a"]},
            {"$inc": {"puntos_totales": puntos}}
        )
    
    return {
        "success": True,
        "task_id": task_id,
        "estado": "completada",
        "puntos_otorgados": puntos,
        "bonus_tiempo": on_time,
        "message": "¡Tarea completada!" + (" ¡Bonus por tiempo!" if on_time else "")
    }


# ============== VOICE ANNOUNCEMENTS (PLACEHOLDER) ==============

@router.post("/announce")
async def create_announcement(data: dict, admin: dict = Depends(get_admin_user)):
    """Create voice announcement - PLACEHOLDER"""
    announcement = {
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "tipo": data.get("tipo", "general"),
        "texto": data.get("texto"),
        "para_persona_id": data.get("person_id"),
        "para_persona_nombre": data.get("person_nombre"),
        "programado_para": data.get("programado_para"),
        "estado": "pendiente",
        "audio_url": None,
        "fecha_creacion": datetime.now(timezone.utc)
    }
    
    await db.voice_announcements.insert_one(announcement)
    del announcement["_id"]
    
    return {
        "success": True,
        "announcement": announcement,
        "message": "Anuncio creado - Placeholder. Requiere integración TTS para generar audio."
    }


@router.get("/announcements")
async def get_announcements(
    estado: Optional[str] = None,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """Get voice announcements"""
    query = {}
    if estado:
        query["estado"] = estado
    
    announcements = await db.voice_announcements.find(query, {"_id": 0}).sort(
        "fecha_creacion", -1
    ).to_list(limit)
    
    return announcements


# ============== SYNC WITH MONDAY.COM (PLACEHOLDER) ==============

@router.post("/sync")
async def sync_with_monday(admin: dict = Depends(get_admin_user)):
    """Sync tasks with Monday.com - PLACEHOLDER"""
    config = await db.app_config.find_one({"config_key": "task_supervisor"})
    
    if not config or not config.get("value", {}).get("monday_board_id"):
        return {
            "success": False,
            "message": "Monday.com Board ID no configurado en Task Supervisor"
        }
    
    # TODO: Implement actual sync with Monday.com API
    # This would fetch items from the configured board and update local tasks
    
    return {
        "success": False,
        "message": "Sincronización con Monday.com - Placeholder. Implementación pendiente.",
        "steps": [
            "1. Configurar monday_board_id en Task Supervisor config",
            "2. Obtener items del board via Monday.com API",
            "3. Mapear items a tareas supervisadas",
            "4. Actualizar estado bidireccional"
        ]
    }


# ============== PROGRESS/REPORTS ==============

@router.get("/progress/{person_id}")
async def get_person_progress(
    person_id: str,
    dias: int = 7,
    admin: dict = Depends(get_admin_user)
):
    """Get progress for a supervised person"""
    person = await db.supervised_people.find_one({"person_id": person_id}, {"_id": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Get daily progress for last N days
    progress = await db.daily_progress.find(
        {"person_id": person_id},
        {"_id": 0}
    ).sort("fecha", -1).to_list(dias)
    
    # Get recent tasks
    tasks = await db.supervised_tasks.find(
        {"asignado_a": person_id},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(20)
    
    return {
        "persona": person,
        "progreso_diario": progress,
        "tareas_recientes": tasks,
        "estadisticas": {
            "puntos_totales": person.get("puntos_totales", 0),
            "racha_dias": person.get("racha_dias", 0),
            "logros": person.get("logros", [])
        }
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """Get points leaderboard"""
    people = await db.supervised_people.find(
        {"activo": True},
        {"_id": 0}
    ).sort("puntos_totales", -1).to_list(20)
    
    for i, person in enumerate(people):
        person["posicion"] = i + 1
    
    return people
