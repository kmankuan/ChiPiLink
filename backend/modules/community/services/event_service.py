"""
Community Module - Event Service
Business logic para eventos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.base import BaseService
from core.events import CommunityEvents
from ..repositories import EventRepository
from ..models import Event, EventCreate, EventUpdate


class EventService(BaseService):
    """
    Service for management of eventos de comunidad.
    """
    
    MODULE_NAME = "community"
    
    def __init__(self):
        super().__init__()
        self.repository = EventRepository()
    
    async def get_events(
        self,
        upcoming: bool = True,
        limit: int = 10
    ) -> List[Event]:
        """Get eventos"""
        if upcoming:
            results = await self.repository.get_upcoming_events(limit=limit)
        else:
            results = await self.repository.get_past_events(limit=limit)
        return [Event(**r) for r in results]
    
    async def get_event(self, evento_id: str) -> Optional[Event]:
        """Get evento by ID"""
        result = await self.repository.get_by_id(evento_id)
        return Event(**result) if result else None
    
    async def get_all_events(self, limit: int = 100) -> List[Event]:
        """Get todos los eventos (admin)"""
        results = await self.repository.get_all_events(limit=limit)
        return [Event(**r) for r in results]
    
    async def create_event(self, data: EventCreate) -> Event:
        """
        Crear nuevo evento.
        Emite evento: community.event.created
        """
        event_dict = data.model_dump()
        
        # Convert fechas a ISO string
        for field in ["fecha_inicio", "fecha_fin"]:
            if event_dict.get(field) and isinstance(event_dict[field], datetime):
                event_dict[field] = event_dict[field].isoformat()
        
        result = await self.repository.create(event_dict)
        
        await self.emit_event(
            CommunityEvents.EVENT_CREATED,
            {
                "evento_id": result["evento_id"],
                "titulo": result["titulo"]
            }
        )
        
        self.log_info(f"Event created: {result['evento_id']}")
        return Event(**result)
    
    async def update_event(self, evento_id: str, data: EventUpdate) -> Optional[Event]:
        """
        Actualizar evento.
        Emite evento: community.event.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_event(evento_id)
        
        # Convert fechas
        for field in ["fecha_inicio", "fecha_fin"]:
            if update_data.get(field) and isinstance(update_data[field], datetime):
                update_data[field] = update_data[field].isoformat()
        
        success = await self.repository.update_event(evento_id, update_data)
        
        if success:
            await self.emit_event(
                CommunityEvents.EVENT_UPDATED,
                {"evento_id": evento_id, "updated_fields": list(update_data.keys())}
            )
            return await self.get_event(evento_id)
        
        return None
    
    async def register_for_event(
        self,
        evento_id: str,
        usuario_id: str,
        nombre: str
    ) -> bool:
        """Register usuario para evento"""
        event = await self.repository.get_by_id(evento_id)
        
        if not event:
            raise ValueError("Evento not found")
        
        if not event.get("requiere_inscripcion"):
            raise ValueError("Este evento no requiere inscripción")
        
        # Verify capacidad
        inscripciones = event.get("inscripciones", [])
        max_participantes = event.get("max_participantes")
        
        if max_participantes and len(inscripciones) >= max_participantes:
            raise ValueError("Evento completo")
        
        # Verify si ya está inscrito
        if any(i.get("usuario_id") == usuario_id for i in inscripciones):
            raise ValueError("Ya está inscrito en este evento")
        
        inscription = {
            "usuario_id": usuario_id,
            "nombre": nombre,
            "fecha": datetime.now(timezone.utc).isoformat()
        }
        
        return await self.repository.add_inscription(evento_id, inscription)
    
    async def delete_event(self, evento_id: str) -> bool:
        """
        Eliminar evento.
        Emite evento: community.event.deleted
        """
        success = await self.repository.delete_event(evento_id)
        
        if success:
            await self.emit_event(
                CommunityEvents.EVENT_DELETED,
                {"evento_id": evento_id}
            )
        
        return success


# Service singleton instance
event_service = EventService()
