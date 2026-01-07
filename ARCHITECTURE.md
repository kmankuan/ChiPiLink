# 🏗️ Arquitectura Microservices-Ready

## Visión General

La Super App ChiPi Link está construida con una arquitectura **Monolito Modular** preparada para escalar a microservicios.

## Estructura de Módulos

```
/app/backend/
├── core/                    # Infraestructura compartida
│   ├── events/             # Event Bus para comunicación
│   │   ├── event_bus.py    # Pub/Sub asíncrono
│   │   └── __init__.py
│   ├── base/               # Clases base
│   │   ├── repository.py   # BaseRepository
│   │   └── service.py      # BaseService
│   ├── database.py         # Conexión MongoDB
│   ├── auth.py             # Autenticación JWT
│   └── config.py           # Configuración
│
├── modules/                 # Módulos de negocio
│   ├── pinpanclub/         # ⭐ Módulo ejemplo (microservices-ready)
│   │   ├── models/         # Schemas Pydantic
│   │   ├── repositories/   # Acceso a datos
│   │   ├── services/       # Lógica de negocio
│   │   ├── events/         # Event handlers
│   │   ├── routes/         # API endpoints
│   │   └── __init__.py     # Inicialización
│   ├── auth/
│   ├── store/
│   └── ...
│
└── main.py                  # Entry point
```

## Patrón de Módulo (Microservices-Ready)

Cada módulo sigue esta estructura:

```
modules/[nombre_modulo]/
├── models/
│   ├── schemas.py          # Pydantic models (contratos)
│   └── __init__.py
├── repositories/
│   ├── [entity]_repository.py  # Acceso a DB
│   └── __init__.py
├── services/
│   ├── [entity]_service.py     # Lógica de negocio
│   └── __init__.py
├── events/
│   ├── handlers.py         # Event listeners
│   └── __init__.py
├── routes/
│   ├── [resource].py       # API endpoints
│   └── __init__.py
└── __init__.py             # Exports + init_module()
```

## Event Bus

Sistema de eventos interno para comunicación desacoplada entre módulos.

### Uso

```python
from core.events import event_bus, Event, PinpanClubEvents

# Publicar evento
await event_bus.publish(Event(
    event_type=PinpanClubEvents.MATCH_CREATED,
    payload={"partido_id": "123"},
    source_module="pinpanclub"
))

# Suscribirse a eventos
@event_bus.subscribe("pinpanclub.match.*")
async def on_match_event(event: Event):
    print(f"Match event: {event.event_type}")
```

### Tipos de Eventos Definidos

- `PinpanClubEvents`: Eventos del módulo PinpanClub
- `StoreEvents`: Eventos del módulo Store
- `AuthEvents`: Eventos del módulo Auth

## BaseRepository

Abstrae el acceso a la base de datos:

```python
from core.base import BaseRepository
from core.database import db

class PlayerRepository(BaseRepository):
    COLLECTION_NAME = "pingpong_players"
    ID_FIELD = "jugador_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def get_rankings(self, limit: int = 50):
        return await self.find_many(
            query={"activo": True},
            sort=[("elo_rating", -1)],
            limit=limit
        )
```

## BaseService

Lógica de negocio con acceso al Event Bus:

```python
from core.base import BaseService
from core.events import PinpanClubEvents

class PlayerService(BaseService):
    MODULE_NAME = "pinpanclub"
    
    async def create_player(self, data):
        player = await self.repository.create(data)
        
        # Emitir evento
        await self.emit_event(
            PinpanClubEvents.PLAYER_CREATED,
            {"jugador_id": player["jugador_id"]}
        )
        
        return player
```

## Migración a Microservicios

### Paso 1: Extraer Módulo
```bash
# Copiar módulo a nuevo repositorio
cp -r modules/pinpanclub/ ../pinpanclub-service/app/
```

### Paso 2: Añadir FastAPI independiente
```python
# pinpanclub-service/main.py
from fastapi import FastAPI
from app.routes import router

app = FastAPI(title="PinpanClub Service")
app.include_router(router, prefix="/api")
```

### Paso 3: Conectar Event Bus externo
```python
# Reemplazar event_bus local por Redis/RabbitMQ
from core.events import RedisEventBus
event_bus = RedisEventBus(redis_url="redis://...")
```

### Paso 4: API Gateway
```yaml
# docker-compose.yml
services:
  gateway:
    image: kong:latest
    ports:
      - "8000:8000"
  
  pinpanclub:
    build: ./pinpanclub-service
    ports:
      - "8001:8001"
  
  store:
    build: ./store-service
    ports:
      - "8002:8002"
```

## Beneficios de esta Arquitectura

1. **Separación clara de responsabilidades**
   - Models: Contratos de datos
   - Repositories: Acceso a DB (único punto de contacto)
   - Services: Lógica de negocio
   - Routes: API endpoints

2. **Testeable**
   - Cada capa se puede mockear
   - Unit tests por servicio
   - Integration tests por módulo

3. **Escalable**
   - Módulos independientes
   - Event-driven communication
   - Preparado para Docker/Kubernetes

4. **Mantenible**
   - Código organizado
   - Cambios localizados
   - Fácil onboarding

## Módulos Actuales

| Módulo | Estado | Arquitectura |
|--------|--------|--------------|
| PinpanClub | ✅ Refactorizado | Microservices-Ready |
| Auth | 🔄 Legacy | Pendiente refactor |
| Store | 🔄 Legacy | Pendiente refactor |
| Community | 🔄 Legacy | Pendiente refactor |

---

*Documentación creada: Enero 2026*
*Próximo paso: Refactorizar módulo Store siguiendo el patrón PinpanClub*
