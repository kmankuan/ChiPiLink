"""
Admin Menu Configuration — Backend-driven dynamic menu with MODULE TABS.
Top-level: horizontal module tabs (Main, Integration, Sport, Tutor, Commerce, Settings)
Within each module: sidebar groups with items.
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import db
from core.auth import get_admin_user
import logging

logger = logging.getLogger("admin.menu")
router = APIRouter(prefix="/admin/menu", tags=["Admin Menu"])

C_MENU = "admin_menu_config"

DEFAULT_MENU = {
    "_id": "admin_menu",
    "version": 2,
    "modules": [
        {
            "id": "main", "order": 1,
            "label": {"en": "Main App", "es": "Principal", "zh": "主应用"},
            "icon": "layout-dashboard", "color": "#059669",
            "groups": [
                {
                    "id": "overview", "order": 1, "collapsed_default": False,
                    "label": {"en": "Overview", "es": "Resumen", "zh": "概览"},
                    "items": [
                        {"id": "dashboard", "label": {"en": "Dashboard", "es": "Panel", "zh": "仪表板"}, "icon": "layout-dashboard", "permission": "admin.dashboard", "enabled": True, "order": 1},
                    ]
                },
                {
                    "id": "users", "order": 2, "collapsed_default": False,
                    "label": {"en": "Users & Access", "es": "Usuarios y Acceso", "zh": "用户与权限"},
                    "items": [
                        {"id": "customers", "label": {"en": "Users", "es": "Usuarios", "zh": "用户"}, "icon": "users", "permission": "users.view", "enabled": True, "order": 1},
                        {"id": "memberships", "label": {"en": "Memberships", "es": "Membresías", "zh": "会员"}, "icon": "credit-card", "permission": "memberships.view", "enabled": True, "order": 2},
                        {"id": "roles", "label": {"en": "Roles & Permissions", "es": "Roles y Permisos", "zh": "角色与权限"}, "icon": "shield", "permission": "roles.view", "enabled": True, "order": 3},
                        {"id": "wallet", "label": {"en": "Wallet", "es": "Billetera", "zh": "钱包"}, "icon": "wallet", "permission": "admin.site_config", "enabled": True, "order": 4},
                        {"id": "payment-alerts", "label": {"en": "Payment Alerts", "es": "Alertas de Pago", "zh": "支付提醒"}, "icon": "bell-ring", "permission": "admin.site_config", "enabled": True, "order": 5},
                    ]
                },
                {
                    "id": "community", "order": 3, "collapsed_default": False,
                    "label": {"en": "Community", "es": "Comunidad", "zh": "社区"},
                    "items": [
                        {"id": "telegram-channel", "label": {"en": "Telegram Channel", "es": "Canal Telegram", "zh": "Telegram频道"}, "icon": "send", "permission": "admin.site_config", "enabled": True, "order": 1},
                        {"id": "tickets", "label": {"en": "Tickets & Chat", "es": "Tickets y Chat", "zh": "工单与聊天"}, "icon": "message-square", "permission": "tickets.access", "is_external": True, "path": "/admin/chat", "enabled": True, "order": 2},
                    ]
                },
                {
                    "id": "analytics", "order": 4, "collapsed_default": True,
                    "label": {"en": "Analytics", "es": "Análisis", "zh": "分析"},
                    "items": [
                        {"id": "analytics", "label": {"en": "Reports", "es": "Reportes", "zh": "报表"}, "icon": "bar-chart-2", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 1},
                        {"id": "data-manager", "label": {"en": "Data Manager", "es": "Gestor de Datos", "zh": "数据管理"}, "icon": "database", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 2},
                    ]
                },
            ]
        },
        {
            "id": "commerce", "order": 2,
            "label": {"en": "Commerce", "es": "Comercio", "zh": "商务"},
            "icon": "shopping-bag", "color": "#d97706",
            "groups": [
                {
                    "id": "store", "order": 1, "collapsed_default": False,
                    "label": {"en": "Unatienda", "es": "Unatienda", "zh": "商店"},
                    "items": [
                        {"id": "unatienda", "label": {"en": "Products", "es": "Productos", "zh": "产品"}, "icon": "shopping-bag", "permission": "unatienda.access", "enabled": True, "order": 1},
                        {"id": "orders", "label": {"en": "Orders", "es": "Pedidos", "zh": "订单"}, "icon": "shopping-cart", "permission": "unatienda.manage_orders", "enabled": True, "order": 2},
                        {"id": "messages", "label": {"en": "Messages", "es": "Mensajes", "zh": "消息"}, "icon": "message-square", "permission": "unatienda.access", "enabled": True, "order": 3},
                    ]
                },
                {
                    "id": "sysbook", "order": 2, "collapsed_default": False,
                    "label": {"en": "School Textbooks", "es": "Textos Escolares", "zh": "教科书"},
                    "items": [
                        {"id": "sysbook-dashboard", "label": {"en": "Dashboard", "es": "Panel", "zh": "仪表板"}, "icon": "layout-dashboard", "permission": "unatienda.access", "enabled": True, "order": 1},
                        {"id": "sysbook-inventory", "label": {"en": "Inventory", "es": "Inventario", "zh": "库存"}, "icon": "book-open", "permission": "unatienda.access", "enabled": True, "order": 2},
                        {"id": "sysbook-stock-movements", "label": {"en": "Stock Movements", "es": "Movimientos", "zh": "库存变动"}, "icon": "truck", "permission": "unatienda.access", "enabled": True, "order": 3},
                        {"id": "sysbook-analytics", "label": {"en": "Analytics", "es": "Análisis", "zh": "分析"}, "icon": "bar-chart-2", "permission": "unatienda.access", "enabled": True, "order": 4},
                        {"id": "sysbook-alerts", "label": {"en": "Stock Alerts", "es": "Alertas Stock", "zh": "库存警报"}, "icon": "alert-triangle", "permission": "unatienda.access", "enabled": True, "order": 5},
                        {"id": "students-schools", "label": {"en": "Students & Schools", "es": "Estudiantes y Escuelas", "zh": "学生与学校"}, "icon": "graduation-cap", "permission": "unatienda.access", "enabled": True, "order": 6},
                        {"id": "presale-import", "label": {"en": "Pre-Sale Import", "es": "Importar Pre-venta", "zh": "预售导入"}, "icon": "upload", "permission": "unatienda.access", "enabled": True, "order": 7},
                        {"id": "textbook-form-settings", "label": {"en": "Form Settings", "es": "Config. Formulario", "zh": "表单设置"}, "icon": "clipboard-list", "permission": "unatienda.access", "enabled": True, "order": 8},
                        {"id": "merge-duplicates", "label": {"en": "Merge Duplicates", "es": "Fusionar Duplicados", "zh": "合并重复"}, "icon": "merge", "permission": "unatienda.access", "enabled": True, "order": 9},
                    ]
                },
            ]
        },
        {
            "id": "sport", "order": 3,
            "label": {"en": "Sport", "es": "Deporte", "zh": "体育"},
            "icon": "trophy", "color": "#dc2626",
            "groups": [
                {
                    "id": "sport-main", "order": 1, "collapsed_default": False,
                    "label": {"en": "Table Tennis", "es": "Tenis de Mesa", "zh": "乒乓球"},
                    "items": [
                        {"id": "sport", "label": {"en": "Dashboard", "es": "Panel", "zh": "仪表板"}, "icon": "layout-dashboard", "permission": "sport.admin_panel", "enabled": True, "order": 1, "path": "/sport", "is_external": True},
                        {"id": "sport-players", "label": {"en": "Players", "es": "Jugadores", "zh": "球员"}, "icon": "users", "permission": "sport.admin_panel", "enabled": True, "order": 2, "path": "/sport/players", "is_external": True},
                        {"id": "sport-leagues", "label": {"en": "Leagues", "es": "Ligas", "zh": "联赛"}, "icon": "medal", "permission": "sport.admin_panel", "enabled": True, "order": 3, "path": "/sport/leagues", "is_external": True},
                        {"id": "sport-tournaments", "label": {"en": "Tournaments", "es": "Torneos", "zh": "锦标赛"}, "icon": "award", "permission": "sport.admin_panel", "enabled": True, "order": 4, "path": "/sport/tournament/new", "is_external": True},
                        {"id": "sport-rankings", "label": {"en": "Rankings", "es": "Clasificaciones", "zh": "排名"}, "icon": "bar-chart-2", "permission": "sport.admin_panel", "enabled": True, "order": 5, "path": "/sport/rankings", "is_external": True},
                        {"id": "sport-fame", "label": {"en": "Hall of Fame", "es": "Salón de la Fama", "zh": "名人堂"}, "icon": "star", "permission": "sport.admin_panel", "enabled": True, "order": 6, "path": "/sport/hall-of-fame", "is_external": True},
                        {"id": "sport-tv", "label": {"en": "Sport TV", "es": "TV en Vivo", "zh": "体育电视"}, "icon": "tv", "permission": "sport.admin_panel", "enabled": True, "order": 7, "path": "/sport/tv", "is_external": True},
                        {"id": "sport-settings", "label": {"en": "Settings", "es": "Configuración", "zh": "设置"}, "icon": "settings", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 8, "path": "/sport/admin", "is_external": True},
                    ]
                },
            ]
        },
        {
            "id": "integrations", "order": 5,
            "label": {"en": "Integrations", "es": "Integraciones", "zh": "集成"},
            "icon": "plug", "color": "#0891b2",
            "groups": [
                {
                    "id": "integration-main", "order": 1, "collapsed_default": False,
                    "label": {"en": "Integrations", "es": "Integraciones", "zh": "集成"},
                    "items": [
                        {"id": "monday-hub", "label": {"en": "Monday.com", "es": "Monday.com", "zh": "Monday.com"}, "icon": "plug", "permission": "integrations.access", "enabled": True, "order": 1},
                        {"id": "hub-dashboard", "label": {"en": "Integration Hub", "es": "Hub Integraciones", "zh": "集成中心"}, "icon": "cpu", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 2},
                        {"id": "forms", "label": {"en": "Forms", "es": "Formularios", "zh": "表单"}, "icon": "file-text", "permission": "admin.site_config", "enabled": True, "order": 3},
                    ]
                },
            ]
        },
        {
            "id": "settings", "order": 6,
            "label": {"en": "Settings", "es": "Ajustes", "zh": "设置"},
            "icon": "settings", "color": "#6b7280",
            "groups": [
                {
                    "id": "design", "order": 1, "collapsed_default": False,
                    "label": {"en": "App Builder", "es": "Constructor", "zh": "应用构建"},
                    "items": [
                        {"id": "pages-manager", "label": {"en": "Pages Manager", "es": "Páginas", "zh": "页面管理"}, "icon": "layout", "permission": "admin.site_config", "enabled": True, "order": 1},
                        {"id": "app-appearance", "label": {"en": "App Appearance", "es": "Apariencia", "zh": "应用外观"}, "icon": "paintbrush", "permission": "admin.site_config", "enabled": True, "order": 2},
                        {"id": "widget", "label": {"en": "Widgets Config", "es": "Widgets", "zh": "小部件"}, "icon": "puzzle", "permission": "admin.site_config", "enabled": True, "order": 3},
                        {"id": "badge-config", "label": {"en": "Badges", "es": "Badges", "zh": "徽章"}, "icon": "palette", "permission": "admin.site_config", "enabled": True, "order": 4},
                        {"id": "showcase", "label": {"en": "Media Gallery", "es": "Galería", "zh": "展示"}, "icon": "image", "permission": "admin.site_config", "enabled": True, "order": 5},
                        {"id": "ticker", "label": {"en": "News Ticker", "es": "Noticias", "zh": "滚动消息"}, "icon": "radio", "permission": "admin.site_config", "enabled": True, "order": 6},
                    ]
                },
                {
                    "id": "config", "order": 2, "collapsed_default": False,
                    "label": {"en": "System", "es": "Sistema", "zh": "系统"},
                    "items": [
                        {"id": "print-config", "label": {"en": "Print & Package", "es": "Impresión", "zh": "打印"}, "icon": "printer", "permission": "admin.site_config", "enabled": True, "order": 1},
                        {"id": "privacy", "label": {"en": "Privacy", "es": "Privacidad", "zh": "隐私"}, "icon": "eye-off", "permission": "admin.site_config", "enabled": True, "order": 2},
                        {"id": "auth-config", "label": {"en": "Authentication", "es": "Autenticación", "zh": "认证"}, "icon": "shield", "permission": "admin.site_config", "enabled": True, "order": 3},
                        {"id": "translations", "label": {"en": "Translations", "es": "Traducciones", "zh": "翻译"}, "icon": "languages", "permission": "admin.site_config", "enabled": True, "order": 4},
                    ]
                },
                {
                    "id": "developer", "order": 3, "collapsed_default": True,
                    "label": {"en": "Developer", "es": "Desarrollador", "zh": "开发者"},
                    "items": [
                        {"id": "demo", "label": {"en": "Demo Data", "es": "Datos Demo", "zh": "演示数据"}, "icon": "database", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 1},
                        {"id": "system-monitor", "label": {"en": "System Monitor", "es": "Monitor", "zh": "监控"}, "icon": "activity", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 2},
                        {"id": "devcontrol", "label": {"en": "Dev Control", "es": "Control Dev", "zh": "开发控制"}, "icon": "code", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 3},
                        {"id": "menu-manager", "label": {"en": "Menu Manager", "es": "Gestor Menú", "zh": "菜单管理"}, "icon": "settings", "permission": "admin.site_config", "admin_only": True, "enabled": True, "order": 4},
                    ]
                },
            ]
        },
    ]
}


@router.get("")
async def get_menu(admin: dict = Depends(get_admin_user)):
    """Get admin menu configuration with module tabs."""
    doc = await db[C_MENU].find_one({"_id": "admin_menu"})
    # Auto-upgrade to v2 if missing modules (the v2 key structure)
    if not doc or "modules" not in doc:
        await db[C_MENU].replace_one({"_id": "admin_menu"}, DEFAULT_MENU, upsert=True)
        doc = DEFAULT_MENU
    doc.pop("_id", None)
    roles = await db.rbac_roles.find({}, {"_id": 0, "role_id": 1, "name": 1}).to_list(50)
    doc["available_roles"] = roles or [
        {"role_id": "super_admin", "name": "Super Admin"},
        {"role_id": "admin", "name": "Admin"},
        {"role_id": "moderator", "name": "Moderator"},
        {"role_id": "store_manager", "name": "Store Manager"},
        {"role_id": "teacher", "name": "Teacher"},
    ]
    return doc


@router.put("")
async def update_menu(data: dict, admin: dict = Depends(get_admin_user)):
    """Update full menu configuration."""
    modules = data.get("modules") or data.get("groups")
    if not modules:
        raise HTTPException(400, "modules array required")
    key = "modules" if "modules" in data else "groups"
    await db[C_MENU].replace_one(
        {"_id": "admin_menu"},
        {"_id": "admin_menu", "version": data.get("version", 2), key: modules},
        upsert=True
    )
    return {"success": True}


@router.put("/item/{item_id}/toggle")
async def toggle_item(item_id: str, admin: dict = Depends(get_admin_user)):
    """Toggle an item's enabled state."""
    doc = await db[C_MENU].find_one({"_id": "admin_menu"})
    if not doc:
        raise HTTPException(404, "Menu config not found")
    
    for mod in doc.get("modules", doc.get("groups", [])):
        groups = mod.get("groups", mod.get("items", []))
        if isinstance(groups, list) and len(groups) > 0 and "items" in groups[0]:
            for g in groups:
                for item in g.get("items", []):
                    if item["id"] == item_id:
                        item["enabled"] = not item.get("enabled", True)
                        await db[C_MENU].replace_one({"_id": "admin_menu"}, doc)
                        return {"success": True, "enabled": item["enabled"]}
        else:
            for item in groups:
                if item.get("id") == item_id:
                    item["enabled"] = not item.get("enabled", True)
                    await db[C_MENU].replace_one({"_id": "admin_menu"}, doc)
                    return {"success": True, "enabled": item["enabled"]}
    raise HTTPException(404, f"Item {item_id} not found")


@router.post("/reset")
async def reset_menu(admin: dict = Depends(get_admin_user)):
    """Reset menu to defaults (v2 with module tabs)."""
    await db[C_MENU].replace_one({"_id": "admin_menu"}, DEFAULT_MENU, upsert=True)
    return {"success": True, "message": "Menu reset to v2 (module tabs)"}
