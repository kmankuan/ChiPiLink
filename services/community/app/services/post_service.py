"""
Community Module - Post Service
Lógica de negocio para posts
"""
from typing import List, Optional, Dict

from core.base import BaseService
from core.events import event_bus, CommunityEvents
from ..repositories import PostRepository, CommentRepository
from ..models import Post, PostCreate, PostUpdate, Comment, CommentCreate


class PostService(BaseService):
    """
    Servicio para gestión de posts de comunidad.
    """
    
    MODULE_NAME = "community"
    
    def __init__(self):
        super().__init__()
        self.repository = PostRepository()
        self.comment_repository = CommentRepository()
    
    async def get_published_posts(
        self,
        tipo: Optional[str] = None,
        destacado: Optional[bool] = None,
        limit: int = 20
    ) -> List[Post]:
        """Obtener posts publicados"""
        results = await self.repository.get_published_posts(
            tipo=tipo,
            destacado=destacado,
            limit=limit
        )
        return [Post(**r) for r in results]
    
    async def get_post(self, post_id: str, increment_views: bool = False) -> Optional[Post]:
        """Obtener post por ID"""
        result = await self.repository.get_by_id(post_id)
        if result and increment_views:
            await self.repository.increment_views(post_id)
            result["vistas"] = result.get("vistas", 0) + 1
        return Post(**result) if result else None
    
    async def get_all_posts(self, limit: int = 100) -> List[Post]:
        """Obtener todos los posts (admin)"""
        results = await self.repository.get_all_posts(limit=limit)
        return [Post(**r) for r in results]
    
    async def create_post(self, data: PostCreate, creado_por: str = None) -> Post:
        """
        Crear nuevo post.
        Emite evento: community.post.created
        """
        post_dict = data.model_dump()
        post_dict["creado_por"] = creado_por
        post_dict["fuente"] = "admin"
        
        result = await self.repository.create(post_dict)
        
        await self.emit_event(
            CommunityEvents.POST_CREATED,
            {
                "post_id": result["post_id"],
                "titulo": result["titulo"],
                "tipo": result["tipo"]
            }
        )
        
        self.log_info(f"Post created: {result['post_id']}")
        return Post(**result)
    
    async def update_post(self, post_id: str, data: PostUpdate) -> Optional[Post]:
        """
        Actualizar post.
        Emite evento: community.post.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_post(post_id)
        
        success = await self.repository.update_post(post_id, update_data)
        
        if success:
            await self.emit_event(
                CommunityEvents.POST_UPDATED,
                {"post_id": post_id, "updated_fields": list(update_data.keys())}
            )
            return await self.get_post(post_id)
        
        return None
    
    async def like_post(self, post_id: str) -> bool:
        """Dar like a un post"""
        return await self.repository.increment_likes(post_id)
    
    async def delete_post(self, post_id: str) -> bool:
        """
        Eliminar post y sus comentarios.
        Emite evento: community.post.deleted
        """
        success = await self.repository.delete_post(post_id)
        
        if success:
            # Eliminar comentarios asociados
            await self.comment_repository.delete_post_comments(post_id)
            
            await self.emit_event(
                CommunityEvents.POST_DELETED,
                {"post_id": post_id}
            )
        
        return success
    
    # ============== COMMENTS ==============
    
    async def get_post_comments(self, post_id: str) -> List[Comment]:
        """Obtener comentarios de un post"""
        results = await self.comment_repository.get_post_comments(post_id)
        return [Comment(**r) for r in results]
    
    async def add_comment(
        self,
        post_id: str,
        data: CommentCreate,
        usuario_id: Optional[str] = None
    ) -> Comment:
        """Agregar comentario a un post"""
        # Verificar que el post existe y permite comentarios
        post = await self.repository.get_by_id(post_id)
        if not post:
            raise ValueError("Post no encontrado")
        if not post.get("permite_comentarios", True):
            raise ValueError("Este post no permite comentarios")
        
        comment_dict = data.model_dump()
        comment_dict["post_id"] = post_id
        comment_dict["usuario_id"] = usuario_id
        if not comment_dict.get("nombre_usuario"):
            comment_dict["nombre_usuario"] = "Anónimo"
        
        result = await self.comment_repository.create(comment_dict)
        return Comment(**result)


# Instancia singleton del servicio
post_service = PostService()
