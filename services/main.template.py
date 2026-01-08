"""
Service Main Template
=====================
Este es un template para crear el main.py de cada microservicio
cuando se extraigan los módulos.

Pasos para crear un nuevo servicio:
1. Copiar este archivo a /services/{module}/main.py
2. Actualizar SERVICE_NAME y MODULE_NAME
3. Importar el router del módulo
4. Configurar el Event Bus distribuido (Redis/RabbitMQ)
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Service configuration
SERVICE_NAME = "example"  # Cambiar por el nombre del módulo
SERVICE_PORT = int(os.environ.get("SERVICE_PORT", 8000))
MODULE_NAME = "example"   # Nombre del módulo en /modules/

# Import module router (ajustar según el módulo)
# from app.routes import router as module_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events"""
    # Startup
    print(f"🚀 Starting {SERVICE_NAME} service on port {SERVICE_PORT}")
    
    # Initialize module (event handlers, etc.)
    # from app import init_module
    # init_module()
    
    # Connect to distributed Event Bus
    # from core.events import connect_redis_event_bus
    # await connect_redis_event_bus(os.environ.get("REDIS_URL"))
    
    yield
    
    # Shutdown
    print(f"👋 Shutting down {SERVICE_NAME} service")


# Create FastAPI app
app = FastAPI(
    title=f"ChiPi Link - {SERVICE_NAME.title()} Service",
    description=f"Microservice for {SERVICE_NAME} functionality",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "port": SERVICE_PORT
    }


# Register module router
# app.include_router(module_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
