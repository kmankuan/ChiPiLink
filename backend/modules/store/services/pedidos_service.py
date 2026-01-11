"""
Store Module - Servicio de Pedidos de Libros Escolares
Maneja el flujo completo de pre-pedidos con restricciones
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from .vinculacion_service import vinculacion_service

logger = logging.getLogger(__name__)


class PedidosService:
    """Servicio para gestión de pedidos de libros escolares"""
    
    def __init__(self):
        self.ano_escolar_actual = "2025-2026"
    
    async def obtener_vista_previa_pedido(
        self,
        estudiante_sync_id: str,
        acudiente_cliente_id: str,
        ano_escolar: str = None
    ) -> Dict:
        """
        Obtener vista previa del pedido para un estudiante.
        Muestra todos los libros requeridos para su grado y cuáles ya están pedidos.
        """
        ano = ano_escolar or self.ano_escolar_actual
        
        # Verificar vinculación
        vinculacion = await db.vinculaciones.find_one({
            "estudiante_sync_id": estudiante_sync_id,
            "acudiente_cliente_id": acudiente_cliente_id,
            "estado": "aprobada",
            "activo": True
        })
        
        if not vinculacion:
            return {
                "success": False,
                "error": "No tienes vinculación aprobada con este estudiante"
            }
        
        # Obtener datos del estudiante
        estudiante = await db.estudiantes_sincronizados.find_one(
            {"sync_id": estudiante_sync_id},
            {"_id": 0}
        )
        
        if not estudiante:
            return {
                "success": False,
                "error": "Estudiante no encontrado"
            }
        
        grado = estudiante.get("grado")
        
        # Obtener libros para este grado
        libros_cursor = db.libros.find(
            {
                "$or": [
                    {"grado": grado},
                    {"grados": grado}
                ],
                "activo": True
            },
            {"_id": 0}
        )
        libros_grado = await libros_cursor.to_list(100)
        
        # Obtener pedidos existentes del estudiante para este año
        pedidos_existentes = await db.pedidos_libros.find(
            {
                "estudiante_sync_id": estudiante_sync_id,
                "ano_escolar": ano,
                "estado": {"$nin": ["cancelado"]}
            },
            {"_id": 0}
        ).to_list(100)
        
        # Crear set de libros ya pedidos
        libros_pedidos_map = {}  # libro_id -> {pedido_id, estado}
        for pedido in pedidos_existentes:
            for item in pedido.get("items", []):
                if item.get("estado") != "cancelado":
                    libros_pedidos_map[item["libro_id"]] = {
                        "pedido_id": pedido["pedido_id"],
                        "estado": item.get("estado", "pendiente"),
                        "estado_pedido": pedido["estado"]
                    }
        
        # Clasificar libros
        libros_requeridos = []
        libros_pendientes = []
        libros_ya_pedidos = []
        
        total_estimado = 0.0
        total_pendiente = 0.0
        
        for libro in libros_grado:
            libro_id = libro["libro_id"]
            precio = libro.get("precio", 0)
            total_estimado += precio
            
            libro_info = {
                "libro_id": libro_id,
                "codigo": libro.get("codigo", ""),
                "nombre": libro.get("nombre", ""),
                "precio": precio,
                "editorial": libro.get("editorial"),
                "materia": libro.get("materia"),
                "estado_disponibilidad": libro.get("estado_disponibilidad", "disponible"),
                "ya_pedido": libro_id in libros_pedidos_map,
                "pedido_id": libros_pedidos_map.get(libro_id, {}).get("pedido_id"),
                "estado_pedido": libros_pedidos_map.get(libro_id, {}).get("estado_pedido")
            }
            
            libros_requeridos.append(libro_info)
            
            if libro_id in libros_pedidos_map:
                libros_ya_pedidos.append(libro_info)
            else:
                libros_pendientes.append(libro_info)
                total_pendiente += precio
        
        return {
            "success": True,
            "estudiante": {
                "sync_id": estudiante_sync_id,
                "numero": estudiante.get("numero_estudiante"),
                "nombre": estudiante.get("nombre_completo"),
                "grado": grado,
                "seccion": estudiante.get("seccion")
            },
            "ano_escolar": ano,
            "libros_requeridos": libros_requeridos,
            "libros_pendientes": libros_pendientes,
            "libros_ya_pedidos": libros_ya_pedidos,
            "resumen": {
                "total_libros": len(libros_requeridos),
                "libros_pedidos": len(libros_ya_pedidos),
                "libros_faltantes": len(libros_pendientes)
            },
            "total_estimado": total_estimado,
            "total_pendiente": total_pendiente,
            "puede_ordenar": len(libros_pendientes) > 0,
            "mensaje": None if libros_pendientes else "Ya tienes todos los libros pedidos para este año"
        }
    
    async def crear_pedido(
        self,
        estudiante_sync_id: str,
        acudiente_cliente_id: str,
        ano_escolar: str = None,
        tipo: str = "pre_orden"
    ) -> Dict:
        """Crear un nuevo pedido (borrador)"""
        ano = ano_escolar or self.ano_escolar_actual
        
        # Verificar vinculación
        vinculacion = await db.vinculaciones.find_one({
            "estudiante_sync_id": estudiante_sync_id,
            "acudiente_cliente_id": acudiente_cliente_id,
            "estado": "aprobada",
            "activo": True
        })
        
        if not vinculacion:
            raise ValueError("No tienes vinculación aprobada con este estudiante")
        
        # Verificar que no haya pedido borrador activo
        pedido_existente = await db.pedidos_libros.find_one({
            "estudiante_sync_id": estudiante_sync_id,
            "acudiente_cliente_id": acudiente_cliente_id,
            "ano_escolar": ano,
            "estado": "borrador"
        })
        
        if pedido_existente:
            return {
                "success": True,
                "pedido_id": pedido_existente["pedido_id"],
                "mensaje": "Ya tienes un pedido en borrador",
                "es_existente": True
            }
        
        # Obtener datos del estudiante
        estudiante = await db.estudiantes_sincronizados.find_one(
            {"sync_id": estudiante_sync_id},
            {"_id": 0}
        )
        
        if not estudiante:
            raise ValueError("Estudiante no encontrado")
        
        now = datetime.now(timezone.utc).isoformat()
        pedido_id = f"ped_{uuid.uuid4().hex[:12]}"
        
        pedido = {
            "pedido_id": pedido_id,
            "estudiante_sync_id": estudiante_sync_id,
            "estudiante_nombre": estudiante.get("nombre_completo"),
            "estudiante_grado": estudiante.get("grado"),
            "estudiante_numero": estudiante.get("numero_estudiante"),
            "acudiente_cliente_id": acudiente_cliente_id,
            "ano_escolar": ano,
            "tipo": tipo,
            "estado": "borrador",
            "items": [],
            "subtotal": 0.0,
            "descuento": 0.0,
            "total": 0.0,
            "fecha_creacion": now,
            "fecha_actualizacion": now
        }
        
        await db.pedidos_libros.insert_one(pedido)
        pedido.pop("_id", None)
        
        return {
            "success": True,
            "pedido_id": pedido_id,
            "pedido": pedido,
            "es_existente": False
        }
    
    async def agregar_item(
        self,
        pedido_id: str,
        libro_id: str,
        acudiente_cliente_id: str,
        cantidad: int = 1,
        nota: str = None
    ) -> Dict:
        """Agregar un libro al pedido"""
        
        # Obtener pedido
        pedido = await db.pedidos_libros.find_one({
            "pedido_id": pedido_id,
            "acudiente_cliente_id": acudiente_cliente_id
        })
        
        if not pedido:
            raise ValueError("Pedido no encontrado")
        
        if pedido["estado"] not in ["borrador"]:
            raise ValueError("Solo puedes modificar pedidos en borrador")
        
        # Verificar si el libro ya está en el pedido
        for item in pedido.get("items", []):
            if item["libro_id"] == libro_id and item["estado"] != "cancelado":
                raise ValueError("Este libro ya está en el pedido")
        
        # Verificar restricción: un libro por estudiante por año
        pedido_existente = await db.pedidos_libros.find_one({
            "estudiante_sync_id": pedido["estudiante_sync_id"],
            "ano_escolar": pedido["ano_escolar"],
            "estado": {"$nin": ["cancelado", "borrador"]},
            "items.libro_id": libro_id,
            "items.estado": {"$ne": "cancelado"}
        })
        
        if pedido_existente and pedido_existente["pedido_id"] != pedido_id:
            raise ValueError("Este estudiante ya tiene este libro pedido para este año escolar")
        
        # Obtener libro
        libro = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
        if not libro:
            raise ValueError("Libro no encontrado")
        
        if not libro.get("activo", True):
            raise ValueError("Este libro no está disponible")
        
        # Verificar que el libro es para el grado del estudiante
        grado_estudiante = pedido.get("estudiante_grado")
        libro_grados = libro.get("grados", [libro.get("grado")])
        
        if grado_estudiante not in libro_grados:
            raise ValueError(f"Este libro no corresponde al grado del estudiante ({grado_estudiante})")
        
        now = datetime.now(timezone.utc).isoformat()
        precio = libro.get("precio", 0)
        
        item = {
            "item_id": f"item_{uuid.uuid4().hex[:8]}",
            "libro_id": libro_id,
            "libro_codigo": libro.get("codigo"),
            "libro_nombre": libro.get("nombre"),
            "cantidad": cantidad,
            "precio_unitario": precio,
            "subtotal": precio * cantidad,
            "estado": "pendiente",
            "nota": nota,
            "fecha_agregado": now
        }
        
        # Actualizar pedido
        items = pedido.get("items", [])
        items.append(item)
        
        subtotal = sum(i["subtotal"] for i in items if i["estado"] != "cancelado")
        descuento = pedido.get("descuento", 0)
        total = subtotal - descuento
        
        await db.pedidos_libros.update_one(
            {"pedido_id": pedido_id},
            {
                "$set": {
                    "items": items,
                    "subtotal": subtotal,
                    "total": total,
                    "fecha_actualizacion": now
                }
            }
        )
        
        return {
            "success": True,
            "item": item,
            "subtotal": subtotal,
            "total": total
        }
    
    async def quitar_item(
        self,
        pedido_id: str,
        item_id: str,
        acudiente_cliente_id: str
    ) -> Dict:
        """Quitar un item del pedido"""
        
        pedido = await db.pedidos_libros.find_one({
            "pedido_id": pedido_id,
            "acudiente_cliente_id": acudiente_cliente_id
        })
        
        if not pedido:
            raise ValueError("Pedido no encontrado")
        
        if pedido["estado"] not in ["borrador"]:
            raise ValueError("Solo puedes modificar pedidos en borrador")
        
        items = pedido.get("items", [])
        items = [i for i in items if i["item_id"] != item_id]
        
        now = datetime.now(timezone.utc).isoformat()
        subtotal = sum(i["subtotal"] for i in items if i["estado"] != "cancelado")
        descuento = pedido.get("descuento", 0)
        total = subtotal - descuento
        
        await db.pedidos_libros.update_one(
            {"pedido_id": pedido_id},
            {
                "$set": {
                    "items": items,
                    "subtotal": subtotal,
                    "total": total,
                    "fecha_actualizacion": now
                }
            }
        )
        
        return {
            "success": True,
            "subtotal": subtotal,
            "total": total
        }
    
    async def agregar_todos_libros_faltantes(
        self,
        pedido_id: str,
        acudiente_cliente_id: str
    ) -> Dict:
        """Agregar todos los libros faltantes del grado al pedido"""
        
        pedido = await db.pedidos_libros.find_one({
            "pedido_id": pedido_id,
            "acudiente_cliente_id": acudiente_cliente_id
        })
        
        if not pedido:
            raise ValueError("Pedido no encontrado")
        
        if pedido["estado"] not in ["borrador"]:
            raise ValueError("Solo puedes modificar pedidos en borrador")
        
        # Obtener vista previa
        preview = await self.obtener_vista_previa_pedido(
            pedido["estudiante_sync_id"],
            acudiente_cliente_id,
            pedido["ano_escolar"]
        )
        
        if not preview.get("success"):
            raise ValueError(preview.get("error", "Error obteniendo libros"))
        
        agregados = 0
        errores = []
        
        for libro in preview.get("libros_pendientes", []):
            try:
                # Verificar que no esté ya en este pedido
                ya_en_pedido = any(
                    i["libro_id"] == libro["libro_id"] and i["estado"] != "cancelado"
                    for i in pedido.get("items", [])
                )
                
                if not ya_en_pedido:
                    await self.agregar_item(
                        pedido_id,
                        libro["libro_id"],
                        acudiente_cliente_id
                    )
                    agregados += 1
            except ValueError as e:
                errores.append({"libro": libro["nombre"], "error": str(e)})
        
        # Obtener pedido actualizado
        pedido = await db.pedidos_libros.find_one(
            {"pedido_id": pedido_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "agregados": agregados,
            "errores": errores,
            "pedido": pedido
        }
    
    async def confirmar_pedido(
        self,
        pedido_id: str,
        acudiente_cliente_id: str,
        acepto_terminos: bool = True,
        notas: str = None
    ) -> Dict:
        """Confirmar un pedido (pasarlo de borrador a pre_orden)"""
        
        pedido = await db.pedidos_libros.find_one({
            "pedido_id": pedido_id,
            "acudiente_cliente_id": acudiente_cliente_id
        })
        
        if not pedido:
            raise ValueError("Pedido no encontrado")
        
        if pedido["estado"] != "borrador":
            raise ValueError("Este pedido ya fue confirmado")
        
        if not pedido.get("items"):
            raise ValueError("El pedido no tiene items")
        
        if not acepto_terminos:
            raise ValueError("Debes aceptar los términos y condiciones")
        
        now = datetime.now(timezone.utc).isoformat()
        nuevo_estado = "pre_orden" if pedido.get("tipo") == "pre_orden" else "confirmado"
        
        await db.pedidos_libros.update_one(
            {"pedido_id": pedido_id},
            {
                "$set": {
                    "estado": nuevo_estado,
                    "notas": notas,
                    "acepto_terminos": True,
                    "fecha_confirmacion": now,
                    "fecha_actualizacion": now
                }
            }
        )
        
        return {
            "success": True,
            "estado": nuevo_estado,
            "mensaje": "Pre-orden registrada exitosamente" if nuevo_estado == "pre_orden" else "Pedido confirmado"
        }
    
    async def obtener_mis_pedidos(
        self,
        acudiente_cliente_id: str,
        estudiante_sync_id: str = None,
        ano_escolar: str = None,
        estado: str = None
    ) -> List[Dict]:
        """Obtener pedidos del acudiente"""
        
        query = {"acudiente_cliente_id": acudiente_cliente_id}
        
        if estudiante_sync_id:
            query["estudiante_sync_id"] = estudiante_sync_id
        if ano_escolar:
            query["ano_escolar"] = ano_escolar
        if estado:
            query["estado"] = estado
        
        cursor = db.pedidos_libros.find(query, {"_id": 0}).sort("fecha_creacion", -1)
        return await cursor.to_list(100)
    
    async def obtener_pedido(
        self,
        pedido_id: str,
        acudiente_cliente_id: str = None
    ) -> Dict:
        """Obtener un pedido específico"""
        
        query = {"pedido_id": pedido_id}
        if acudiente_cliente_id:
            query["acudiente_cliente_id"] = acudiente_cliente_id
        
        pedido = await db.pedidos_libros.find_one(query, {"_id": 0})
        return pedido
    
    async def cancelar_pedido(
        self,
        pedido_id: str,
        acudiente_cliente_id: str,
        motivo: str = None
    ) -> Dict:
        """Cancelar un pedido"""
        
        pedido = await db.pedidos_libros.find_one({
            "pedido_id": pedido_id,
            "acudiente_cliente_id": acudiente_cliente_id
        })
        
        if not pedido:
            raise ValueError("Pedido no encontrado")
        
        if pedido["estado"] in ["entregado", "cancelado"]:
            raise ValueError("Este pedido no puede ser cancelado")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.pedidos_libros.update_one(
            {"pedido_id": pedido_id},
            {
                "$set": {
                    "estado": "cancelado",
                    "motivo_cancelacion": motivo,
                    "fecha_cancelacion": now,
                    "fecha_actualizacion": now
                }
            }
        )
        
        return {"success": True, "mensaje": "Pedido cancelado"}
    
    # ============== ADMIN METHODS ==============
    
    async def admin_obtener_demanda_agregada(
        self,
        ano_escolar: str = None,
        grado: str = None
    ) -> Dict:
        """Obtener demanda agregada de libros para planificación"""
        
        ano = ano_escolar or self.ano_escolar_actual
        
        # Pipeline de agregación
        match_stage = {
            "ano_escolar": ano,
            "estado": {"$in": ["pre_orden", "confirmado", "en_proceso"]}
        }
        
        if grado:
            match_stage["estudiante_grado"] = grado
        
        pipeline = [
            {"$match": match_stage},
            {"$unwind": "$items"},
            {"$match": {"items.estado": {"$ne": "cancelado"}}},
            {"$group": {
                "_id": "$items.libro_id",
                "libro_codigo": {"$first": "$items.libro_codigo"},
                "libro_nombre": {"$first": "$items.libro_nombre"},
                "precio_unitario": {"$first": "$items.precio_unitario"},
                "cantidad_total": {"$sum": "$items.cantidad"},
                "cantidad_pre_ordenes": {
                    "$sum": {"$cond": [{"$eq": ["$estado", "pre_orden"]}, "$items.cantidad", 0]}
                },
                "cantidad_confirmados": {
                    "$sum": {"$cond": [{"$in": ["$estado", ["confirmado", "en_proceso"]]}, "$items.cantidad", 0]}
                },
                "estudiantes": {"$addToSet": "$estudiante_sync_id"},
                "grados": {"$addToSet": "$estudiante_grado"}
            }},
            {"$sort": {"cantidad_total": -1}}
        ]
        
        resultados = await db.pedidos_libros.aggregate(pipeline).to_list(500)
        
        # Enriquecer con datos del libro
        libros = []
        valor_total = 0
        total_pre_ordenes = 0
        total_confirmados = 0
        estudiantes_set = set()
        
        for r in resultados:
            libro = await db.libros.find_one({"libro_id": r["_id"]}, {"_id": 0})
            
            valor_libro = r["cantidad_total"] * r["precio_unitario"]
            valor_total += valor_libro
            total_pre_ordenes += r["cantidad_pre_ordenes"]
            total_confirmados += r["cantidad_confirmados"]
            estudiantes_set.update(r.get("estudiantes", []))
            
            libros.append({
                "libro_id": r["_id"],
                "codigo": r["libro_codigo"] or (libro.get("codigo") if libro else ""),
                "nombre": r["libro_nombre"] or (libro.get("nombre") if libro else ""),
                "editorial": libro.get("editorial") if libro else None,
                "grados": r["grados"],
                "cantidad_pre_ordenes": r["cantidad_pre_ordenes"],
                "cantidad_confirmados": r["cantidad_confirmados"],
                "cantidad_total": r["cantidad_total"],
                "precio_unitario": r["precio_unitario"],
                "valor_total": valor_libro
            })
        
        return {
            "ano_escolar": ano,
            "fecha_corte": datetime.now(timezone.utc).isoformat(),
            "total_pre_ordenes": total_pre_ordenes,
            "total_confirmados": total_confirmados,
            "total_estudiantes": len(estudiantes_set),
            "valor_total_estimado": valor_total,
            "libros": libros
        }
    
    async def admin_obtener_todos_pedidos(
        self,
        ano_escolar: str = None,
        estado: str = None,
        grado: str = None,
        limit: int = 100,
        skip: int = 0
    ) -> Dict:
        """Obtener todos los pedidos con filtros"""
        
        query = {}
        if ano_escolar:
            query["ano_escolar"] = ano_escolar
        if estado:
            query["estado"] = estado
        if grado:
            query["estudiante_grado"] = grado
        
        total = await db.pedidos_libros.count_documents(query)
        
        cursor = db.pedidos_libros.find(
            query,
            {"_id": 0}
        ).sort("fecha_creacion", -1).skip(skip).limit(limit)
        
        pedidos = await cursor.to_list(limit)
        
        # Enriquecer con datos del acudiente
        for pedido in pedidos:
            acudiente = await db.clientes.find_one(
                {"cliente_id": pedido["acudiente_cliente_id"]},
                {"_id": 0, "nombre": 1, "email": 1}
            )
            pedido["acudiente"] = acudiente
        
        return {
            "total": total,
            "pedidos": pedidos,
            "pagina": skip // limit + 1 if limit > 0 else 1,
            "total_paginas": (total + limit - 1) // limit if limit > 0 else 1
        }
    
    async def admin_actualizar_estado_pedido(
        self,
        pedido_id: str,
        nuevo_estado: str,
        admin_id: str,
        notas: str = None
    ) -> Dict:
        """Actualizar estado de un pedido (admin)"""
        
        estados_validos = ["borrador", "pre_orden", "confirmado", "en_proceso", "listo_retiro", "entregado", "cancelado"]
        if nuevo_estado not in estados_validos:
            raise ValueError(f"Estado inválido. Válidos: {estados_validos}")
        
        pedido = await db.pedidos_libros.find_one({"pedido_id": pedido_id})
        if not pedido:
            raise ValueError("Pedido no encontrado")
        
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "estado": nuevo_estado,
            "fecha_actualizacion": now,
            "ultimo_cambio_por": admin_id
        }
        
        if notas:
            update_data["notas_admin"] = notas
        
        if nuevo_estado == "entregado":
            update_data["fecha_entrega"] = now
        
        await db.pedidos_libros.update_one(
            {"pedido_id": pedido_id},
            {"$set": update_data}
        )
        
        return {"success": True, "estado": nuevo_estado}


# Singleton
pedidos_service = PedidosService()
