"""
CRM Chat Service
Multi-topic customer chat backed by Monday.com Admin Customers board.
Each student is linked to a Monday.com item; topics = Updates, messages = Replies.
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import uuid

from core.database import db
from ..integrations.monday_crm_adapter import crm_monday_adapter

logger = logging.getLogger(__name__)

LINK_COLLECTION = "crm_student_links"
LOCAL_MESSAGES_COLLECTION = "crm_chat_messages"


class CrmChatService:

    # ---------- Student ↔ Monday.com item linking ----------

    async def _get_link(self, student_id: str) -> Optional[Dict]:
        """Get cached link between a student and their CRM Monday.com item"""
        return await db[LINK_COLLECTION].find_one(
            {"student_id": student_id}, {"_id": 0}
        )

    async def _save_link(self, student_id: str, monday_item_id: str, user_email: str) -> None:
        await db[LINK_COLLECTION].update_one(
            {"student_id": student_id},
            {"$set": {
                "student_id": student_id,
                "monday_item_id": monday_item_id,
                "user_email": user_email,
                "linked_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

    async def _resolve_monday_item(self, student_id: str, user_id: str) -> Optional[str]:
        """Resolve the Monday.com CRM item ID for a student. Uses cache or auto-links by email."""
        link = await self._get_link(student_id)
        if link:
            return link["monday_item_id"]

        # Try auto-link via user email
        user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "email": 1})
        if not user or not user.get("email"):
            return None

        item = await crm_monday_adapter.find_item_by_email(user["email"])
        if not item:
            return None

        item_id = str(item.get("id"))
        await self._save_link(student_id, item_id, user["email"])
        logger.info(f"Auto-linked student {student_id} to CRM item {item_id}")
        return item_id

    # ---------- Topics (Monday.com Updates) ----------

    async def get_topics(self, student_id: str, user_id: str) -> Dict:
        """Get all chat topics for a student"""
        # Verify student belongs to user
        student = await db.store_students.find_one(
            {"student_id": student_id}, {"_id": 0, "user_id": 1, "full_name": 1}
        )
        if not student:
            raise ValueError("Student not found")
        if student.get("user_id") != user_id:
            raise ValueError("Access denied")

        item_id = await self._resolve_monday_item(student_id, user_id)
        if not item_id:
            return {
                "topics": [],
                "monday_linked": False,
                "student_name": student.get("full_name", ""),
            }

        topics = await crm_monday_adapter.get_topics(item_id)

        # Merge local messages into topics
        local_msgs = await db[LOCAL_MESSAGES_COLLECTION].find(
            {"student_id": student_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(500)

        # Group local messages by topic_id
        local_by_topic = {}
        local_standalone = []
        for msg in local_msgs:
            tid = msg.get("topic_id")
            if tid:
                local_by_topic.setdefault(tid, []).append(msg)
            else:
                local_standalone.append(msg)

        # Enrich topics with local message tracking
        for topic in topics:
            topic["local_replies"] = local_by_topic.get(topic["id"], [])

        return {
            "topics": topics,
            "monday_linked": True,
            "monday_item_id": item_id,
            "student_name": student.get("full_name", ""),
        }

    async def get_topic_replies(self, student_id: str, update_id: str, user_id: str) -> Dict:
        """Get replies for a specific topic"""
        student = await db.store_students.find_one(
            {"student_id": student_id}, {"_id": 0, "user_id": 1}
        )
        if not student:
            raise ValueError("Student not found")
        if student.get("user_id") != user_id:
            raise ValueError("Access denied")

        item_id = await self._resolve_monday_item(student_id, user_id)
        if not item_id:
            raise ValueError("Student not linked to CRM")

        # Fetch full topic with replies from Monday.com
        all_topics = await crm_monday_adapter.get_topics(item_id)
        topic = next((t for t in all_topics if str(t["id"]) == str(update_id)), None)
        if not topic:
            raise ValueError("Topic not found")

        return topic

    async def create_topic(self, student_id: str, user_id: str, subject: str, message: str) -> Dict:
        """Create a new chat topic (Monday.com Update)"""
        student = await db.store_students.find_one(
            {"student_id": student_id}, {"_id": 0, "user_id": 1, "full_name": 1}
        )
        if not student:
            raise ValueError("Student not found")
        if student.get("user_id") != user_id:
            raise ValueError("Access denied")

        item_id = await self._resolve_monday_item(student_id, user_id)
        if not item_id:
            raise ValueError("Student not linked to CRM board. Please contact support.")

        user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
        author_name = user.get("name", "Client") if user else "Client"

        # Build the update body with subject + message
        body = f"[{subject}]\n\nFrom: {author_name}\n{message}"

        update_id = await crm_monday_adapter.create_topic(item_id, body)
        if not update_id:
            raise ValueError("Failed to create topic on Monday.com")

        # Store local record
        msg_doc = {
            "message_id": f"crm_{uuid.uuid4().hex[:12]}",
            "student_id": student_id,
            "monday_item_id": item_id,
            "topic_id": update_id,
            "user_id": user_id,
            "author_name": author_name,
            "subject": subject,
            "message": message,
            "is_staff": False,
            "is_topic_creator": True,
            "read_by": [user_id],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db[LOCAL_MESSAGES_COLLECTION].insert_one(msg_doc)
        del msg_doc["_id"]

        return {
            "success": True,
            "topic_id": update_id,
            "message": msg_doc,
        }

    async def reply_to_topic(self, student_id: str, update_id: str, user_id: str, message: str) -> Dict:
        """Reply to an existing topic"""
        student = await db.store_students.find_one(
            {"student_id": student_id}, {"_id": 0, "user_id": 1}
        )
        if not student:
            raise ValueError("Student not found")
        if student.get("user_id") != user_id:
            raise ValueError("Access denied")

        item_id = await self._resolve_monday_item(student_id, user_id)
        if not item_id:
            raise ValueError("Student not linked to CRM board")

        user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "name": 1})
        author_name = user.get("name", "Client") if user else "Client"

        body = f"[{author_name}]: {message}"
        reply_id = await crm_monday_adapter.reply_to_topic(item_id, update_id, body)

        monday_posted = bool(reply_id)

        msg_doc = {
            "message_id": f"crm_{uuid.uuid4().hex[:12]}",
            "student_id": student_id,
            "monday_item_id": item_id,
            "topic_id": update_id,
            "reply_monday_id": reply_id,
            "user_id": user_id,
            "author_name": author_name,
            "message": message,
            "is_staff": False,
            "monday_posted": monday_posted,
            "read_by": [user_id],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db[LOCAL_MESSAGES_COLLECTION].insert_one(msg_doc)
        del msg_doc["_id"]

        return {"success": True, "monday_posted": monday_posted, "message": msg_doc}

    # ---------- Admin methods ----------

    async def get_admin_inbox(self) -> Dict:
        """Get all CRM chat conversations for admin view — aggregated across students"""
        links = await db[LINK_COLLECTION].find({}, {"_id": 0}).to_list(200)
        if not links:
            return {"conversations": [], "total": 0}

        conversations = []
        for link in links:
            student_id = link["student_id"]
            item_id = link["monday_item_id"]

            student = await db.store_students.find_one(
                {"student_id": student_id},
                {"_id": 0, "full_name": 1, "user_id": 1}
            )
            student_name = student.get("full_name", "Unknown") if student else "Unknown"

            # Get user info
            user_id = student.get("user_id") if student else None
            user_email = ""
            if user_id:
                user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "email": 1})
                user_email = user.get("email", "") if user else ""

            # Get latest topic from Monday.com
            try:
                topics = await crm_monday_adapter.get_topics(item_id)
            except Exception as e:
                logger.error(f"Error fetching topics for {student_id}: {e}")
                topics = []

            # Count unread (local messages not read by admin)
            unread = await db[LOCAL_MESSAGES_COLLECTION].count_documents({
                "student_id": student_id,
                "is_staff": False,
                "read_by": {"$not": {"$elemMatch": {"$eq": "admin"}}},
            })

            last_topic = topics[0] if topics else None

            conversations.append({
                "student_id": student_id,
                "student_name": student_name,
                "user_email": user_email,
                "monday_item_id": item_id,
                "topic_count": len(topics),
                "unread_count": unread,
                "last_topic": {
                    "id": last_topic["id"],
                    "body": last_topic["body"][:100],
                    "author": last_topic["author"],
                    "created_at": last_topic["created_at"],
                    "reply_count": last_topic["reply_count"],
                } if last_topic else None,
            })

        # Sort by most recent activity
        conversations.sort(
            key=lambda c: c["last_topic"]["created_at"] if c.get("last_topic") else "",
            reverse=True,
        )

        return {"conversations": conversations, "total": len(conversations)}

    async def admin_get_topics(self, student_id: str) -> Dict:
        """Admin: get all topics for a student (no ownership check). Tries auto-link if not linked."""
        link = await self._get_link(student_id)
        student = await db.store_students.find_one(
            {"student_id": student_id}, {"_id": 0, "user_id": 1, "full_name": 1}
        )
        if not student:
            raise ValueError("Student not found")

        if not link:
            # Try auto-link via parent user email
            user_id = student.get("user_id")
            if user_id:
                user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "email": 1})
                if user and user.get("email"):
                    item = await crm_monday_adapter.find_item_by_email(user["email"])
                    if item:
                        item_id = str(item.get("id"))
                        await self._save_link(student_id, item_id, user["email"])
                        link = {"monday_item_id": item_id}
                        logger.info(f"Admin auto-linked student {student_id} to CRM item {item_id}")

        if not link:
            return {
                "topics": [],
                "monday_linked": False,
                "student_name": student.get("full_name", ""),
            }

        item_id = link["monday_item_id"]
        topics = await crm_monday_adapter.get_topics(item_id)

        return {
            "topics": topics,
            "monday_linked": True,
            "monday_item_id": item_id,
            "student_name": student.get("full_name", ""),
        }

    async def admin_reply_to_topic(self, student_id: str, update_id: str, admin_id: str, message: str) -> Dict:
        """Admin replies to a topic — marked as staff message"""
        link = await self._get_link(student_id)
        if not link:
            raise ValueError("Student not linked to CRM board")

        item_id = link["monday_item_id"]

        admin = await db.auth_users.find_one({"user_id": admin_id}, {"_id": 0, "name": 1})
        author_name = admin.get("name", "Staff") if admin else "Staff"

        body = f"[Staff - {author_name}]: {message}"
        reply_id = await crm_monday_adapter.reply_to_topic(item_id, update_id, body)

        msg_doc = {
            "message_id": f"crm_{uuid.uuid4().hex[:12]}",
            "student_id": student_id,
            "monday_item_id": item_id,
            "topic_id": update_id,
            "reply_monday_id": reply_id,
            "user_id": admin_id,
            "author_name": author_name,
            "message": message,
            "is_staff": True,
            "monday_posted": bool(reply_id),
            "read_by": [admin_id, "admin"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db[LOCAL_MESSAGES_COLLECTION].insert_one(msg_doc)
        del msg_doc["_id"]

        return {"success": True, "monday_posted": bool(reply_id), "message": msg_doc}

    async def admin_create_topic(self, student_id: str, admin_id: str, subject: str, message: str) -> Dict:
        """Admin creates a new topic for a student"""
        link = await self._get_link(student_id)
        if not link:
            raise ValueError("Student not linked to CRM board")

        item_id = link["monday_item_id"]

        admin = await db.auth_users.find_one({"user_id": admin_id}, {"_id": 0, "name": 1})
        author_name = admin.get("name", "Staff") if admin else "Staff"

        body = f"[{subject}]\n\nFrom: {author_name} (Staff)\n{message}"
        update_id = await crm_monday_adapter.create_topic(item_id, body)

        if not update_id:
            raise ValueError("Failed to create topic on Monday.com")

        msg_doc = {
            "message_id": f"crm_{uuid.uuid4().hex[:12]}",
            "student_id": student_id,
            "monday_item_id": item_id,
            "topic_id": update_id,
            "user_id": admin_id,
            "author_name": author_name,
            "subject": subject,
            "message": message,
            "is_staff": True,
            "is_topic_creator": True,
            "read_by": [admin_id, "admin"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db[LOCAL_MESSAGES_COLLECTION].insert_one(msg_doc)
        del msg_doc["_id"]

        return {"success": True, "topic_id": update_id, "message": msg_doc}


crm_chat_service = CrmChatService()
