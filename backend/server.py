from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'libros-textbook-store-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Monday.com Configuration
MONDAY_API_KEY = os.environ.get('MONDAY_API_KEY', '')
MONDAY_BOARD_ID = os.environ.get('MONDAY_BOARD_ID', '')

app = FastAPI(title="Librería - Textbook Store API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class LibroBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    grado: str  # Grade level
    materia: str  # Subject
    precio: float
    cantidad_inventario: int = 0
    isbn: Optional[str] = None
    editorial: Optional[str] = None  # Publisher
    imagen_url: Optional[str] = None
    activo: bool = True

class LibroCreate(LibroBase):
    pass

class Libro(LibroBase):
    model_config = ConfigDict(extra="ignore")
    libro_id: str = Field(default_factory=lambda: f"libro_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EstudianteBase(BaseModel):
    nombre: str
    grado: str
    escuela: Optional[str] = None
    notas: Optional[str] = None

class EstudianteCreate(EstudianteBase):
    pass

class Estudiante(EstudianteBase):
    model_config = ConfigDict(extra="ignore")
    estudiante_id: str = Field(default_factory=lambda: f"est_{uuid.uuid4().hex[:12]}")

class ClienteBase(BaseModel):
    email: EmailStr
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None

class ClienteCreate(ClienteBase):
    contrasena: str

class Cliente(ClienteBase):
    model_config = ConfigDict(extra="ignore")
    cliente_id: str = Field(default_factory=lambda: f"cli_{uuid.uuid4().hex[:12]}")
    estudiantes: List[Estudiante] = []
    es_admin: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    google_id: Optional[str] = None

class ItemPedido(BaseModel):
    libro_id: str
    nombre_libro: str
    cantidad: int
    precio_unitario: float
    
    @property
    def subtotal(self) -> float:
        return self.cantidad * self.precio_unitario

class PedidoCreate(BaseModel):
    estudiante_id: str
    items: List[ItemPedido]
    metodo_pago: str  # "transferencia_bancaria", "yappy"
    notas: Optional[str] = None

class Pedido(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pedido_id: str = Field(default_factory=lambda: f"ped_{uuid.uuid4().hex[:12]}")
    cliente_id: str
    estudiante_id: str
    estudiante_nombre: str
    items: List[ItemPedido]
    total: float
    metodo_pago: str
    estado: str = "pendiente"  # pendiente, confirmado, preparando, enviado, entregado, cancelado
    pago_confirmado: bool = False
    notas: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    monday_item_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    contrasena: str

class TokenResponse(BaseModel):
    token: str
    cliente: dict

# ============== PUBLIC ORDER MODELS ==============

class PedidoPublicoCreate(BaseModel):
    """Pedido sin autenticación - para formulario embebible"""
    # Cliente info
    nombre_cliente: str
    email_cliente: EmailStr
    telefono_cliente: Optional[str] = None
    # Estudiante info
    nombre_estudiante: str
    grado_estudiante: str
    escuela_estudiante: Optional[str] = None
    # Order info
    items: List[ItemPedido]
    metodo_pago: str
    notas: Optional[str] = None

# ============== NOTIFICATION MODELS ==============

class NotificacionCreate(BaseModel):
    tipo: str  # "pedido_nuevo", "bajo_stock", "pago_confirmado", "pedido_enviado"
    titulo: str
    mensaje: str
    datos: Optional[dict] = None

class Notificacion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notificacion_id: str = Field(default_factory=lambda: f"not_{uuid.uuid4().hex[:12]}")
    tipo: str
    titulo: str
    mensaje: str
    datos: Optional[dict] = None
    leida: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConfiguracionNotificaciones(BaseModel):
    mostrar_pedidos_nuevos: bool = True
    mostrar_bajo_stock: bool = True
    mostrar_pagos_confirmados: bool = True
    mostrar_pedidos_enviados: bool = True

# ============== FORM CONFIG MODEL ==============

class CampoFormulario(BaseModel):
    campo_id: str
    nombre: str
    tipo: str  # "text", "email", "tel", "select", "textarea"
    requerido: bool = True
    placeholder: Optional[str] = None
    opciones: Optional[List[str]] = None  # For select fields
    orden: int = 0
    activo: bool = True

class ConfiguracionFormulario(BaseModel):
    model_config = ConfigDict(extra="ignore")
    titulo: str = "Formulario de Pedido de Libros"
    descripcion: Optional[str] = "Complete el formulario para ordenar los libros de texto"
    campos_personalizados: List[CampoFormulario] = []
    mostrar_precios: bool = True
    metodos_pago: List[str] = ["transferencia_bancaria", "yappy"]
    mensaje_exito: str = "¡Gracias! Su pedido ha sido recibido."
    color_primario: str = "#166534"
    logo_url: Optional[str] = None

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(cliente_id: str, es_admin: bool = False) -> str:
    payload = {
        "sub": cliente_id,
        "es_admin": es_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    token = None
    
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        # Verify session from database
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.clientes.find_one({"cliente_id": session["cliente_id"]}, {"_id": 0, "contrasena_hash": 0})
                if user:
                    return user
    
    # Fallback to Authorization header
    if credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        cliente_id = payload.get("sub")
        user = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0, "contrasena_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user.get("es_admin", False):
        raise HTTPException(status_code=403, detail="Acceso denegado - Solo administradores")
    return current_user

# ============== MONDAY.COM SERVICE ==============

async def create_monday_item(pedido: dict) -> Optional[str]:
    if not MONDAY_API_KEY or not MONDAY_BOARD_ID:
        logger.warning("Monday.com not configured")
        return None
    
    try:
        import json
        column_values = json.dumps({
            "text": pedido.get("cliente_id", ""),
            "text4": pedido.get("estudiante_nombre", ""),
            "numbers": str(pedido.get("total", 0)),
            "status": {"label": pedido.get("estado", "pendiente")},
            "text0": pedido.get("metodo_pago", "")
        })
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {MONDAY_BOARD_ID},
                item_name: "{pedido.get('pedido_id', '')}",
                column_values: {json.dumps(column_values)}
            ) {{
                id
            }}
        }}
        '''
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": mutation},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                if "data" in result and "create_item" in result["data"]:
                    return result["data"]["create_item"]["id"]
            
            logger.error(f"Monday.com API error: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error creating Monday.com item: {e}")
        return None

# ============== AUTH ROUTES ==============

@api_router.post("/auth/registro", response_model=TokenResponse)
async def registro(cliente: ClienteCreate):
    existing = await db.clientes.find_one({"email": cliente.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    cliente_obj = Cliente(**cliente.model_dump(exclude={"contrasena"}))
    doc = cliente_obj.model_dump()
    doc["contrasena_hash"] = hash_password(cliente.contrasena)
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    await db.clientes.insert_one(doc)
    
    token = create_token(cliente_obj.cliente_id)
    return TokenResponse(
        token=token,
        cliente={k: v for k, v in doc.items() if k not in ["_id", "contrasena_hash"]}
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.clientes.find_one({"email": request.email}, {"_id": 0})
    if not user or not verify_password(request.contrasena, user.get("contrasena_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["cliente_id"], user.get("es_admin", False))
    return TokenResponse(
        token=token,
        cliente={k: v for k, v in user.items() if k != "contrasena_hash"}
    )

@api_router.get("/auth/session")
async def get_session_data(request: Request):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID requerido")
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sesión inválida")
            
            data = response.json()
            
            # Check if user exists
            existing_user = await db.clientes.find_one({"email": data["email"]}, {"_id": 0})
            
            if existing_user:
                cliente_id = existing_user["cliente_id"]
                # Update user info if needed
                await db.clientes.update_one(
                    {"email": data["email"]},
                    {"$set": {
                        "nombre": data.get("name", existing_user.get("nombre")),
                        "google_id": data.get("id")
                    }}
                )
            else:
                # Create new user
                cliente_id = f"cli_{uuid.uuid4().hex[:12]}"
                new_user = {
                    "cliente_id": cliente_id,
                    "email": data["email"],
                    "nombre": data.get("name", ""),
                    "google_id": data.get("id"),
                    "telefono": None,
                    "direccion": None,
                    "estudiantes": [],
                    "es_admin": False,
                    "fecha_creacion": datetime.now(timezone.utc).isoformat()
                }
                await db.clientes.insert_one(new_user)
            
            # Create session
            session_token = data.get("session_token", str(uuid.uuid4()))
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "cliente_id": cliente_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            user = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0, "contrasena_hash": 0})
            
            return {
                "session_token": session_token,
                "cliente": user
            }
            
    except httpx.RequestError as e:
        logger.error(f"Error fetching session: {e}")
        raise HTTPException(status_code=500, detail="Error de autenticación")

@api_router.post("/auth/session")
async def create_session_cookie(request: Request, response: Response):
    body = await request.json()
    session_token = body.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token requerido")
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {"success": True}

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True}

# ============== LIBROS (TEXTBOOKS) ROUTES ==============

@api_router.get("/libros", response_model=List[dict])
async def get_libros(grado: Optional[str] = None, materia: Optional[str] = None):
    query = {"activo": True}
    if grado:
        query["grado"] = grado
    if materia:
        query["materia"] = materia
    
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    return libros

@api_router.get("/libros/{libro_id}")
async def get_libro(libro_id: str):
    libro = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro

@api_router.post("/admin/libros", response_model=dict)
async def create_libro(libro: LibroCreate, admin: dict = Depends(get_admin_user)):
    libro_obj = Libro(**libro.model_dump())
    doc = libro_obj.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    await db.libros.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/admin/libros/{libro_id}")
async def update_libro(libro_id: str, libro: LibroCreate, admin: dict = Depends(get_admin_user)):
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": libro.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    updated = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/libros/{libro_id}")
async def delete_libro(libro_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": {"activo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return {"success": True}

# ============== INVENTARIO ROUTES ==============

@api_router.get("/admin/inventario")
async def get_inventario(admin: dict = Depends(get_admin_user)):
    libros = await db.libros.find({"activo": True}, {"_id": 0}).to_list(500)
    
    alertas_bajo_stock = [l for l in libros if l.get("cantidad_inventario", 0) < 10]
    
    return {
        "libros": libros,
        "alertas_bajo_stock": alertas_bajo_stock,
        "total_productos": len(libros),
        "productos_bajo_stock": len(alertas_bajo_stock)
    }

@api_router.put("/admin/inventario/{libro_id}")
async def update_inventario(libro_id: str, cantidad: int, admin: dict = Depends(get_admin_user)):
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": {"cantidad_inventario": cantidad}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return {"success": True, "nueva_cantidad": cantidad}

# ============== ESTUDIANTES ROUTES ==============

@api_router.get("/estudiantes")
async def get_estudiantes(current_user: dict = Depends(get_current_user)):
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    return user.get("estudiantes", [])

@api_router.post("/estudiantes")
async def add_estudiante(estudiante: EstudianteCreate, current_user: dict = Depends(get_current_user)):
    estudiante_obj = Estudiante(**estudiante.model_dump())
    
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$push": {"estudiantes": estudiante_obj.model_dump()}}
    )
    
    return estudiante_obj.model_dump()

@api_router.put("/estudiantes/{estudiante_id}")
async def update_estudiante(estudiante_id: str, estudiante: EstudianteCreate, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
        {"$set": {
            "estudiantes.$.nombre": estudiante.nombre,
            "estudiantes.$.grado": estudiante.grado,
            "estudiantes.$.escuela": estudiante.escuela,
            "estudiantes.$.notas": estudiante.notas
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return {"success": True}

@api_router.delete("/estudiantes/{estudiante_id}")
async def delete_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$pull": {"estudiantes": {"estudiante_id": estudiante_id}}}
    )
    return {"success": True}

# ============== PEDIDOS (ORDERS) ROUTES ==============

@api_router.post("/pedidos")
async def create_pedido(pedido: PedidoCreate, current_user: dict = Depends(get_current_user)):
    # Get student info
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == pedido.estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Calculate total and verify inventory
    total = 0
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
        if not libro:
            raise HTTPException(status_code=404, detail=f"Libro {item.libro_id} no encontrado")
        if libro.get("cantidad_inventario", 0) < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {libro['nombre']}")
        total += item.cantidad * item.precio_unitario
    
    pedido_obj = Pedido(
        cliente_id=current_user["cliente_id"],
        estudiante_id=pedido.estudiante_id,
        estudiante_nombre=estudiante["nombre"],
        items=[item.model_dump() for item in pedido.items],
        total=total,
        metodo_pago=pedido.metodo_pago,
        notas=pedido.notas
    )
    
    doc = pedido_obj.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    # Update inventory
    for item in pedido.items:
        await db.libros.update_one(
            {"libro_id": item.libro_id},
            {"$inc": {"cantidad_inventario": -item.cantidad}}
        )
    
    await db.pedidos.insert_one(doc)
    
    # Create Monday.com item
    monday_id = await create_monday_item(doc)
    if monday_id:
        await db.pedidos.update_one(
            {"pedido_id": doc["pedido_id"]},
            {"$set": {"monday_item_id": monday_id}}
        )
        doc["monday_item_id"] = monday_id
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/pedidos")
async def get_my_pedidos(current_user: dict = Depends(get_current_user)):
    pedidos = await db.pedidos.find(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(100)
    return pedidos

@api_router.get("/admin/pedidos")
async def get_all_pedidos(
    estado: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if estado:
        query["estado"] = estado
    
    pedidos = await db.pedidos.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(500)
    return pedidos

@api_router.put("/admin/pedidos/{pedido_id}")
async def update_pedido(pedido_id: str, estado: str, admin: dict = Depends(get_admin_user)):
    result = await db.pedidos.update_one(
        {"pedido_id": pedido_id},
        {"$set": {"estado": estado}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True}

@api_router.put("/admin/pedidos/{pedido_id}/confirmar-pago")
async def confirmar_pago(pedido_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.pedidos.update_one(
        {"pedido_id": pedido_id},
        {"$set": {"pago_confirmado": True, "estado": "confirmado"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True}

@api_router.get("/pedidos/{pedido_id}/recibo")
async def get_recibo(pedido_id: str, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Verify ownership or admin
    if pedido["cliente_id"] != current_user["cliente_id"] and not current_user.get("es_admin"):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    cliente = await db.clientes.find_one({"cliente_id": pedido["cliente_id"]}, {"_id": 0, "contrasena_hash": 0})
    
    return {
        "pedido": pedido,
        "cliente": cliente
    }

# ============== METADATA ROUTES ==============

@api_router.get("/grados")
async def get_grados():
    return {
        "grados": [
            {"id": "preescolar", "nombre": "Preescolar"},
            {"id": "1", "nombre": "1er Grado"},
            {"id": "2", "nombre": "2do Grado"},
            {"id": "3", "nombre": "3er Grado"},
            {"id": "4", "nombre": "4to Grado"},
            {"id": "5", "nombre": "5to Grado"},
            {"id": "6", "nombre": "6to Grado"},
            {"id": "7", "nombre": "7mo Grado"},
            {"id": "8", "nombre": "8vo Grado"},
            {"id": "9", "nombre": "9no Grado"},
            {"id": "10", "nombre": "10mo Grado"},
            {"id": "11", "nombre": "11vo Grado"},
            {"id": "12", "nombre": "12vo Grado"},
        ]
    }

@api_router.get("/materias")
async def get_materias():
    return {
        "materias": [
            {"id": "matematicas", "nombre": "Matemáticas"},
            {"id": "espanol", "nombre": "Español"},
            {"id": "ciencias", "nombre": "Ciencias"},
            {"id": "sociales", "nombre": "Estudios Sociales"},
            {"id": "ingles", "nombre": "Inglés"},
            {"id": "arte", "nombre": "Arte"},
            {"id": "musica", "nombre": "Música"},
            {"id": "educacion_fisica", "nombre": "Educación Física"},
            {"id": "tecnologia", "nombre": "Tecnología"},
            {"id": "religion", "nombre": "Religión"},
        ]
    }

# ============== ADMIN SETUP ==============

@api_router.post("/admin/setup")
async def setup_admin(email: str, contrasena: str):
    # Check if any admin exists
    existing_admin = await db.clientes.find_one({"es_admin": True})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin ya existe")
    
    existing_user = await db.clientes.find_one({"email": email})
    if existing_user:
        # Make existing user admin
        await db.clientes.update_one({"email": email}, {"$set": {"es_admin": True}})
        return {"success": True, "message": "Usuario existente promovido a admin"}
    
    # Create admin user
    cliente_id = f"cli_{uuid.uuid4().hex[:12]}"
    admin_user = {
        "cliente_id": cliente_id,
        "email": email,
        "nombre": "Administrador",
        "telefono": None,
        "direccion": None,
        "estudiantes": [],
        "es_admin": True,
        "contrasena_hash": hash_password(contrasena),
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clientes.insert_one(admin_user)
    return {"success": True, "message": "Admin creado exitosamente"}

# ============== SEED DATA ==============

@api_router.post("/admin/seed")
async def seed_data(admin: dict = Depends(get_admin_user)):
    # Check if data already exists
    existing = await db.libros.find_one()
    if existing:
        return {"message": "Datos ya existen"}
    
    sample_libros = [
        {"nombre": "Matemáticas 1", "descripcion": "Libro de matemáticas para primer grado", "grado": "1", "materia": "matematicas", "precio": 25.00, "cantidad_inventario": 50, "isbn": "978-1-234-56789-0", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Español 1", "descripcion": "Libro de español para primer grado", "grado": "1", "materia": "espanol", "precio": 25.00, "cantidad_inventario": 45, "isbn": "978-1-234-56789-1", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Ciencias 1", "descripcion": "Libro de ciencias para primer grado", "grado": "1", "materia": "ciencias", "precio": 28.00, "cantidad_inventario": 40, "isbn": "978-1-234-56789-2", "editorial": "Editorial Norma", "activo": True},
        {"nombre": "Matemáticas 2", "descripcion": "Libro de matemáticas para segundo grado", "grado": "2", "materia": "matematicas", "precio": 26.00, "cantidad_inventario": 55, "isbn": "978-1-234-56789-3", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Español 2", "descripcion": "Libro de español para segundo grado", "grado": "2", "materia": "espanol", "precio": 26.00, "cantidad_inventario": 5, "isbn": "978-1-234-56789-4", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Ciencias 2", "descripcion": "Libro de ciencias para segundo grado", "grado": "2", "materia": "ciencias", "precio": 29.00, "cantidad_inventario": 8, "isbn": "978-1-234-56789-5", "editorial": "Editorial Norma", "activo": True},
        {"nombre": "Matemáticas 3", "descripcion": "Libro de matemáticas para tercer grado", "grado": "3", "materia": "matematicas", "precio": 27.00, "cantidad_inventario": 60, "isbn": "978-1-234-56789-6", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Inglés 1", "descripcion": "Libro de inglés para primer grado", "grado": "1", "materia": "ingles", "precio": 30.00, "cantidad_inventario": 35, "isbn": "978-1-234-56789-7", "editorial": "Editorial Oxford", "activo": True},
    ]
    
    for libro_data in sample_libros:
        libro = Libro(**libro_data)
        doc = libro.model_dump()
        doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
        await db.libros.insert_one(doc)
    
    return {"message": f"Se agregaron {len(sample_libros)} libros de muestra"}

# ============== PUBLIC ORDER ROUTES (NO AUTH) ==============

async def create_notification(tipo: str, titulo: str, mensaje: str, datos: dict = None):
    """Helper to create notifications"""
    notificacion = Notificacion(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        datos=datos
    )
    doc = notificacion.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    await db.notificaciones.insert_one(doc)
    return notificacion

@api_router.get("/public/libros")
async def get_public_libros(grado: Optional[str] = None):
    """Get books for public form - no auth required"""
    query = {"activo": True}
    if grado:
        query["grado"] = grado
    
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    # Filter only books with stock > 0
    libros_disponibles = [l for l in libros if l.get("cantidad_inventario", 0) > 0]
    return libros_disponibles

@api_router.get("/public/config-formulario")
async def get_form_config():
    """Get form configuration for embed"""
    config = await db.config_formulario.find_one({}, {"_id": 0})
    if not config:
        # Return default config
        default = ConfiguracionFormulario()
        return default.model_dump()
    return config

@api_router.post("/public/pedido")
async def create_public_order(pedido: PedidoPublicoCreate):
    """Create order from public form - no auth required"""
    
    # Validate and calculate total
    total = 0
    items_validados = []
    
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id, "activo": True}, {"_id": 0})
        if not libro:
            raise HTTPException(status_code=404, detail=f"Libro {item.libro_id} no encontrado")
        if libro.get("cantidad_inventario", 0) < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {libro['nombre']}")
        
        total += item.cantidad * item.precio_unitario
        items_validados.append(item.model_dump())
    
    # Create order
    pedido_id = f"ped_{uuid.uuid4().hex[:12]}"
    pedido_doc = {
        "pedido_id": pedido_id,
        "tipo": "publico",  # Mark as public order
        "cliente_id": None,
        "nombre_cliente": pedido.nombre_cliente,
        "email_cliente": pedido.email_cliente,
        "telefono_cliente": pedido.telefono_cliente,
        "estudiante_id": None,
        "estudiante_nombre": pedido.nombre_estudiante,
        "grado_estudiante": pedido.grado_estudiante,
        "escuela_estudiante": pedido.escuela_estudiante,
        "items": items_validados,
        "total": total,
        "metodo_pago": pedido.metodo_pago,
        "estado": "pendiente",
        "pago_confirmado": False,
        "notas": pedido.notas,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    # Update inventory
    for item in pedido.items:
        await db.libros.update_one(
            {"libro_id": item.libro_id},
            {"$inc": {"cantidad_inventario": -item.cantidad}}
        )
    
    await db.pedidos.insert_one(pedido_doc)
    
    # Create Monday.com item
    monday_id = await create_monday_item(pedido_doc)
    if monday_id:
        await db.pedidos.update_one(
            {"pedido_id": pedido_id},
            {"$set": {"monday_item_id": monday_id}}
        )
    
    # Create notification
    await create_notification(
        tipo="pedido_nuevo",
        titulo="Nuevo Pedido Recibido",
        mensaje=f"Pedido {pedido_id} de {pedido.nombre_cliente} - ${total:.2f}",
        datos={"pedido_id": pedido_id, "total": total, "cliente": pedido.nombre_cliente}
    )
    
    # Check low stock and create notifications
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
        if libro and libro.get("cantidad_inventario", 0) < 10:
            await create_notification(
                tipo="bajo_stock",
                titulo="Alerta de Stock Bajo",
                mensaje=f"{libro['nombre']} tiene solo {libro['cantidad_inventario']} unidades",
                datos={"libro_id": item.libro_id, "stock": libro['cantidad_inventario'], "nombre": libro['nombre']}
            )
    
    return {
        "success": True,
        "pedido_id": pedido_id,
        "total": total,
        "mensaje": "Pedido creado exitosamente"
    }

# ============== NOTIFICATIONS ROUTES ==============

@api_router.get("/admin/notificaciones")
async def get_notificaciones(
    limite: int = 50,
    solo_no_leidas: bool = False,
    tipos: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get notifications for admin"""
    query = {}
    if solo_no_leidas:
        query["leida"] = False
    if tipos:
        tipo_list = tipos.split(",")
        query["tipo"] = {"$in": tipo_list}
    
    notificaciones = await db.notificaciones.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(limite)
    
    # Count by type
    pipeline = [
        {"$match": {"leida": False}},
        {"$group": {"_id": "$tipo", "count": {"$sum": 1}}}
    ]
    counts = await db.notificaciones.aggregate(pipeline).to_list(10)
    conteo_por_tipo = {item["_id"]: item["count"] for item in counts}
    
    return {
        "notificaciones": notificaciones,
        "total_no_leidas": sum(conteo_por_tipo.values()),
        "conteo_por_tipo": conteo_por_tipo
    }

@api_router.put("/admin/notificaciones/{notificacion_id}/leer")
async def mark_notification_read(notificacion_id: str, admin: dict = Depends(get_admin_user)):
    """Mark notification as read"""
    await db.notificaciones.update_one(
        {"notificacion_id": notificacion_id},
        {"$set": {"leida": True}}
    )
    return {"success": True}

@api_router.put("/admin/notificaciones/leer-todas")
async def mark_all_notifications_read(
    tipos: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Mark all notifications as read"""
    query = {}
    if tipos:
        query["tipo"] = {"$in": tipos.split(",")}
    
    await db.notificaciones.update_many(query, {"$set": {"leida": True}})
    return {"success": True}

@api_router.delete("/admin/notificaciones/limpiar")
async def clear_old_notifications(dias: int = 30, admin: dict = Depends(get_admin_user)):
    """Delete notifications older than X days"""
    fecha_limite = datetime.now(timezone.utc) - timedelta(days=dias)
    result = await db.notificaciones.delete_many({
        "fecha_creacion": {"$lt": fecha_limite.isoformat()}
    })
    return {"success": True, "eliminadas": result.deleted_count}

# ============== NOTIFICATION CONFIG ROUTES ==============

@api_router.get("/admin/config-notificaciones")
async def get_notification_config(admin: dict = Depends(get_admin_user)):
    """Get notification display preferences"""
    config = await db.config_notificaciones.find_one({"admin_id": admin["cliente_id"]}, {"_id": 0})
    if not config:
        default = ConfiguracionNotificaciones()
        return default.model_dump()
    return config

@api_router.put("/admin/config-notificaciones")
async def update_notification_config(
    config: ConfiguracionNotificaciones,
    admin: dict = Depends(get_admin_user)
):
    """Update notification display preferences"""
    await db.config_notificaciones.update_one(
        {"admin_id": admin["cliente_id"]},
        {"$set": {**config.model_dump(), "admin_id": admin["cliente_id"]}},
        upsert=True
    )
    return {"success": True}

# ============== FORM CONFIGURATION ROUTES ==============

@api_router.get("/admin/config-formulario")
async def get_admin_form_config(admin: dict = Depends(get_admin_user)):
    """Get form configuration"""
    config = await db.config_formulario.find_one({}, {"_id": 0})
    if not config:
        default = ConfiguracionFormulario()
        return default.model_dump()
    return config

@api_router.put("/admin/config-formulario")
async def update_form_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update form configuration"""
    await db.config_formulario.update_one(
        {},
        {"$set": config},
        upsert=True
    )
    return {"success": True}

# ============== EMBED CODE GENERATOR ==============

@api_router.get("/admin/embed-code")
async def get_embed_code(admin: dict = Depends(get_admin_user)):
    """Generate embed code for the form"""
    base_url = os.environ.get('FRONTEND_URL', 'https://your-domain.com')
    
    iframe_code = f'''<iframe 
  src="{base_url}/embed/orden" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border: none; max-width: 1200px; margin: 0 auto; display: block;">
</iframe>'''
    
    script_code = f'''<div id="libreria-form-container"></div>
<script src="{base_url}/embed.js"></script>
<script>
  LibreriaForm.init({{
    container: '#libreria-form-container',
    theme: 'auto'
  }});
</script>'''
    
    return {
        "iframe_code": iframe_code,
        "script_code": script_code,
        "direct_url": f"{base_url}/embed/orden"
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
