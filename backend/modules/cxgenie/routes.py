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


# ============== WIDGET CODE (Para usuarios) ==============

@router.get("/widget-code")
async def get_widget_code():
    """Get widget embed code for frontend (public) - Para mostrar chat a usuarios"""
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
            "message": "Widget de chat no activo"
        }
    
    widget_id = value.get("widget_id", DEFAULT_CXGENIE_CONFIG["widget_id"])
    script_url = value.get("widget_script_url", DEFAULT_CXGENIE_CONFIG["widget_script_url"])
    lang = value.get("widget_lang", "es")
    
    # Generate widget code
    widget_code = f'''<!-- CXGenie Chat Widget -->
<script src="{script_url}" data-aid="{widget_id}" data-lang="{lang}"></script>'''
    
    return {
        "activo": True,
        "widget_code": widget_code,
        "widget_id": widget_id,
        "script_url": script_url,
        "lang": lang,
        "posicion": value.get("posicion", "bottom-right"),
        "mostrar_en_paginas": value.get("mostrar_en_paginas", ["all"])
    }


# ============== AGENT PANEL (Para equipo/administradores) ==============

@router.get("/agent-panel")
async def get_agent_panel(admin: dict = Depends(get_admin_user)):
    """Get agent panel URL for team members to handle chats"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config:
        value = DEFAULT_CXGENIE_CONFIG
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG)
    
    if not value.get("agent_panel_activo", True):
        return {
            "activo": False,
            "panel_url": None,
            "message": "Panel de agentes no activo"
        }
    
    workspace_id = value.get("workspace_id", DEFAULT_CXGENIE_CONFIG["workspace_id"])
    base_url = value.get("agent_panel_url", DEFAULT_CXGENIE_CONFIG["agent_panel_url"])
    
    return {
        "activo": True,
        "workspace_id": workspace_id,
        "panel_urls": {
            "live_chat": f"{base_url}?t=live-chat&type=ALL",
            "all_tickets": f"{base_url}?t=all&type=ALL",
            "open_tickets": f"{base_url}?t=open&type=ALL",
            "pending_tickets": f"{base_url}?t=pending&type=ALL",
            "resolved_tickets": f"{base_url}?t=resolved&type=ALL"
        },
        "embed_info": {
            "description": "Estas URLs pueden cargarse en un iframe o WebView para que el equipo atienda chats",
            "recommended_height": "100vh",
            "recommended_width": "100%"
        }
    }


@router.get("/agent-panel/embed")
async def get_agent_panel_embed(
    tab: str = "live-chat",
    admin: dict = Depends(get_admin_user)
):
    """Get specific agent panel embed URL"""
    config = await db.app_config.find_one({"config_key": "cxgenie"})
    
    if not config:
        value = DEFAULT_CXGENIE_CONFIG
    else:
        value = config.get("value", DEFAULT_CXGENIE_CONFIG)
    
    base_url = value.get("agent_panel_url", DEFAULT_CXGENIE_CONFIG["agent_panel_url"])
    
    # Map tab names
    tab_map = {
        "live-chat": "live-chat",
        "all": "all",
        "open": "open",
        "pending": "pending",
        "resolved": "resolved"
    }
    
    selected_tab = tab_map.get(tab, "live-chat")
    embed_url = f"{base_url}?t={selected_tab}&type=ALL"
    
    return {
        "embed_url": embed_url,
        "tab": selected_tab,
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
