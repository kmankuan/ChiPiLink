"""
Store Module - Servicio de Synchronization con Google Sheets
Sincroniza estudiantes desde hojas de calculation de Google
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import asyncio
import logging

from core.database import db

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """
    Service for sincronizar estudiantes desde Google Sheets.
    Soporta multiple hojas (tabs) por grado.
    """
    
    def __init__(self):
        self.credentials = None
        self.service = None
        self._initialized = False
    
    async def initialize(self, credentials_json: Dict = None):
        """
        Inicializar el servicio con credenciales.
        Las credenciales pueden venir de:
        1. Parameter directo (dict del JSON)
        2. Variable de entorno GOOGLE_SHEETS_CREDENTIALS
        3. Base de datos (encriptadas)
        """
        try:
            # Intentar importar las libraries de Google
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
            
            if credentials_json:
                self.credentials = Credentials.from_service_account_info(
                    credentials_json,
                    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
                )
            else:
                # Intentar cargar de variable de entorno
                import os
                import json
                creds_str = os.environ.get('GOOGLE_SHEETS_CREDENTIALS')
                if creds_str:
                    creds_dict = json.loads(creds_str)
                    self.credentials = Credentials.from_service_account_info(
                        creds_dict,
                        scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
                    )
            
            if self.credentials:
                self.service = build('sheets', 'v4', credentials=self.credentials)
                self._initialized = True
                logger.info("[GoogleSheets] Service initialized successfully")
                return True
            else:
                logger.warning("[GoogleSheets] No credentials available")
                return False
                
        except ImportError:
            logger.error("[GoogleSheets] Google API libraries not installed. Run: pip install google-api-python-client google-auth")
            return False
        except Exception as e:
            logger.error(f"[GoogleSheets] Error initializing: {e}")
            return False
    
    async def get_sync_config(self) -> Dict:
        """Get configuration de synchronization"""
        config = await db.sync_config.find_one(
            {"config_id": "google_sheets_sync_config"},
            {"_id": 0}
        )
        
        if not config:
            # Create configuration by default
            config = {
                "config_id": "google_sheets_sync_config",
                "service_account_email": None,
                "has_credentials": False,
                "sheets": [],
                "sync_habilitado": False,
                "sync_frecuencia": "manual",
                "ultima_sync": None,
                "proxima_sync": None,
                "columna_numero": "numero_estudiante",
                "columna_nombre": "nombre_completo",
                "columna_grado": "grade",
                "columna_seccion": "seccion",
                "columna_estado": "estado"
            }
            await db.sync_config.insert_one(config)
        
        return config
    
    async def update_sync_config(self, updates: Dict) -> Dict:
        """Update configuration de synchronization"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.sync_config.update_one(
            {"config_id": "google_sheets_sync_config"},
            {"$set": updates},
            upsert=True
        )
        
        return await self.get_sync_config()
    
    async def configure_sheet(
        self,
        sheet_id: str,
        nombre_sheet: str,
        hojas: List[Dict[str, Any]]
    ) -> Dict:
        """
        Configurar un Google Sheet para synchronization.
        
        Args:
            sheet_id: ID of the Google Sheet
            nombre_sheet: Nombre descriptivo
            hojas: Lista de hojas/tabs con su configuration
                   [{"name": "1er Grado", "grade": "1", "columnas": {...}}]
        """
        config = await self.get_sync_config()
        
        # Search si already exists este sheet
        sheets = config.get("sheets", [])
        existing_idx = next(
            (i for i, s in enumerate(sheets) if s["sheet_id"] == sheet_id),
            None
        )
        
        sheet_config = {
            "sheet_id": sheet_id,
            "name": nombre_sheet,
            "hojas": hojas,
            "fecha_configuracion": datetime.now(timezone.utc).isoformat()
        }
        
        if existing_idx is not None:
            sheets[existing_idx] = sheet_config
        else:
            sheets.append(sheet_config)
        
        await self.update_sync_config({"sheets": sheets})
        
        return sheet_config
    
    async def test_connection(self, sheet_id: str) -> Dict:
        """Probar connection a un Google Sheet"""
        if not self._initialized:
            return {
                "success": False,
                "error": "Servicio no inicializado. Configure las credenciales primero."
            }
        
        try:
            # Intentar leer metadata del sheet
            sheet_metadata = self.service.spreadsheets().get(
                spreadsheetId=sheet_id
            ).execute()
            
            # Get names de las hojas
            hojas = [
                {
                    "name": sheet["properties"]["title"],
                    "sheet_id": sheet["properties"]["sheetId"],
                    "index": sheet["properties"]["index"]
                }
                for sheet in sheet_metadata.get("sheets", [])
            ]
            
            return {
                "success": True,
                "titulo": sheet_metadata.get("properties", {}).get("title"),
                "hojas": hojas,
                "url": f"https://docs.google.com/spreadsheets/d/{sheet_id}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def read_sheet_data(
        self,
        sheet_id: str,
        hoja_name: str,
        rango: str = None
    ) -> List[List[str]]:
        """
        Leer datos de una hoja specific.
        
        Args:
            sheet_id: ID of the Google Sheet
            hoja_nombre: Nombre de la tab
            rango: Rango a leer (ej: "A1:F100"). Si es None, lee toda la hoja.
        """
        if not self._initialized:
            raise Exception("Servicio no inicializado")
        
        try:
            range_name = f"'{hoja_nombre}'!{rango}" if rango else f"'{hoja_nombre}'"
            
            result = self.service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()
            
            return result.get('values', [])
            
        except Exception as e:
            logger.error(f"[GoogleSheets] Error reading sheet: {e}")
            raise
    
    async def sync_estudiantes(
        self,
        sheet_id: str = None,
        solo_hoja: str = None,
        forzar: bool = False
    ) -> Dict:
        """
        Sincronizar estudiantes desde Google Sheets.
        
        Args:
            sheet_id: ID specific del sheet (None = todos los configurados)
            solo_hoja: Nombre de hoja specific (None = todas)
            forzar: Si es True, sincroniza aunque override_local sea True
        
        Returns:
            Resumen de la synchronization
        """
        if not self._initialized:
            return {
                "success": False,
                "error": "Servicio no inicializado. Configure las credenciales primero."
            }
        
        config = await self.get_sync_config()
        sheets_config = config.get("sheets", [])
        
        if not sheets_config:
            return {
                "success": False,
                "error": "No hay sheets configurados para sincronizar"
            }
        
        # Filtrar por sheet_id si se especifica
        if sheet_id:
            sheets_config = [s for s in sheets_config if s["sheet_id"] == sheet_id]
        
        resultados = {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sheets_procesados": 0,
            "estudiantes_nuevos": 0,
            "estudiantes_actualizados": 0,
            "estudiantes_sin_cambio": 0,
            "estudiantes_override": 0,
            "errores": []
        }
        
        for sheet_cfg in sheets_config:
            try:
                for hoja_cfg in sheet_cfg.get("hojas", []):
                    if solo_hoja and hoja_cfg["name"] != solo_hoja:
                        continue
                    
                    # Leer datos de la hoja
                    datos = await self.read_sheet_data(
                        sheet_cfg["sheet_id"],
                        hoja_cfg["name"]
                    )
                    
                    if not datos or len(datos) < 2:
                        continue
                    
                    # Primera fila son los headers
                    headers = [h.lower().strip() for h in datos[0]]
                    columnas = hoja_cfg.get("columnas", config)
                    
                    # Mapear indexs de columnas
                    col_idx = {}
                    for key in ["columna_numero", "columna_nombre", "columna_grado", "columna_seccion", "columna_estado"]:
                        col_name = columnas.get(key, config.get(key, "")).lower()
                        if col_name in headers:
                            col_idx[key] = headers.index(col_name)
                    
                    # Procesar cada fila (desde la 2)
                    for fila_num, fila in enumerate(datos[1:], start=2):
                        try:
                            # Extract datos con los indexs mapeados
                            def get_val(key):
                                idx = col_idx.get(key)
                                if idx is not None and idx < len(fila):
                                    return fila[idx].strip()
                                return None
                            
                            numero = get_val("columna_numero")
                            if not numero:
                                continue
                            
                            nombre_completo = get_val("columna_nombre") or ""
                            grade = hoja_cfg.get("grade") or get_val("columna_grado") or ""
                            seccion = get_val("columna_seccion")
                            estado_raw = get_val("columna_estado") or "active"
                            
                            # Separar nombre y apellido si es posible
                            partes_nombre = nombre_completo.split(" ", 1)
                            nombre = partes_nombre[0] if partes_nombre else ""
                            apellido = partes_nombre[1] if len(partes_nombre) > 1 else ""
                            
                            # Search si already exists
                            existente = await db.estudiantes_sincronizados.find_one({
                                "numero_estudiante": numero,
                                "sheet_id": sheet_cfg["sheet_id"]
                            })
                            
                            estudiante_data = {
                                "numero_estudiante": numero,
                                "nombre_completo": nombre_completo,
                                "name": nombre,
                                "apellido": apellido,
                                "grade": str(grade),
                                "seccion": seccion,
                                "sheet_id": sheet_cfg["sheet_id"],
                                "hoja_nombre": hoja_cfg["name"],
                                "fila_numero": fila_num,
                                "estado": "active" if estado_raw.lower() in ["active", "active", "1", "si", "yes"] else "inactivo",
                                "fecha_sync": datetime.now(timezone.utc).isoformat(),
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                            
                            # Guardar datos extra (otras columnas)
                            datos_extra = {}
                            for i, val in enumerate(fila):
                                if i not in col_idx.values() and i < len(headers):
                                    datos_extra[headers[i]] = val
                            if datos_extra:
                                estudiante_data["datos_extra"] = datos_extra
                            
                            if existente:
                                # Verify si tiene override
                                if existente.get("override_local") and not forzar:
                                    resultados["estudiantes_override"] += 1
                                    continue
                                
                                # Update
                                await db.estudiantes_sincronizados.update_one(
                                    {"sync_id": existente["sync_id"]},
                                    {"$set": estudiante_data}
                                )
                                resultados["estudiantes_actualizados"] += 1
                            else:
                                # Create nuevo
                                import uuid
                                estudiante_data["sync_id"] = f"sync_{uuid.uuid4().hex[:12]}"
                                estudiante_data["created_at"] = datetime.now(timezone.utc).isoformat()
                                estudiante_data["override_local"] = False
                                
                                await db.estudiantes_sincronizados.insert_one(estudiante_data)
                                resultados["estudiantes_nuevos"] += 1
                                
                        except Exception as e:
                            resultados["errores"].append(f"Fila {fila_num} en {hoja_cfg['nombre']}: {str(e)}")
                    
                resultados["sheets_procesados"] += 1
                
            except Exception as e:
                resultados["errores"].append(f"Sheet {sheet_cfg.get('nombre', sheet_cfg['sheet_id'])}: {str(e)}")
        
        # Update last synchronization
        await self.update_sync_config({
            "ultima_sync": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"[GoogleSheets] Sync completed: {resultados}")
        return resultados
    
    async def get_estudiantes_sincronizados(
        self,
        grade: str = None,
        estado: str = "active",
        buscar: str = None,
        limit: int = 100,
        skip: int = 0
    ) -> Dict:
        """Get estudiantes sincronizados con filtros"""
        query = {}
        
        if grade:
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
    
    async def buscar_estudiante_por_numero(self, numero: str) -> Optional[Dict]:
        """Search estudiante por number"""
        return await db.estudiantes_sincronizados.find_one(
            {"numero_estudiante": numero, "estado": "active"},
            {"_id": 0}
        )
    
    async def set_override_local(self, sync_id: str, override: bool) -> Dict:
        """Marcar/desmarcar un estudiante para that does not se actualice desde el Sheet"""
        result = await db.estudiantes_sincronizados.update_one(
            {"sync_id": sync_id},
            {"$set": {
                "override_local": override,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise ValueError("Estudiante not found")
        
        return {"success": True, "override_local": override}
    
    async def get_stats(self) -> Dict:
        """Get statistics de synchronization"""
        config = await self.get_sync_config()
        
        # Contar por grado
        pipeline = [
            {"$match": {"estado": "active"}},
            {"$group": {"_id": "$grado", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        por_grade = await db.estudiantes_sincronizados.aggregate(pipeline).to_list(20)
        
        total_activos = await db.estudiantes_sincronizados.count_documents({"estado": "active"})
        total_inactivos = await db.estudiantes_sincronizados.count_documents({"estado": "inactivo"})
        total_override = await db.estudiantes_sincronizados.count_documents({"override_local": True})
        
        return {
            "total_estudiantes": total_activos + total_inactivos,
            "activos": total_activos,
            "inactivos": total_inactivos,
            "con_override": total_override,
            "por_grado": {item["_id"]: item["count"] for item in por_grado},
            "sheets_configurados": len(config.get("sheets", [])),
            "sync_habilitado": config.get("sync_habilitado", False),
            "sync_frecuencia": config.get("sync_frecuencia", "manual"),
            "ultima_sync": config.get("ultima_sync")
        }


# Singleton
google_sheets_service = GoogleSheetsService()
