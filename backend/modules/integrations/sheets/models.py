"""
Google Sheets Models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


class ColumnaSheet(BaseModel):
    """Column mapping for Google Sheet sync"""
    columna_id: str  # Column letter or number
    nombre_original: str  # Original header name
    campo_destino: str  # Mapped field name
    tipo: str = "text"  # text, number, date, email
    obligatorio: bool = False


class CambioRegistro(BaseModel):
    """Record change detected during sync"""
    tipo: str  # "nuevo", "modificado", "eliminado"
    sync_id: str
    campos_afectados: Optional[List[str]] = None
    valor_anterior: Optional[Dict] = None
    valor_nuevo: Optional[Dict] = None


class ConfiguracionSheetSync(BaseModel):
    """Google Sheet sync configuration"""
    model_config = ConfigDict(extra="ignore")
    config_id: str = Field(default_factory=lambda: f"sheet_cfg_{uuid.uuid4().hex[:8]}")
    nombre: str  # Config name (e.g., "Matr\u00edculas 2025")
    sheet_url: str  # Google Sheet URL
    sheet_id: str  # Extracted sheet ID
    gid: str = "0"  # Specific tab GID
    # Mapping
    mapeo_columnas: List[ColumnaSheet] = []
    fila_encabezado: int = 1  # Header row
    fila_inicio_datos: int = 2  # Data start row
    # Sync settings
    sincronizacion_automatica: bool = False
    intervalo_minutos: int = 60
    # Status
    ultima_sincronizacion: Optional[datetime] = None
    total_registros: int = 0
    estado: str = "configurando"  # configurando, activo, error, pausado
    mensaje_error: Optional[str] = None
    # Dates
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EstudianteSincronizado(BaseModel):
    """Synced student record from Google Sheet"""
    model_config = ConfigDict(extra="ignore")
    sync_id: str = Field(default_factory=lambda: f"sync_{uuid.uuid4().hex[:12]}")
    config_id: str  # Reference to sync config
    fila_original: int  # Original row number
    datos: Dict  # Mapped data
    hash_datos: str  # Hash for change detection
    estado: str = "activo"  # activo, eliminado
    fecha_sincronizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
