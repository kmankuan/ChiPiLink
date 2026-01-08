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

| Módulo | Estado | Arquitectura | Endpoints Nuevos |
|--------|--------|--------------|------------------|
| PinpanClub | ✅ Refactorizado | Microservices-Ready | `/api/pinpanclub/*` |
| Store | ✅ Refactorizado | Microservices-Ready | `/api/store/*` |
| Auth | ✅ Refactorizado | Microservices-Ready | `/api/auth-v2/*` |
| Community | ✅ Refactorizado | Microservices-Ready | `/api/community-v2/*` |

## Frontend Migration

El frontend ha sido actualizado para usar los nuevos endpoints. Se creó un archivo de configuración centralizado en `/app/frontend/src/config/api.js` que permite alternar entre endpoints legacy y nuevos mediante el flag `USE_NEW_ENDPOINTS`.

### Archivos Actualizados
- `src/config/api.js` - Configuración centralizada de endpoints
- `src/contexts/AuthContext.js` - Usa nuevos endpoints Auth
- `src/pages/CommunityLanding.jsx` - Usa nuevos endpoints Community
- `src/pages/Catalog.jsx` - Usa nuevos endpoints Store
- `modules/pingpong/config/api.js` - Configuración centralizada PinpanClub

---

## Fase 2: Separación de Schemas de Base de Datos

### Convención de Nombres de Colecciones

Cada módulo tiene su propio prefijo para las colecciones de MongoDB:

| Módulo | Prefijo | Colecciones |
|--------|---------|-------------|
| **Auth** | `auth_` | `clientes` (users), `user_sessions` |
| **Store** | `store_` | `libros` (products), `pedidos` (orders), `categorias` |
| **PinpanClub** | `pingpong_` | `pingpong_players`, `pingpong_matches`, `pingpong_sponsors`, `pingpong_config` |
| **Community** | `community_` | `community_posts`, `community_events`, `gallery_albums`, `community_comments` |
| **Shared** | (ninguno) | `app_config`, `site_config`, `notificaciones`, `translations` |

### Colecciones Actuales en MongoDB

```
├── Auth Module
│   └── clientes (10 users)
│
├── Store Module
│   ├── libros (6 products)
│   ├── pedidos (0 orders)
│   ├── categorias (1 category)
│   └── estudiantes_sincronizados (0)
│
├── PinpanClub Module
│   ├── pingpong_players (4)
│   ├── pingpong_matches (4)
│   ├── pingpong_sponsors (5)
│   └── pingpong_config (1)
│
├── Community Module
│   └── (collections will be created on first use)
│
└── Shared/Core
    ├── app_config (4)
    ├── site_config (1)
    ├── notificaciones (4)
    ├── translations (366)
    └── paginas (1)
```

### Beneficios de la Separación

1. **Aislamiento de datos** - Cada módulo tiene sus propias colecciones
2. **Facilita migración** - Exportar colecciones por prefijo es más fácil
3. **Permisos granulares** - Se pueden asignar permisos por módulo
4. **Backup selectivo** - Respaldar solo las colecciones de un módulo

---

*Documentación creada: Enero 2026*
*Estado actual: Fase 1 completada + Frontend migrado + Fase 2 documentada*
*Próximo paso: Fase 3 - Containerización y API Gateway*

---

## Fase 3: Containerización y API Gateway (Preparado)

Los archivos de configuración para la Fase 3 han sido creados:

### Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `/docker-compose.microservices.yml` | Configuración Docker Compose para microservicios |
| `/gateway/kong.yml` | Configuración del API Gateway (Kong) |
| `/services/Dockerfile.template` | Template de Dockerfile para servicios |
| `/services/main.template.py` | Template de main.py para servicios |
| `/backend/scripts/db_manager.py` | Utilidades para gestión de BD por módulo |

### Arquitectura de Microservicios (Cuando se active)

```
                    ┌─────────────────┐
                    │    Frontend     │
                    │   (React)       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │     (Kong)      │
                    └────────┬────────┘
                             │
        ┌────────────┬───────┴────────┬────────────┐
        │            │                │            │
   ┌────▼────┐  ┌────▼────┐    ┌─────▼────┐  ┌────▼────┐
   │  Auth   │  │  Store  │    │ PinpanClub│  │Community│
   │ Service │  │ Service │    │  Service │  │ Service │
   └────┬────┘  └────┬────┘    └─────┬────┘  └────┬────┘
        │            │                │            │
        └────────────┴───────┬────────┴────────────┘
                             │
                    ┌────────▼────────┐
                    │    MongoDB      │
                    └─────────────────┘
```

### Pasos para Activar Microservicios

1. **Extraer módulos a servicios independientes:**
   ```bash
   # Ejemplo para PinpanClub
   mkdir -p services/pinpanclub
   cp -r backend/modules/pinpanclub services/pinpanclub/app
   cp -r backend/core services/pinpanclub/core
   cp services/Dockerfile.template services/pinpanclub/Dockerfile
   ```

2. **Configurar Event Bus distribuido (Redis):**
   ```python
   # Reemplazar event_bus local por Redis
   from core.events import RedisEventBus
   event_bus = RedisEventBus(redis_url="redis://redis:6379")
   ```

3. **Iniciar con Docker Compose:**
   ```bash
   docker-compose -f docker-compose.microservices.yml up -d
   ```

### Notas Importantes

- La aplicación actualmente funciona como **monolito modular**
- La migración a microservicios es **opcional** y solo recomendada cuando:
  - Se necesite escalar módulos de forma independiente
  - Se quiera desplegar módulos en diferentes regiones
  - Se requiera usar diferentes tecnologías por módulo

---

## Resumen del Proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1** | ✅ Completada | Refactorización a arquitectura modular |
| **Fase 1.5** | ✅ Completada | Migración del frontend a nuevos endpoints |
| **Fase 2** | ✅ Documentada | Separación de schemas de BD |
| **Fase 3** | 📝 Preparada | Containerización y API Gateway |

### Módulos Refactorizados

- ✅ **PinpanClub** - `/api/pinpanclub/*`
- ✅ **Store** - `/api/store/*`
- ✅ **Auth** - `/api/auth-v2/*`
- ✅ **Community** - `/api/community-v2/*`

### Características Implementadas

1. **Service Layer Pattern** - Lógica de negocio encapsulada
2. **Repository Pattern** - Acceso a datos abstraído
3. **Event Bus** - Comunicación desacoplada entre módulos
4. **Backward Compatibility** - Endpoints legacy mantenidos
5. **Configuración Centralizada** - Frontend con archivos de configuración de API

---

*Última actualización: Enero 2026*
