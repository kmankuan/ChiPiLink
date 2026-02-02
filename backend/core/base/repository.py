"""
Base Repository - Capa de acceso a datos
Cada module tendrá su propio repository que hereda de esta clase base
"""
from typing import Dict, List, Optional, Any, TypeVar, Generic
from datetime import datetime, timezone
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """
    Clase base para repositorios.
    Abstrae el acceso a la base de datos para facilitar:
    - Testing con mocks
    - Migración a diferentes bases de datos
    - Separación en microservicios
    
    Cada module implementa su propio repository heredando de esta clase.
    """
    
    def __init__(self, db, collection_name: str):
        self.db = db
        self.collection_name = collection_name
        self._collection = db[collection_name]
    
    @property
    def collection(self):
        return self._collection
    
    async def find_by_id(self, id_field: str, id_value: str) -> Optional[Dict]:
        """Buscar documento por ID"""
        return await self._collection.find_one(
            {id_field: id_value},
            {"_id": 0}
        )
    
    async def find_one(
        self,
        query: Dict,
        exclude_fields: List[str] = None
    ) -> Optional[Dict]:
        """Buscar un documento por query"""
        projection = {"_id": 0}
        if exclude_fields:
            for field in exclude_fields:
                projection[field] = 0
        return await self._collection.find_one(query, projection)
    
    async def find_many(
        self,
        query: Dict = None,
        skip: int = 0,
        limit: int = 100,
        sort: List[tuple] = None,
        exclude_fields: List[str] = None
    ) -> List[Dict]:
        """Buscar multiple documentos"""
        query = query or {}
        projection = {"_id": 0}
        if exclude_fields:
            for field in exclude_fields:
                projection[field] = 0
        
        cursor = self._collection.find(query, projection)
        
        if sort:
            cursor = cursor.sort(sort)
        
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def count(self, query: Dict = None) -> int:
        """Contar documentos"""
        query = query or {}
        return await self._collection.count_documents(query)
    
    async def insert_one(self, document: Dict) -> Dict:
        """Insertar un documento"""
        document["created_at"] = datetime.now(timezone.utc).isoformat()
        document["updated_at"] = document["created_at"]
        await self._collection.insert_one(document)
        # Retornar sin _id
        document.pop("_id", None)
        return document
    
    async def update_one(
        self,
        query: Dict,
        update: Dict,
        upsert: bool = False
    ) -> bool:
        """Actualizar un documento"""
        update["$set"] = update.get("$set", {})
        update["$set"]["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self._collection.update_one(query, update, upsert=upsert)
        return result.modified_count > 0 or result.upserted_id is not None
    
    async def update_by_id(self, id_field: str, id_value: str, data: Dict) -> bool:
        """Actualizar documento por ID"""
        return await self.update_one(
            {id_field: id_value},
            {"$set": data}
        )
    
    async def delete_one(self, query: Dict) -> bool:
        """Eliminar un documento"""
        result = await self._collection.delete_one(query)
        return result.deleted_count > 0
    
    async def delete_by_id(self, id_field: str, id_value: str) -> bool:
        """Eliminar documento por ID"""
        return await self.delete_one({id_field: id_value})
    
    async def exists(self, query: Dict) -> bool:
        """Verificar si existe un documento"""
        doc = await self._collection.find_one(query, {"_id": 1})
        return doc is not None
    
    async def aggregate(self, pipeline: List[Dict]) -> List[Dict]:
        """Ejecutar pipeline de agregación"""
        cursor = self._collection.aggregate(pipeline)
        return await cursor.to_list(length=None)
