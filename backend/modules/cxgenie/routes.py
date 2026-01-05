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
    # Ticket Widget Configuration (para usuarios)
    "widget_type": "ticket",  # "ticket" o "chat"
    "widget_id": "398b0403-4898-4256-a629-51246daac9d8",
    "widget_script_url": "https://ticket.chipilink.com/widget.js",
    "widget_data_attribute": "data-bid",  # data-bid para tickets, data-aid para chat
    "widget_lang": "es",
    # Agent Panel Configuration (para equipo)
    "workspace_id": "03a35f5f-f777-489a-b60c-69939ac89c49",
    "workspace_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3b3Jrc3BhY2VfaWQiOiIwM2EzNWY1Zi1mNzc3LTQ4OWEtYjYwYy02OTkzOWFjODljNDkiLCJpYXQiOjE3NDQwODk1NDJ9.cOcc7_FFaetfR1tKQ0IciSfs3qV6JM8hH26eSzsg13M",
    "agent_panel_base_url": "https://livechat.chipilink.com",
    # Panel URLs específicos - usando subdominios personalizados
    "tickets_panel_url": "https://livechat.chipilink.com/help-desk?t=tickets",
    "chat_panel_url": "https://livechat.chipilink.com/help-desk?t=live-chat&type=ALL",
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
    
    # Use default config if not configured
    if not config:
        value = DEFAULT_CXGENIE_CONFIG
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG)
    
    return {
        "module": "cxgenie",
        "status": "active" if value.get("widget_activo") else "inactive",
        "configured": True,
        "widget": {
            "type": value.get("widget_type", "ticket"),
            "activo": value.get("widget_activo", True),
            "widget_id": value.get("widget_id"),
            "lang": value.get("widget_lang", "es"),
            "posicion": value.get("posicion", "bottom-right")
        },
        "agent_panel": {
            "activo": value.get("agent_panel_activo", True),
            "workspace_id": value.get("workspace_id"),
            "url_disponible": bool(value.get("agent_panel_url"))
        }
    }


# ============== CONFIGURATION ==============

@router.get("/config")
async def get_cxgenie_config(admin: dict = Depends(get_admin_user)):
    """Get CXGenie configuration (admin only)"""
    config = await db.app_config.find_one({"config_key": "cxgenie"}, {"_id": 0})
    
    if not config:
        return DEFAULT_CXGENIE_CONFIG
    
    return config.get("value", DEFAULT_CXGENIE_CONFIG)


@router.put("/config")
async def update_cxgenie_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update CXGenie configuration"""
    # Merge with defaults
    updated_config = {**DEFAULT_CXGENIE_CONFIG, **config}
    updated_config["fecha_configuracion"] = datetime.now(timezone.utc).isoformat()
    
    await db.app_config.update_one(
        {"config_key": "cxgenie"},
        {"$set": {
            "config_key": "cxgenie",
            "value": updated_config,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Configuración de CXGenie actualizada", "config": updated_config}


# ============== WIDGET CODE (Para usuarios - Sistema de Tickets) ==============

@router.get("/widget-code")
async def get_widget_code():
    """Get ticket widget embed code for frontend (public) - Sistema de tickets para usuarios"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    # Use default or stored config
    if not config:
        value = DEFAULT_CXGENIE_CONFIG
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG)
    
    if not value.get("widget_activo", True):
        return {
            "activo": False,
            "widget_code": None,
            "message": "Widget de tickets no activo"
        }
    
    widget_id = value.get("widget_id", DEFAULT_CXGENIE_CONFIG["widget_id"])
    script_url = value.get("widget_script_url", DEFAULT_CXGENIE_CONFIG["widget_script_url"])
    data_attr = value.get("widget_data_attribute", "data-bid")
    lang = value.get("widget_lang", "es")
    widget_type = value.get("widget_type", "ticket")
    
    # Generate widget code - Ticket system uses data-bid
    widget_code = f'''<!-- CXGenie Ticket Widget -->
<script src="{script_url}" {data_attr}="{widget_id}" data-lang="{lang}"></script>'''
    
    return {
        "activo": True,
        "widget_type": widget_type,
        "widget_code": widget_code,
        "widget_id": widget_id,
        "script_url": script_url,
        "data_attribute": data_attr,
        "lang": lang,
        "posicion": value.get("posicion", "bottom-right"),
        "mostrar_en_paginas": value.get("mostrar_en_paginas", ["all"])
    }


# ============== AGENT PANEL (Para equipo/administradores) ==============

@router.get("/agent-panel")
async def get_agent_panel(admin: dict = Depends(get_admin_user)):
    """Get agent panel URLs for team members to handle chats and tickets"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config:
        value = DEFAULT_CXGENIE_CONFIG
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG)
    
    if not value.get("agent_panel_activo", True):
        return {
            "activo": False,
            "panels": None,
            "message": "Panel de agentes no activo"
        }
    
    workspace_id = value.get("workspace_id", DEFAULT_CXGENIE_CONFIG["workspace_id"])
    base_url = value.get("agent_panel_base_url", DEFAULT_CXGENIE_CONFIG["agent_panel_base_url"])
    
    return {
        "activo": True,
        "workspace_id": workspace_id,
        "panels": {
            "tickets": {
                "name": "Tickets",
                "description": "Gestionar tickets de soporte",
                "url": value.get("tickets_panel_url", f"{base_url}?t=tickets"),
                "icon": "🎫"
            },
            "live_chat": {
                "name": "Chat en Vivo",
                "description": "Conversaciones en tiempo real",
                "url": value.get("chat_panel_url", f"{base_url}?t=live-chat&type=ALL"),
                "icon": "💬"
            }
        },
        "additional_views": {
            "all": f"{base_url}?t=all&type=ALL",
            "open": f"{base_url}?t=open&type=ALL",
            "pending": f"{base_url}?t=pending&type=ALL",
            "resolved": f"{base_url}?t=resolved&type=ALL"
        },
        "embed_info": {
            "description": "Estas URLs pueden cargarse en un iframe o WebView para que el equipo atienda",
            "recommended_height": "100vh",
            "recommended_width": "100%"
        }
    }


@router.get("/agent-panel/embed")
async def get_agent_panel_embed(
    panel: str = "tickets",
    admin: dict = Depends(get_admin_user)
):
    """Get specific agent panel embed URL"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config:
        value = DEFAULT_CXGENIE_CONFIG
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG)
    
    base_url = value.get("agent_panel_base_url", DEFAULT_CXGENIE_CONFIG["agent_panel_base_url"])
    
    # Map panel names to URLs
    panel_urls = {
        "tickets": value.get("tickets_panel_url", f"{base_url}?t=tickets"),
        "live-chat": value.get("chat_panel_url", f"{base_url}?t=live-chat&type=ALL"),
        "chat": value.get("chat_panel_url", f"{base_url}?t=live-chat&type=ALL"),
        "all": f"{base_url}?t=all&type=ALL",
        "open": f"{base_url}?t=open&type=ALL",
        "pending": f"{base_url}?t=pending&type=ALL",
        "resolved": f"{base_url}?t=resolved&type=ALL"
    }
    
    embed_url = panel_urls.get(panel, panel_urls["tickets"])
    
    return {
        "panel": panel,
        "embed_url": embed_url,
        "iframe_code": f'<iframe src="{embed_url}" width="100%" height="100%" frameborder="0" allow="microphone; camera"></iframe>'
    }


# ============== TOGGLE ENDPOINTS ==============

@router.put("/widget/toggle")
async def toggle_widget(activo: bool, admin: dict = Depends(get_admin_user)):
    """Enable/disable the chat widget"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config:
        value = DEFAULT_CXGENIE_CONFIG.copy()
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG.copy())
    
    value["widget_activo"] = activo
    
    await db.app_config.update_one(
        {"config_key": "cxgenie"},
        {"$set": {"config_key": "cxgenie", "value": value}},
        upsert=True
    )
    
    return {"success": True, "widget_activo": activo}


@router.put("/agent-panel/toggle")
async def toggle_agent_panel(activo: bool, admin: dict = Depends(get_admin_user)):
    """Enable/disable the agent panel"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config:
        value = DEFAULT_CXGENIE_CONFIG.copy()
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG.copy())
    
    value["agent_panel_activo"] = activo
    
    await db.app_config.update_one(
        {"config_key": "cxgenie"},
        {"$set": {"config_key": "cxgenie", "value": value}},
        upsert=True
    )
    
    return {"success": True, "agent_panel_activo": activo}


# ============== INTEGRATION INFO ==============

@router.get("/integration-info")
async def get_integration_info():
    """Get information about CXGenie integration"""
    return {
        "module": "cxgenie",
        "description": "Integración con CXGenie para atención al cliente",
        "status": "implemented",
        "features": {
            "widget_chat": {
                "description": "Widget de chat embebido para usuarios",
                "endpoint": "/api/cxgenie/widget-code",
                "status": "active"
            },
            "agent_panel": {
                "description": "Panel de agentes para atender chats (embebido)",
                "endpoint": "/api/cxgenie/agent-panel",
                "status": "active",
                "tabs": ["live-chat", "all", "open", "pending", "resolved"]
            }
        },
        "frontend_implementation": {
            "widget": "Inyectar el script del widget en las páginas públicas",
            "agent_panel": "Cargar la URL del panel en un iframe para administradores"
        },
        "mobile_implementation": {
            "widget": "El widget funciona en WebView móvil",
            "agent_panel": "Cargar en react-native-webview para experiencia nativa"
        }
    }
