"""
Store Module - Servicio de Importación Masiva (Bulk Import)
Permite importar estudiantes y productos desde datos copiados de Google Sheets
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
import re

from core.database import db

logger = logging.getLogger(__name__)


class BulkImportService:
    """
    Service for importar datos desde texto pegado (copy/paste de Google Sheets).
    Soporta formato TSV (tab-separated) que es el formato nativo de Google Sheets.
    """
    
    def parse_tsv(self, raw_text: str, has_headers: bool = True) -> Dict:
        """
        Parsear texto en formato TSV (tab-separated values).
        
        Args:
            raw_text: Texto pegado desde Google Sheets
            has_headers: Si la primera fila contiene los encabezados
        
        Returns:
            {
                "headers": [...] o None,
                "rows": [[...], [...], ...],
                "total_rows": int,
                "total_columns": int
            }
        """
        if not raw_text or not raw_text.strip():
            return {"headers": None, "rows": [], "total_rows": 0, "total_columns": 0}
        
        lines = raw_text.strip().split('\n')
        rows = []
        
        for line in lines:
            # Splitear por tab
            cells = line.split('\t')
            # Limpiar espacios extras
            cells = [cell.strip() for cell in cells]
            if any(cell for cell in cells):  # Si hay al menos una celda no vacía
                rows.append(cells)
        
        if not rows:
            return {"headers": None, "rows": [], "total_rows": 0, "total_columns": 0}
        
        headers = None
        data_rows = rows
        
        if has_headers and len(rows) > 0:
            headers = rows[0]
            data_rows = rows[1:]
        
        max_cols = max(len(row) for row in rows) if rows else 0
        
        return {
            "headers": headers,
            "rows": data_rows,
            "total_rows": len(data_rows),
            "total_columns": max_cols
        }
    
    async def preview_estudiantes(
        self,
        raw_text: str,
        column_mapping: Dict[str, int],
        grado_default: str = None
    ) -> Dict:
        """
        Previsualizar datos de estudiantes antes de importar.
        
        Args:
            raw_text: Texto pegado desde Google Sheets
            column_mapping: Mapeo de campos a índices de columna
                {
                    "numero_estudiante": 0,  # Columna A
                    "nombre_completo": 1,    # Columna B
                    "grado": 2,              # Columna C (opcional si hay grado_default)
                    "seccion": 3             # Columna D (opcional)
                }
            grado_default: Grado por defecto si no está en los datos
        
        Returns:
            Previsualización con validaciones
        """
        parsed = self.parse_tsv(raw_text, has_headers=True)
        
        if not parsed["rows"]:
            return {
                "success": False,
                "error": "No se encontraron datos para importar",
                "preview": []
            }
        
        preview = []
        errores = []
        duplicados = []
        numeros_vistos = set()
        
        for idx, row in enumerate(parsed["rows"]):
            try:
                # Extraer datos según mapeo
                numero = self._get_cell(row, column_mapping.get("numero_estudiante"))
                nombre_completo = self._get_cell(row, column_mapping.get("nombre_completo"))
                grado = self._get_cell(row, column_mapping.get("grado")) or grado_default
                seccion = self._get_cell(row, column_mapping.get("seccion"))
                
                # Validaciones
                if not numero:
                    errores.append({"fila": idx + 2, "error": "Número de estudiante vacío"})
                    continue
                
                if not nombre_completo:
                    errores.append({"fila": idx + 2, "error": "Nombre vacío"})
                    continue
                
                if not grado:
                    errores.append({"fila": idx + 2, "error": "Grado vacío"})
                    continue
                
                # Verificar duplicados en esta importación
                if numero in numeros_vistos:
                    duplicados.append({"fila": idx + 2, "numero": numero})
                    continue
                numeros_vistos.add(numero)
                
                # Verificar si already exists en DB
                existente = await db.estudiantes_sincronizados.find_one(
                    {"numero_estudiante": numero}
                )
                
                # Separar nombre y apellido
                partes = nombre_completo.split(" ", 1)
                nombre = partes[0]
                apellido = partes[1] if len(partes) > 1 else ""
                
                preview.append({
                    "fila": idx + 2,
                    "numero_estudiante": numero,
                    "nombre_completo": nombre_completo,
                    "nombre": nombre,
                    "apellido": apellido,
                    "grado": str(grado),
                    "seccion": seccion,
                    "ya_existe": existente is not None,
                    "accion": "actualizar" if existente else "crear"
                })
                
            except Exception as e:
                errores.append({"fila": idx + 2, "error": str(e)})
        
        return {
            "success": True,
            "headers_detectados": parsed["headers"],
            "preview": preview,
            "resumen": {
                "total_filas": len(parsed["rows"]),
                "validos": len(preview),
                "nuevos": len([p for p in preview if not p["ya_existe"]]),
                "actualizaciones": len([p for p in preview if p["ya_existe"]]),
                "errores": len(errores),
                "duplicados": len(duplicados)
            },
            "errores": errores,
            "duplicados": duplicados
        }
    
    async def importar_estudiantes(
        self,
        raw_text: str,
        column_mapping: Dict[str, int],
        grado_default: str = None,
        hoja_nombre: str = "Importación Manual",
        actualizar_existentes: bool = True,
        admin_id: str = None
    ) -> Dict:
        """
        Importar estudiantes desde texto pegado.
        """
        parsed = self.parse_tsv(raw_text, has_headers=True)
        
        if not parsed["rows"]:
            return {
                "success": False,
                "error": "No se encontraron datos para importar"
            }
        
        now = datetime.now(timezone.utc).isoformat()
        import_id = f"import_{uuid.uuid4().hex[:12]}"
        
        resultados = {
            "success": True,
            "import_id": import_id,
            "creados": 0,
            "actualizados": 0,
            "omitidos": 0,
            "errores": []
        }
        
        numeros_procesados = set()
        
        for idx, row in enumerate(parsed["rows"]):
            try:
                numero = self._get_cell(row, column_mapping.get("numero_estudiante"))
                nombre_completo = self._get_cell(row, column_mapping.get("nombre_completo"))
                grado = self._get_cell(row, column_mapping.get("grado")) or grado_default
                seccion = self._get_cell(row, column_mapping.get("seccion"))
                
                if not numero or not nombre_completo or not grado:
                    resultados["errores"].append({
                        "fila": idx + 2,
                        "error": "Datos incompletos"
                    })
                    continue
                
                if numero in numeros_procesados:
                    resultados["omitidos"] += 1
                    continue
                numeros_procesados.add(numero)
                
                # Separar nombre y apellido
                partes = nombre_completo.split(" ", 1)
                nombre = partes[0]
                apellido = partes[1] if len(partes) > 1 else ""
                
                existente = await db.estudiantes_sincronizados.find_one(
                    {"numero_estudiante": numero}
                )
                
                estudiante_data = {
                    "numero_estudiante": numero,
                    "nombre_completo": nombre_completo,
                    "nombre": nombre,
                    "apellido": apellido,
                    "grado": str(grado),
                    "seccion": seccion,
                    "hoja_nombre": hoja_nombre,
                    "fila_numero": idx + 2,
                    "estado": "activo",
                    "import_id": import_id,
                    "fecha_sync": now,
                    "fecha_actualizacion": now
                }
                
                if existente:
                    if actualizar_existentes and not existente.get("override_local"):
                        await db.estudiantes_sincronizados.update_one(
                            {"sync_id": existente["sync_id"]},
                            {"$set": estudiante_data}
                        )
                        resultados["actualizados"] += 1
                    else:
                        resultados["omitidos"] += 1
                else:
                    estudiante_data["sync_id"] = f"sync_{uuid.uuid4().hex[:12]}"
                    estudiante_data["sheet_id"] = "manual_import"
                    estudiante_data["fecha_creacion"] = now
                    estudiante_data["override_local"] = False
                    
                    await db.estudiantes_sincronizados.insert_one(estudiante_data)
                    resultados["creados"] += 1
                    
            except Exception as e:
                resultados["errores"].append({
                    "fila": idx + 2,
                    "error": str(e)
                })
        
        # Registrar la importación
        import_log = {
            "import_id": import_id,
            "tipo": "estudiantes",
            "admin_id": admin_id,
            "hoja_nombre": hoja_nombre,
            "grado_default": grado_default,
            "resultados": {
                "creados": resultados["creados"],
                "actualizados": resultados["actualizados"],
                "omitidos": resultados["omitidos"],
                "errores": len(resultados["errores"])
            },
            "fecha": now
        }
        await db.import_logs.insert_one(import_log)
        
        return resultados
    
    async def preview_libros(
        self,
        raw_text: str,
        column_mapping: Dict[str, int],
        catalogo_id: str = None,
        grado_default: str = None
    ) -> Dict:
        """
        Previsualizar datos de libros/productos antes de importar.
        
        Args:
            raw_text: Texto pegado desde Google Sheets
            column_mapping: Mapeo de campos a índices de columna
                {
                    "codigo": 0,           # Código del libro
                    "nombre": 1,           # Name ofl libro
                    "precio": 2,           # Precio
                    "editorial": 3,        # Editorial (opcional)
                    "isbn": 4,             # ISBN (opcional)
                    "grado": 5,            # Grado (opcional si hay default)
                    "materia": 6           # Materia (opcional)
                }
        """
        parsed = self.parse_tsv(raw_text, has_headers=True)
        
        if not parsed["rows"]:
            return {
                "success": False,
                "error": "No se encontraron datos para importar",
                "preview": []
            }
        
        preview = []
        errores = []
        codigos_vistos = set()
        
        for idx, row in enumerate(parsed["rows"]):
            try:
                codigo = self._get_cell(row, column_mapping.get("codigo"))
                nombre = self._get_cell(row, column_mapping.get("nombre"))
                precio_str = self._get_cell(row, column_mapping.get("precio"))
                editorial = self._get_cell(row, column_mapping.get("editorial"))
                isbn = self._get_cell(row, column_mapping.get("isbn"))
                grado = self._get_cell(row, column_mapping.get("grado")) or grado_default
                materia = self._get_cell(row, column_mapping.get("materia"))
                
                # Validaciones
                if not codigo:
                    errores.append({"fila": idx + 2, "error": "Código vacío"})
                    continue
                
                if not nombre:
                    errores.append({"fila": idx + 2, "error": "Nombre vacío"})
                    continue
                
                # Parsear precio
                precio = self._parse_precio(precio_str)
                if precio is None:
                    errores.append({"fila": idx + 2, "error": f"Precio inválido: {precio_str}"})
                    continue
                
                # Verificar duplicados
                if codigo in codigos_vistos:
                    errores.append({"fila": idx + 2, "error": f"Código duplicado: {codigo}"})
                    continue
                codigos_vistos.add(codigo)
                
                # Verificar si already exists
                existente = await db.libros.find_one({"codigo": codigo})
                
                preview.append({
                    "fila": idx + 2,
                    "codigo": codigo,
                    "nombre": nombre,
                    "precio": precio,
                    "editorial": editorial,
                    "isbn": isbn,
                    "grado": grado,
                    "materia": materia,
                    "ya_existe": existente is not None,
                    "accion": "actualizar" if existente else "crear"
                })
                
            except Exception as e:
                errores.append({"fila": idx + 2, "error": str(e)})
        
        return {
            "success": True,
            "headers_detectados": parsed["headers"],
            "preview": preview,
            "resumen": {
                "total_filas": len(parsed["rows"]),
                "validos": len(preview),
                "nuevos": len([p for p in preview if not p["ya_existe"]]),
                "actualizaciones": len([p for p in preview if p["ya_existe"]]),
                "errores": len(errores)
            },
            "errores": errores
        }
    
    async def importar_libros(
        self,
        raw_text: str,
        column_mapping: Dict[str, int],
        catalogo_id: str = None,
        grado_default: str = None,
        actualizar_existentes: bool = True,
        admin_id: str = None
    ) -> Dict:
        """
        Importar libros/productos desde texto pegado.
        """
        parsed = self.parse_tsv(raw_text, has_headers=True)
        
        if not parsed["rows"]:
            return {
                "success": False,
                "error": "No se encontraron datos para importar"
            }
        
        now = datetime.now(timezone.utc).isoformat()
        import_id = f"import_{uuid.uuid4().hex[:12]}"
        
        resultados = {
            "success": True,
            "import_id": import_id,
            "creados": 0,
            "actualizados": 0,
            "omitidos": 0,
            "errores": []
        }
        
        codigos_procesados = set()
        
        for idx, row in enumerate(parsed["rows"]):
            try:
                codigo = self._get_cell(row, column_mapping.get("codigo"))
                nombre = self._get_cell(row, column_mapping.get("nombre"))
                precio_str = self._get_cell(row, column_mapping.get("precio"))
                editorial = self._get_cell(row, column_mapping.get("editorial"))
                isbn = self._get_cell(row, column_mapping.get("isbn"))
                grado = self._get_cell(row, column_mapping.get("grado")) or grado_default
                materia = self._get_cell(row, column_mapping.get("materia"))
                
                if not codigo or not nombre:
                    resultados["errores"].append({
                        "fila": idx + 2,
                        "error": "Datos incompletos"
                    })
                    continue
                
                precio = self._parse_precio(precio_str)
                if precio is None:
                    resultados["errores"].append({
                        "fila": idx + 2,
                        "error": f"Precio inválido: {precio_str}"
                    })
                    continue
                
                if codigo in codigos_procesados:
                    resultados["omitidos"] += 1
                    continue
                codigos_procesados.add(codigo)
                
                existente = await db.libros.find_one({"codigo": codigo})
                
                libro_data = {
                    "codigo": codigo,
                    "nombre": nombre,
                    "precio": precio,
                    "editorial": editorial,
                    "isbn": isbn,
                    "materia": materia,
                    "categoria": "texto_escolar",
                    "activo": True,
                    "estado_disponibilidad": "disponible",
                    "import_id": import_id,
                    "fecha_actualizacion": now
                }
                
                # Manejar grados (puede ser uno o varios)
                if grado:
                    if "," in str(grado):
                        libro_data["grados"] = [g.strip() for g in str(grado).split(",")]
                    else:
                        libro_data["grado"] = str(grado)
                        libro_data["grados"] = [str(grado)]
                
                if catalogo_id:
                    libro_data["catalogo_id"] = catalogo_id
                
                if existente:
                    if actualizar_existentes:
                        await db.libros.update_one(
                            {"libro_id": existente["libro_id"]},
                            {"$set": libro_data}
                        )
                        resultados["actualizados"] += 1
                    else:
                        resultados["omitidos"] += 1
                else:
                    libro_data["libro_id"] = f"libro_{uuid.uuid4().hex[:12]}"
                    libro_data["fecha_creacion"] = now
                    libro_data["cantidad_inventario"] = 0
                    libro_data["cantidad_reservada"] = 0
                    
                    await db.libros.insert_one(libro_data)
                    resultados["creados"] += 1
                    
            except Exception as e:
                resultados["errores"].append({
                    "fila": idx + 2,
                    "error": str(e)
                })
        
        # Registrar la importación
        import_log = {
            "import_id": import_id,
            "tipo": "libros",
            "admin_id": admin_id,
            "catalogo_id": catalogo_id,
            "grado_default": grado_default,
            "resultados": {
                "creados": resultados["creados"],
                "actualizados": resultados["actualizados"],
                "omitidos": resultados["omitidos"],
                "errores": len(resultados["errores"])
            },
            "fecha": now
        }
        await db.import_logs.insert_one(import_log)
        
        return resultados
    
    async def get_import_history(self, tipo: str = None, limit: int = 20) -> List[Dict]:
        """Get historial de importaciones"""
        query = {}
        if tipo:
            query["tipo"] = tipo
        
        cursor = db.import_logs.find(
            query,
            {"_id": 0}
        ).sort("fecha", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_grados_disponibles(self) -> List[str]:
        """Get lista de grados únicos de estudiantes importados"""
        pipeline = [
            {"$match": {"estado": "activo"}},
            {"$group": {"_id": "$grado"}},
            {"$sort": {"_id": 1}}
        ]
        result = await db.estudiantes_sincronizados.aggregate(pipeline).to_list(50)
        return [r["_id"] for r in result if r["_id"]]
    
    def _get_cell(self, row: List[str], index: Optional[int]) -> Optional[str]:
        """Get celda de una fila de forma segura"""
        if index is None or index < 0:
            return None
        if index >= len(row):
            return None
        value = row[index]
        return value if value else None
    
    def _parse_precio(self, precio_str: str) -> Optional[float]:
        """Parsear string de precio a float"""
        if not precio_str:
            return 0.0
        
        # Remove símbolos de moneda y espacios
        clean = re.sub(r'[^\d.,]', '', str(precio_str))
        
        if not clean:
            return 0.0
        
        # Manejar formato con coma como decimal (europeo)
        if ',' in clean and '.' not in clean:
            clean = clean.replace(',', '.')
        elif ',' in clean and '.' in clean:
            # Formato: 1,234.56 o 1.234,56
            if clean.rfind(',') > clean.rfind('.'):
                # Formato europeo: 1.234,56
                clean = clean.replace('.', '').replace(',', '.')
            else:
                # Formato americano: 1,234.56
                clean = clean.replace(',', '')
        
        try:
            return float(clean)
        except ValueError:
            return None


# Singleton
bulk_import_service = BulkImportService()
