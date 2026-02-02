"""
Membership Service - Management of membresías y pases de visita
Sistema configurable con diferentes tipos de planes y tracking de uso
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import uuid

from core.database import db
from modules.users.models.user_models import (
    MembershipType, VisitType, get_default_user_types
)


class MembershipService:
    """Service for management of membresías y visitas"""
    
    def __init__(self):
        self.collection_plans = "chipi_membership_plans"
        self.collection_memberships = "chipi_user_memberships"
        self.collection_visits = "chipi_user_visits"
        self.collection_visit_config = "chipi_visit_config"
    
    def log_info(self, message: str):
        print(f"[MembershipService] {message}")
    
    # ============== PLAN CONFIGURATION ==============
    
    async def initialize_default_plans(self) -> int:
        """Inicializar planes de membresía por defecto"""
        defaults = self._get_default_plans()
        created = 0
        
        for plan_data in defaults:
            existing = await db[self.collection_plans].find_one(
                {"plan_id": plan_data["plan_id"]}
            )
            if not existing:
                plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
                plan_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                await db[self.collection_plans].insert_one(plan_data)
                created += 1
        
        self.log_info(f"Initialized {created} membership plans")
        return created
    
    def _get_default_plans(self) -> List[Dict]:
        """Planes por defecto"""
        return [
            {
                "plan_id": "plan_visits_12",
                "name": {
                    "es": "Pase 12 Visitas",
                    "en": "12 Visits Pass",
                    "zh": "12次访问通行证"
                },
                "description": {
                    "es": "Pase de 12 visitas al club. Válido por 3 meses.",
                    "en": "12 visits pass to the club. Valid for 3 months.",
                    "zh": "俱乐部12次访问通行证。3个月内有效。"
                },
                "membership_type": MembershipType.VISITS.value,
                "price": 300.0,
                "price_in_points": 30000,
                "total_visits": 12,
                "duration_days": 90,
                "applicable_user_types": ["utype_member_child", "utype_member_adult"],
                "bonus_points": 500,
                "is_active": True,
                "is_featured": True,
                "sort_order": 1
            },
            {
                "plan_id": "plan_visits_6",
                "name": {
                    "es": "Pase 6 Visitas",
                    "en": "6 Visits Pass",
                    "zh": "6次访问通行证"
                },
                "description": {
                    "es": "Pase de 6 visitas al club. Válido por 2 meses.",
                    "en": "6 visits pass to the club. Valid for 2 months.",
                    "zh": "俱乐部6次访问通行证。2个月内有效。"
                },
                "membership_type": MembershipType.VISITS.value,
                "price": 165.0,
                "price_in_points": 16500,
                "total_visits": 6,
                "duration_days": 60,
                "applicable_user_types": ["utype_member_child", "utype_member_adult"],
                "bonus_points": 200,
                "is_active": True,
                "sort_order": 2
            },
            {
                "plan_id": "plan_unlimited_month",
                "name": {
                    "es": "Ilimitado Mensual",
                    "en": "Monthly Unlimited",
                    "zh": "月度无限"
                },
                "description": {
                    "es": "Acceso ilimitado al club durante 1 mes.",
                    "en": "Unlimited club access for 1 month.",
                    "zh": "1个月内无限制俱乐部访问。"
                },
                "membership_type": MembershipType.UNLIMITED.value,
                "price": 150.0,
                "price_in_points": 15000,
                "duration_days": 30,
                "applicable_user_types": ["utype_member_child", "utype_member_adult"],
                "bonus_points": 300,
                "auto_renew": True,
                "renewal_discount": 10,
                "is_active": True,
                "sort_order": 3
            },
            {
                "plan_id": "plan_trial",
                "name": {
                    "es": "Prueba Gratis",
                    "en": "Free Trial",
                    "zh": "免费试用"
                },
                "description": {
                    "es": "2 visitas de prueba para nuevos miembros.",
                    "en": "2 trial visits for new members.",
                    "zh": "新会员2次试用访问。"
                },
                "membership_type": MembershipType.TRIAL.value,
                "price": 0.0,
                "total_visits": 2,
                "duration_days": 14,
                "applicable_user_types": [],
                "bonus_points": 50,
                "is_active": True,
                "sort_order": 10
            },
            {
                "plan_id": "plan_courtesy",
                "name": {
                    "es": "Cortesía",
                    "en": "Courtesy",
                    "zh": "礼遇"
                },
                "description": {
                    "es": "Membresía de cortesía otorgada por el club.",
                    "en": "Courtesy membership granted by the club.",
                    "zh": "俱乐部授予的礼遇会员资格。"
                },
                "membership_type": MembershipType.COURTESY.value,
                "price": 0.0,
                "duration_days": 365,
                "applicable_user_types": ["utype_special"],
                "is_active": True,
                "sort_order": 20
            }
        ]
    
    async def get_plans(
        self,
        active_only: bool = True,
        user_type_id: str = None
    ) -> List[Dict]:
        """Get planes de membresía"""
        query = {}
        if active_only:
            query["is_active"] = True
        
        cursor = db[self.collection_plans].find(
            query, 
            {"_id": 0}
        ).sort("sort_order", 1)
        
        plans = await cursor.to_list(length=50)
        
        # Filtrar by type de usuario
        if user_type_id:
            plans = [
                p for p in plans
                if not p.get("applicable_user_types") or user_type_id in p.get("applicable_user_types", [])
            ]
        
        return plans
    
    async def get_plan(self, plan_id: str) -> Optional[Dict]:
        """Get un plan específico"""
        plan = await db[self.collection_plans].find_one(
            {"plan_id": plan_id},
            {"_id": 0}
        )
        return plan
    
    async def create_plan(self, plan_data: Dict) -> Dict:
        """Create un nuevo plan de membresía"""
        now = datetime.now(timezone.utc).isoformat()
        
        if "plan_id" not in plan_data:
            plan_data["plan_id"] = f"plan_{uuid.uuid4().hex[:8]}"
        
        plan_data["created_at"] = now
        plan_data["updated_at"] = now
        plan_data["is_active"] = True
        
        await db[self.collection_plans].insert_one(plan_data)
        plan_data.pop("_id", None)
        
        self.log_info(f"Created plan: {plan_data['plan_id']}")
        return plan_data
    
    async def update_plan(self, plan_id: str, updates: Dict) -> Optional[Dict]:
        """Update un plan"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_plans].find_one_and_update(
            {"plan_id": plan_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    async def delete_plan(self, plan_id: str) -> bool:
        """Desactivar un plan (soft delete)"""
        result = await db[self.collection_plans].update_one(
            {"plan_id": plan_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    # ============== USER MEMBERSHIPS ==============
    
    async def get_membership(self, membership_id: str) -> Optional[Dict]:
        """Get membresía by ID"""
        membership = await db[self.collection_memberships].find_one(
            {"membership_id": membership_id},
            {"_id": 0}
        )
        return membership
    
    async def get_user_memberships(
        self,
        user_id: str,
        active_only: bool = True
    ) -> List[Dict]:
        """Get membresías de un usuario"""
        query = {"user_id": user_id}
        
        if active_only:
            query["status"] = "active"
        
        cursor = db[self.collection_memberships].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1)
        
        memberships = await cursor.to_list(length=20)
        
        # Enriquecer con info of the plan
        for memb in memberships:
            plan = await self.get_plan(memb.get("plan_id"))
            memb["plan_info"] = plan
        
        return memberships
    
    async def get_active_membership(self, user_id: str) -> Optional[Dict]:
        """Get membresía activa de un usuario"""
        now = datetime.now(timezone.utc).isoformat()
        
        membership = await db[self.collection_memberships].find_one(
            {
                "user_id": user_id,
                "status": "active",
                "$or": [
                    {"end_date": {"$gt": now}},
                    {"end_date": None}
                ]
            },
            {"_id": 0}
        )
        
        if membership:
            plan = await self.get_plan(membership.get("plan_id"))
            membership["plan_info"] = plan
            
            # Verificar si ha expirado
            if membership.get("end_date") and membership["end_date"] < now:
                await self._expire_membership(membership["membership_id"])
                membership["status"] = "expired"
        
        return membership
    
    async def purchase_membership(
        self,
        user_id: str,
        plan_id: str,
        paid_with_points: bool = False,
        transaction_id: str = None,
        sponsored_by: str = None,
        sponsor_note: str = None
    ) -> Dict:
        """Comprar una membresía"""
        plan = await self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")
        
        if not plan.get("is_active"):
            raise ValueError("Plan is not active")
        
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        
        # Calculate fecha de fin
        duration_days = plan.get("duration_days", 30)
        end_date = (now + timedelta(days=duration_days)).isoformat()
        
        membership = {
            "membership_id": f"memb_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "plan_id": plan_id,
            "status": "active",
            "visits_remaining": plan.get("total_visits"),
            "credits_remaining": plan.get("total_credits"),
            "start_date": now_str,
            "end_date": end_date,
            "purchase_price": plan.get("price", 0),
            "paid_with_points": paid_with_points,
            "transaction_id": transaction_id,
            "sponsored_by": sponsored_by,
            "sponsor_note": sponsor_note,
            "is_auto_renew": plan.get("auto_renew", False),
            "renewal_count": 0,
            "usage_history": [],
            "created_at": now_str,
            "updated_at": now_str
        }
        
        await db[self.collection_memberships].insert_one(membership)
        membership.pop("_id", None)
        
        # Add info of the plan
        membership["plan_info"] = plan
        
        self.log_info(f"Created membership {membership['membership_id']} for user {user_id}")
        return membership
    
    async def _expire_membership(self, membership_id: str) -> bool:
        """Marcar membresía como expirada"""
        result = await db[self.collection_memberships].update_one(
            {"membership_id": membership_id},
            {
                "$set": {
                    "status": "expired",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def cancel_membership(
        self,
        membership_id: str,
        reason: str = None
    ) -> bool:
        """Cancelar una membresía"""
        result = await db[self.collection_memberships].update_one(
            {"membership_id": membership_id},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_reason": reason,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.modified_count > 0:
            self.log_info(f"Cancelled membership {membership_id}")
        
        return result.modified_count > 0
    
    async def use_visit(
        self,
        membership_id: str,
        visit_type: VisitType = VisitType.REGULAR,
        notes: str = None
    ) -> Dict:
        """Usar una visita de la membresía"""
        membership = await self.get_membership(membership_id)
        if not membership:
            raise ValueError("Membership not found")
        
        if membership.get("status") != "active":
            raise ValueError("Membership is not active")
        
        plan = await self.get_plan(membership.get("plan_id"))
        
        # Verificar tipo de membresía
        if plan and plan.get("membership_type") == MembershipType.VISITS.value:
            visits_remaining = membership.get("visits_remaining", 0)
            
            # Solo descontar si es visita regular
            if visit_type == VisitType.REGULAR:
                if visits_remaining <= 0:
                    raise ValueError("No visits remaining")
                
                visits_remaining -= 1
        else:
            visits_remaining = membership.get("visits_remaining")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Registrar uso en historial
        usage_entry = {
            "date": now,
            "visit_type": visit_type.value if hasattr(visit_type, 'value') else visit_type,
            "notes": notes,
            "consumed": visit_type == VisitType.REGULAR
        }
        
        # Update membresía
        result = await db[self.collection_memberships].find_one_and_update(
            {"membership_id": membership_id},
            {
                "$set": {
                    "visits_remaining": visits_remaining,
                    "updated_at": now
                },
                "$push": {"usage_history": usage_entry}
            },
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
            result["plan_info"] = plan
        
        self.log_info(f"Used visit on membership {membership_id}. Remaining: {visits_remaining}")
        return result
    
    async def add_visits(
        self,
        membership_id: str,
        visits: int,
        reason: str = None
    ) -> Dict:
        """Agregar visitas a una membresía"""
        now = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_memberships].find_one_and_update(
            {"membership_id": membership_id},
            {
                "$inc": {"visits_remaining": visits},
                "$set": {"updated_at": now},
                "$push": {
                    "usage_history": {
                        "date": now,
                        "visit_type": "adjustment",
                        "notes": reason or f"Added {visits} visits",
                        "consumed": False,
                        "adjustment": visits
                    }
                }
            },
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        
        self.log_info(f"Added {visits} visits to membership {membership_id}")
        return result
    
    # ============== VISIT TRACKING ==============
    
    async def get_visit_config(self) -> Dict:
        """Get configuración de visitas"""
        config = await db[self.collection_visit_config].find_one(
            {"config_id": "visit_config"},
            {"_id": 0}
        )
        
        if not config:
            config = await self._initialize_visit_config()
        
        return config
    
    async def _initialize_visit_config(self) -> Dict:
        """Inicializar configuración de visitas"""
        config = {
            "config_id": "visit_config",
            "min_duration_minutes": 30,  # Mínimo para contar como visita regular
            "quick_visit_max_minutes": 15,  # Máximo para visita rápida (no consume)
            "check_in_methods": ["qr", "pin", "geolocation", "manual"],
            "require_checkout": True,
            "auto_checkout_hours": 8,  # Auto checkout después de 8 horas
            "club_location": {
                "latitude": 9.0,
                "longitude": -79.5,
                "radius_meters": 100
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db[self.collection_visit_config].insert_one(config)
        config.pop("_id", None)
        return config
    
    async def update_visit_config(self, updates: Dict) -> Dict:
        """Update configuración de visitas"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_visit_config].find_one_and_update(
            {"config_id": "visit_config"},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    async def check_in(
        self,
        user_id: str,
        profile_id: str = None,
        check_in_method: str = "manual",
        latitude: float = None,
        longitude: float = None,
        registered_by: str = None
    ) -> Dict:
        """Register entrada de un usuario"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Verificar si ya hay un check-in activo
        active_visit = await db[self.collection_visits].find_one(
            {
                "user_id": user_id,
                "check_out_time": None
            }
        )
        
        if active_visit:
            active_visit.pop("_id", None)
            return {
                "error": "Already checked in",
                "active_visit": active_visit
            }
        
        visit = {
            "visit_id": f"visit_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "profile_id": profile_id,
            "visit_type": VisitType.REGULAR.value,
            "check_in_time": now,
            "check_in_method": check_in_method,
            "check_out_time": None,
            "duration_minutes": None,
            "latitude": latitude,
            "longitude": longitude,
            "location_verified": latitude is not None and longitude is not None,
            "consumed_visit": False,  # Se determina al checkout
            "registered_by": registered_by,
            "created_at": now
        }
        
        await db[self.collection_visits].insert_one(visit)
        visit.pop("_id", None)
        
        self.log_info(f"Check-in registered for user {user_id}")
        return visit
    
    async def check_out(
        self,
        user_id: str = None,
        visit_id: str = None,
        notes: str = None
    ) -> Dict:
        """Register salida de un usuario"""
        query = {}
        if visit_id:
            query["visit_id"] = visit_id
        elif user_id:
            query = {"user_id": user_id, "check_out_time": None}
        else:
            raise ValueError("user_id or visit_id required")
        
        visit = await db[self.collection_visits].find_one(query)
        if not visit:
            raise ValueError("No active visit found")
        
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        
        # Calculate duración
        check_in_time = datetime.fromisoformat(visit["check_in_time"].replace('Z', '+00:00'))
        duration_minutes = int((now - check_in_time).total_seconds() / 60)
        
        # Obtener configuración
        config = await self.get_visit_config()
        min_duration = config.get("min_duration_minutes", 30)
        quick_max = config.get("quick_visit_max_minutes", 15)
        
        # Determinar tipo de visita
        if duration_minutes < quick_max:
            visit_type = VisitType.QUICK.value
            consumed_visit = False
        else:
            visit_type = VisitType.REGULAR.value
            consumed_visit = True
        
        # Update visita
        await db[self.collection_visits].update_one(
            {"visit_id": visit["visit_id"]},
            {
                "$set": {
                    "check_out_time": now_str,
                    "duration_minutes": duration_minutes,
                    "visit_type": visit_type,
                    "consumed_visit": consumed_visit,
                    "notes": notes
                }
            }
        )
        
        # Si consumió visita, descontar de membresía
        if consumed_visit:
            membership = await self.get_active_membership(visit["user_id"])
            if membership and membership.get("visits_remaining") is not None:
                await self.use_visit(
                    membership_id=membership["membership_id"],
                    visit_type=VisitType.REGULAR,
                    notes=f"Auto-deducted from visit {visit['visit_id']}"
                )
        
        # Challengernar visita actualizada
        updated_visit = await db[self.collection_visits].find_one(
            {"visit_id": visit["visit_id"]},
            {"_id": 0}
        )
        
        self.log_info(f"Check-out registered for user {visit['user_id']}. Duration: {duration_minutes}min")
        return updated_visit
    
    async def get_user_visits(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get historial de visitas de un usuario"""
        cursor = db[self.collection_visits].find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("check_in_time", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_current_visitors(self) -> List[Dict]:
        """Get usuarios actualmente en el club"""
        cursor = db[self.collection_visits].find(
            {"check_out_time": None},
            {"_id": 0}
        ).sort("check_in_time", -1)
        
        return await cursor.to_list(length=100)
    
    async def get_visit_stats(self, user_id: str) -> Dict:
        """Get estadísticas de visitas de un usuario"""
        # Total de visitas
        total_visits = await db[self.collection_visits].count_documents(
            {"user_id": user_id, "consumed_visit": True}
        )
        
        # Visits este mes
        now = datetime.now(timezone.utc)
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        visits_this_month = await db[self.collection_visits].count_documents(
            {
                "user_id": user_id,
                "consumed_visit": True,
                "check_in_time": {"$gte": first_of_month.isoformat()}
            }
        )
        
        # Tiempo promedio
        pipeline = [
            {"$match": {"user_id": user_id, "duration_minutes": {"$ne": None}}},
            {"$group": {
                "_id": None,
                "avg_duration": {"$avg": "$duration_minutes"},
                "total_time": {"$sum": "$duration_minutes"}
            }}
        ]
        
        result = await db[self.collection_visits].aggregate(pipeline).to_list(length=1)
        
        avg_duration = 0
        total_time = 0
        if result:
            avg_duration = round(result[0].get("avg_duration", 0), 1)
            total_time = result[0].get("total_time", 0)
        
        # Membership activa
        membership = await self.get_active_membership(user_id)
        
        return {
            "total_visits": total_visits,
            "visits_this_month": visits_this_month,
            "avg_duration_minutes": avg_duration,
            "total_time_minutes": total_time,
            "has_active_membership": membership is not None,
            "visits_remaining": membership.get("visits_remaining") if membership else None,
            "membership_expires": membership.get("end_date") if membership else None
        }


# Singleton
membership_service = MembershipService()
