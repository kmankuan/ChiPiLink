"""
CXGenie Routes - Endpoints para Chat Support

Endpoints implementados:
- GET /cxgenie/status - Estado de la integración
- GET/PUT /cxgenie/config - Configuración del widget y panel
- GET /cxgenie/widget-code - Código de embed para frontend (usuarios)
- GET /cxgenie/agent-panel - URL del panel de agentes
- GET /cxgenie/integration-info - Información de la integración
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import logging

from core.database import db
from core.auth import get_admin_user
from .models import CXGenieConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cxgenie", tags=["CXGenie Chat Support"])

# Default configuration for CXGenie
DEFAULT_CXGENIE_CONFIG = {
    "config_id": "cxgenie_main",
    # Widget Configuration (para usuarios)
    "widget_id": "398b0403-4898-4256-a629-51246daac9d8",
    "widget_script_url": "https://widget.cxgenie.ai/widget.js",
    "widget_lang": "es",
    # Agent Panel Configuration (para equipo)
    "workspace_id": "03a35f5f-f777-489a-b60c-69939ac89c49",
    "agent_panel_url": "https://app.cxgenie.ai/workspaces/03a35f5f-f777-489a-b60c-69939ac89c49/help-desk",
    # Display Settings
    "posicion": "bottom-right",
    "mostrar_en_paginas": ["all"],  # all, public, store, etc.
    "ocultar_en_admin": False,
    # Status
    "widget_activo": True,
    "agent_panel_activo": True,
    "fecha_configuracion": None
}


# ============== STATUS ==============

@router.get("/status")
async def get_cxgenie_status():
    """Get CXGenie integration status"""
    config = await db.app_config.find_one({"config_key": "cxgenie"}, {"_id": 0})
    
    if not config or not config.get("value", {}).get("widget_id"):
        return {
            "module": "cxgenie",
            "status": "not_configured",
            "configured": False,
            "activo": False,
            "message": "CXGenie no configurado. Configure el Widget ID o el código de embed."
        }
    
    value = config.get("value", {})
    return {
        "module": "cxgenie",
        "status": "configured" if value.get("activo") else "inactive",
        "configured": True,
        "activo": value.get("activo", False),
        "widget_id": value.get("widget_id"),
        "modo": value.get("modo", "widget"),
        "posicion": value.get("posicion", "bottom-right")
    }


# ============== CONFIGURATION ==============

@router.get("/config")
async def get_cxgenie_config(admin: dict = Depends(get_admin_user)):
    """Get CXGenie configuration (admin only)"""
    config = await db.app_config.find_one({"config_key": "cxgenie"}, {"_id": 0})
    
    if not config:
        return CXGenieConfig().model_dump()
    
    return config.get("value", CXGenieConfig().model_dump())


@router.put("/config")
async def update_cxgenie_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update CXGenie configuration"""
    config["fecha_configuracion"] = datetime.now(timezone.utc).isoformat()
    
    await db.app_config.update_one(
        {"config_key": "cxgenie"},
        {"$set": {
            "config_key": "cxgenie",
            "value": config,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Configuración de CXGenie actualizada"}


# ============== WIDGET CODE ==============

@router.get("/widget-code")
async def get_widget_code():
    """Get widget embed code for frontend (public)"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config or not config.get("value", {}).get("activo"):
        return {
            "activo": False,
            "widget_code": None,
            "message": "Widget de chat no activo"
        }
    
    value = config["value"]
    
    # Si hay código de embed personalizado, usarlo
    if value.get("embed_code"):
        return {
            "activo": True,
            "widget_code": value["embed_code"],
            "posicion": value.get("posicion", "bottom-right")
        }
    
    # Si hay widget_id, generar código estándar
    if value.get("widget_id"):
        widget_id = value["widget_id"]
        script_url = value.get("widget_script_url", f"https://widget.cxgenie.ai/{widget_id}/widget.js")
        
        widget_code = f'''<!-- CXGenie Chat Widget -->
<script>
  (function(w,d,s,id) {{
    if (d.getElementById(id)) return;
    var js = d.createElement(s); js.id = id;
    js.src = "{script_url}";
    js.async = true;
    d.head.appendChild(js);
  }})(window, document, 'script', 'cxgenie-widget');
</script>'''
        
        return {
            "activo": True,
            "widget_code": widget_code,
            "widget_id": widget_id,
            "posicion": value.get("posicion", "bottom-right")
        }
    
    return {
        "activo": False,
        "widget_code": None,
        "message": "Widget ID no configurado"
    }


# ============== AGENT PANEL (PLACEHOLDER) ==============

@router.get("/conversations")
async def get_conversations(
    estado: Optional[str] = None,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get chat conversations for agent panel - PLACEHOLDER"""
    query = {}
    if estado:
        query["estado"] = estado
    
    conversations = await db.chat_conversations.find(query, {"_id": 0}).sort(
        "fecha_ultima_actividad", -1
    ).to_list(limit)
    
    return {
        "conversations": conversations,
        "total": len(conversations),
        "message": "Panel de agentes - Placeholder. Las conversaciones se sincronizarán con CXGenie."
    }


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get messages for a conversation - PLACEHOLDER"""
    messages = await db.chat_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("fecha_envio", 1).to_list(500)
    
    return {
        "conversation_id": conversation_id,
        "messages": messages,
        "message": "Mensajes - Placeholder. Se sincronizarán con CXGenie API."
    }


# ============== INTEGRATION INFO ==============

@router.get("/integration-info")
async def get_integration_info():
    """Get information about CXGenie integration options"""
    return {
        "module": "cxgenie",
        "description": "Integración con CXGenie para atención al cliente",
        "integration_options": {
            "widget": {
                "description": "Widget de chat embebido en la app",
                "required": ["widget_id o embed_code"],
                "features": ["Chat en vivo", "Bot automático", "Historial de conversaciones"]
            },
            "api": {
                "description": "API para panel de agentes nativo",
                "required": ["api_url", "api_key"],
                "features": ["Panel de agentes personalizado", "Notificaciones push", "Experiencia nativa móvil"]
            }
        },
        "setup_steps": [
            "1. Obtener Widget ID o código de embed de CXGenie",
            "2. Configurar en /api/cxgenie/config",
            "3. El widget aparecerá automáticamente en el frontend",
            "4. (Opcional) Configurar API para panel de agentes nativo"
        ]
    }
