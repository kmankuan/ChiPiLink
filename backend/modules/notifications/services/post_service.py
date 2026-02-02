"""
Post Service - Management of posts/anuncios con editor avanzado
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import uuid

from core.database import db
from modules.notifications.models.notification_models import (
    ContentBlockType, NotificationStatus
)


class PostService:
    """Service for management of posts y anuncios"""
    
    def __init__(self):
        self.collection_posts = "chipi_posts"
        self.collection_media = "chipi_post_media"
        self.collection_scheduled = "chipi_scheduled_posts"
    
    def log_info(self, message: str):
        print(f"[PostService] {message}")
    
    # ============== POSTS ==============
    
    async def create_post(
        self,
        title: Dict[str, str],
        content_blocks: List[Dict],
        author_id: str,
        category_id: str = "cat_announcements",
        summary: Dict[str, str] = None,
        cover_image: str = None,
        tags: List[str] = None,
        target_audience: str = "all",
        target_user_types: List[str] = None,
        send_notification: bool = True,
        scheduled_at: str = None,
        metadata: Dict = None
    ) -> Dict:
        """Create un nuevo post"""
        now = datetime.now(timezone.utc).isoformat()
        
        post = {
            "post_id": f"post_{uuid.uuid4().hex[:8]}",
            "title": title,
            "summary": summary or {},
            "content_blocks": content_blocks,
            "cover_image": cover_image,
            "author_id": author_id,
            "category_id": category_id,
            "tags": tags or [],
            "target_audience": target_audience,
            "target_user_types": target_user_types or [],
            "send_notification": send_notification,
            "notification_sent": False,
            "status": NotificationStatus.SCHEDULED.value if scheduled_at else NotificationStatus.DRAFT.value,
            "scheduled_at": scheduled_at,
            "published_at": None,
            "metadata": metadata or {},
            "views": 0,
            "likes": 0,
            "created_at": now,
            "updated_at": now
        }
        
        await db[self.collection_posts].insert_one(post)
        post.pop("_id", None)
        
        self.log_info(f"Created post: {post['post_id']}")
        return post
    
    async def get_post(self, post_id: str) -> Optional[Dict]:
        """Get un post"""
        post = await db[self.collection_posts].find_one(
            {"post_id": post_id},
            {"_id": 0}
        )
        return post
    
    async def get_posts(
        self,
        status: str = None,
        category_id: str = None,
        author_id: str = None,
        tags: List[str] = None,
        limit: int = 50,
        offset: int = 0,
        published_only: bool = False
    ) -> List[Dict]:
        """Get posts con filtros"""
        query = {}
        
        if status:
            query["status"] = status
        if category_id:
            query["category_id"] = category_id
        if author_id:
            query["author_id"] = author_id
        if tags:
            query["tags"] = {"$in": tags}
        if published_only:
            query["status"] = NotificationStatus.SENT.value
        
        cursor = db[self.collection_posts].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def update_post(self, post_id: str, updates: Dict) -> Optional[Dict]:
        """Update un post"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_posts].find_one_and_update(
            {"post_id": post_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    async def publish_post(
        self,
        post_id: str,
        send_notification: bool = True
    ) -> Dict:
        """Publicar un post"""
        now = datetime.now(timezone.utc).isoformat()
        
        post = await self.update_post(post_id, {
            "status": NotificationStatus.SENT.value,
            "published_at": now,
            "send_notification": send_notification
        })
        
        if post and send_notification:
            # Send notification
            from modules.notifications.services.push_service import push_notification_service
            
            # Get title y resumen en espyearl como default
            title = post["title"].get("es", list(post["title"].values())[0])
            summary = post.get("summary", {}).get("es", "")
            
            if not summary and post.get("content_blocks"):
                # Extract primer párrafo como resumen
                for block in post["content_blocks"]:
                    if block.get("type") == ContentBlockType.PARAGRAPH.value:
                        text = block.get("content", "")
                        summary = text[:150] + "..." if len(text) > 150 else text
                        break
            
            result = await push_notification_service.send_to_all(
                category_id=post.get("category_id", "cat_announcements"),
                title=title,
                body=summary,
                data={"post_id": post_id},
                image_url=post.get("cover_image"),
                action_url=f"/announcements/{post_id}"
            )
            
            await self.update_post(post_id, {
                "notification_sent": True,
                "notification_result": result
            })
            
            self.log_info(f"Published post {post_id} with notification")
        
        return post
    
    async def delete_post(self, post_id: str) -> bool:
        """Delete un post (soft delete)"""
        result = await db[self.collection_posts].update_one(
            {"post_id": post_id},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def increment_views(self, post_id: str) -> int:
        """Incrementar vistas de un post"""
        result = await db[self.collection_posts].find_one_and_update(
            {"post_id": post_id},
            {"$inc": {"views": 1}},
            return_document=True
        )
        return result.get("views", 0) if result else 0
    
    async def like_post(self, post_id: str, user_id: str) -> Dict:
        """Give like a un post"""
        # TODO: Implementar tracking de likes by user
        result = await db[self.collection_posts].find_one_and_update(
            {"post_id": post_id},
            {"$inc": {"likes": 1}},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    # ============== MEDIA ==============
    
    async def upload_media(
        self,
        file_url: str,
        file_type: str,
        file_name: str,
        file_size: int,
        uploaded_by: str,
        post_id: str = None,
        metadata: Dict = None
    ) -> Dict:
        """Register media subido"""
        now = datetime.now(timezone.utc).isoformat()
        
        media = {
            "media_id": f"media_{uuid.uuid4().hex[:8]}",
            "file_url": file_url,
            "file_type": file_type,
            "file_name": file_name,
            "file_size": file_size,
            "post_id": post_id,
            "uploaded_by": uploaded_by,
            "metadata": metadata or {},
            "created_at": now
        }
        
        await db[self.collection_media].insert_one(media)
        media.pop("_id", None)
        
        return media
    
    async def get_media_library(
        self,
        file_type: str = None,
        uploaded_by: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get biblioteca de media"""
        query = {}
        if file_type:
            query["file_type"] = file_type
        if uploaded_by:
            query["uploaded_by"] = uploaded_by
        
        cursor = db[self.collection_media].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # ============== CONTENT BLOCKS ==============
    
    def create_paragraph_block(self, content: str, style: Dict = None) -> Dict:
        """Create bloque de párrafo"""
        return {
            "type": ContentBlockType.PARAGRAPH.value,
            "content": content,
            "style": style or {}
        }
    
    def create_heading_block(self, content: str, level: int = 1) -> Dict:
        """Create bloque de encabezado"""
        type_map = {
            1: ContentBlockType.HEADING_1.value,
            2: ContentBlockType.HEADING_2.value,
            3: ContentBlockType.HEADING_3.value
        }
        return {
            "type": type_map.get(level, ContentBlockType.HEADING_1.value),
            "content": content
        }
    
    def create_image_block(
        self,
        url: str,
        caption: Dict[str, str] = None,
        alt: str = None
    ) -> Dict:
        """Create bloque de imagen"""
        return {
            "type": ContentBlockType.IMAGE.value,
            "url": url,
            "caption": caption or {},
            "alt": alt or ""
        }
    
    def create_video_block(
        self,
        url: str,
        caption: Dict[str, str] = None,
        thumbnail: str = None
    ) -> Dict:
        """Create bloque de video"""
        return {
            "type": ContentBlockType.VIDEO.value,
            "url": url,
            "caption": caption or {},
            "thumbnail": thumbnail
        }
    
    def create_list_block(self, items: List[str], ordered: bool = False) -> Dict:
        """Create bloque de lista"""
        return {
            "type": ContentBlockType.NUMBERED_LIST.value if ordered else ContentBlockType.BULLET_LIST.value,
            "items": items
        }
    
    def create_quote_block(self, content: str, author: str = None) -> Dict:
        """Create bloque de cita"""
        return {
            "type": ContentBlockType.QUOTE.value,
            "content": content,
            "author": author
        }
    
    def create_callout_block(
        self,
        content: str,
        icon: str = "💡",
        style: str = "info"
    ) -> Dict:
        """Create bloque de callout"""
        return {
            "type": ContentBlockType.CALLOUT.value,
            "content": content,
            "icon": icon,
            "style": style  # info, warning, success, error
        }
    
    def create_button_block(
        self,
        text: Dict[str, str],
        url: str,
        style: str = "primary"
    ) -> Dict:
        """Create bloque de botón"""
        return {
            "type": ContentBlockType.BUTTON.value,
            "text": text,
            "url": url,
            "style": style
        }
    
    def create_embed_block(self, url: str, provider: str = None) -> Dict:
        """Create bloque de embed"""
        return {
            "type": ContentBlockType.EMBED.value,
            "url": url,
            "provider": provider  # youtube, twitter, etc.
        }
    
    def create_divider_block(self) -> Dict:
        """Create bloque separador"""
        return {"type": ContentBlockType.DIVIDER.value}
    
    # ============== SCHEDULED POSTS ==============
    
    async def get_pending_scheduled_posts(self) -> List[Dict]:
        """Get posts programados pendientes de publicar"""
        now = datetime.now(timezone.utc).isoformat()
        
        cursor = db[self.collection_posts].find(
            {
                "status": NotificationStatus.SCHEDULED.value,
                "scheduled_at": {"$lte": now}
            },
            {"_id": 0}
        )
        
        return await cursor.to_list(length=100)
    
    async def process_scheduled_posts(self) -> Dict:
        """Process posts programados (ejecutar en cron/scheduler)"""
        pending = await self.get_pending_scheduled_posts()
        
        results = {
            "processed": 0,
            "errors": 0
        }
        
        for post in pending:
            try:
                await self.publish_post(
                    post_id=post["post_id"],
                    send_notification=post.get("send_notification", True)
                )
                results["processed"] += 1
            except Exception as e:
                self.log_info(f"Error publishing scheduled post {post['post_id']}: {e}")
                results["errors"] += 1
        
        return results
    
    # ============== INTEGRATIONS PLACEHOLDERS ==============
    
    async def import_from_monday(
        self,
        board_id: str,
        item_id: str,
        author_id: str
    ) -> Optional[Dict]:
        """
        [PLACEHOLDER] Importar contenido desde Monday.com
        TODO: Implementar integration con Monday.com API
        """
        self.log_info(f"Monday.com import placeholder - Board: {board_id}, Item: {item_id}")
        return {
            "success": False,
            "message": "Monday.com integration not yet implemented",
            "placeholder": True
        }
    
    async def import_from_fusebase(
        self,
        document_id: str,
        author_id: str
    ) -> Optional[Dict]:
        """
        [PLACEHOLDER] Importar contenido desde Fusebase
        TODO: Implementar integration con Fusebase API
        """
        self.log_info(f"Fusebase import placeholder - Document: {document_id}")
        return {
            "success": False,
            "message": "Fusebase integration not yet implemented",
            "placeholder": True
        }
    
    async def sync_crm_scheduled_content(self) -> Dict:
        """
        [PLACEHOLDER] Sincronizar contenido programado desde CRM
        TODO: Implementar webhook/polling para Monday.com y Fusebase
        """
        self.log_info("CRM sync placeholder")
        return {
            "success": False,
            "message": "CRM sync not yet implemented",
            "placeholder": True
        }


# Singleton
post_service = PostService()
