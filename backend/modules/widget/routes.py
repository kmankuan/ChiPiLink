"""
Widget Routes — Admin config + public embed config endpoints.
"""
import os
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from core.auth import get_admin_user
from .service import widget_config_service

router = APIRouter(prefix="/widget", tags=["Widget"])


# ── Public: embed config (no auth) ──────────────────────────
@router.get("/embed-config")
async def get_embed_config():
    """Public endpoint — returns widget config for the embed loader script."""
    return await widget_config_service.get_public_config()


# ── Admin: full config CRUD ─────────────────────────────────
@router.get("/admin/config")
async def get_widget_config(admin: dict = Depends(get_admin_user)):
    return await widget_config_service.get_config()


@router.put("/admin/config")
async def update_widget_config(request: Request, admin: dict = Depends(get_admin_user)):
    body = await request.json()
    return await widget_config_service.update_config(body, admin.get("user_id"))


@router.post("/admin/config/reset")
async def reset_widget_config(admin: dict = Depends(get_admin_user)):
    """Reset widget config to defaults."""
    return await widget_config_service.reset_config(admin.get("user_id"))


LOADER_JS_TEMPLATE = """
(function() {
  'use strict';
  if (window.__chipiWidgetLoaded) return;
  window.__chipiWidgetLoaded = true;

  var API_URL = __API_URL__;
  var CONFIG = __CONFIG__;
  var P = CONFIG.placement || {};
  var A = CONFIG.appearance || {};

  if (!CONFIG.enabled) return;

  var fontFamily = A.font_family || 'Inter';
  var primaryColor = A.primary_color || '#16a34a';
  var sidebarWidth = P.sidebar_width || '380px';
  var floatingLabel = P.floating_label || 'ChiPi Link';
  var offsetX = P.floating_offset_x || '20px';
  var offsetY = P.floating_offset_y || '20px';
  var iconType = P.floating_icon || 'book';
  var btnStyle = P.floating_style || 'pill';

  var ICONS = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    graduation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg>',
    circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  };
  var iconSvg = ICONS[iconType] || ICONS.book;

  var btnPadding, btnRadius, btnFontSize, btnIconSize;
  if (btnStyle === 'circle') {
    btnPadding = '14px'; btnRadius = '50%'; btnFontSize = '0'; btnIconSize = '24px';
  } else if (btnStyle === 'icon-only') {
    btnPadding = '12px'; btnRadius = '16px'; btnFontSize = '0'; btnIconSize = '22px';
  } else if (btnStyle === 'square') {
    btnPadding = '10px 18px'; btnRadius = '12px'; btnFontSize = '14px'; btnIconSize = '20px';
  } else {
    btnPadding = '10px 18px'; btnRadius = '999px'; btnFontSize = '14px'; btnIconSize = '20px';
  }

  var style = document.createElement('style');
  style.textContent = [
    '#chipi-widget-frame { border:none; z-index:99999; background:transparent; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); }',
    '#chipi-widget-btn { position:fixed; z-index:99998; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; padding:' + btnPadding + '; border-radius:' + btnRadius + '; border:none; font-family:' + fontFamily + ',system-ui,sans-serif; font-size:' + btnFontSize + '; font-weight:600; color:#fff; background:' + primaryColor + '; box-shadow:0 4px 20px rgba(0,0,0,0.18); transition:transform 0.2s,box-shadow 0.2s; }',
    '#chipi-widget-btn:hover { transform:scale(1.05); box-shadow:0 6px 28px rgba(0,0,0,0.22); }',
    '#chipi-widget-btn svg { width:' + btnIconSize + '; height:' + btnIconSize + '; }',
    '.chipi-widget-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.3); z-index:99998; opacity:0; transition:opacity 0.3s; pointer-events:none; }',
    '.chipi-widget-overlay.active { opacity:1; pointer-events:all; }'
  ].join('\\n');
  document.head.appendChild(style);

  var pos = P.floating_position || 'bottom-right';
  var btn = document.createElement('button');
  btn.id = 'chipi-widget-btn';
  btn.innerHTML = iconSvg + (btnFontSize !== '0' ? floatingLabel : '');
  if (pos === 'bottom-right') { btn.style.cssText += 'bottom:' + offsetY + ';right:' + offsetX + ';'; }
  else if (pos === 'bottom-left') { btn.style.cssText += 'bottom:' + offsetY + ';left:' + offsetX + ';'; }
  else if (pos === 'top-right') { btn.style.cssText += 'top:' + offsetY + ';right:' + offsetX + ';'; }
  else if (pos === 'bottom-center') { btn.style.cssText += 'bottom:' + offsetY + ';left:50%;transform:translateX(-50%);'; }
  else if (pos === 'middle-right') { btn.style.cssText += 'top:50%;right:' + offsetX + ';transform:translateY(-50%);'; }
  else if (pos === 'middle-left') { btn.style.cssText += 'top:50%;left:' + offsetX + ';transform:translateY(-50%);'; }
  else { btn.style.cssText += 'top:' + offsetY + ';left:' + offsetX + ';'; }

  var overlay = document.createElement('div');
  overlay.className = 'chipi-widget-overlay';

  var frame = document.createElement('iframe');
  frame.id = 'chipi-widget-frame';
  frame.src = API_URL + '/embed/widget';
  frame.allow = 'clipboard-write';
  var sidebarPx = parseInt(sidebarWidth) || 380;
  frame.style.cssText = 'position:fixed; width:' + sidebarWidth + '; height:100vh; top:0; right:-' + (sidebarPx + 20) + 'px; box-shadow:-4px 0 30px rgba(0,0,0,0.15); border-radius:0;';

  var open = false;
  function toggle() {
    open = !open;
    if (open) {
      frame.style.right = '0';
      overlay.classList.add('active');
      btn.style.transform = 'scale(0.9)';
    } else {
      frame.style.right = '-' + (sidebarPx + 20) + 'px';
      overlay.classList.remove('active');
      btn.style.transform = '';
    }
  }

  btn.addEventListener('click', toggle);
  overlay.addEventListener('click', toggle);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'chipi-widget-close') toggle();
    if (e.data && e.data.type === 'chipi-widget-resize') {
      frame.style.width = e.data.width || sidebarWidth;
    }
  });

  if (P.floating_button !== false) document.body.appendChild(btn);
  document.body.appendChild(overlay);
  document.body.appendChild(frame);
})();
"""


@router.get("/loader.js")
async def widget_loader_js(request: Request):
    """Serve the lightweight widget loader script for external sites."""
    full_config = await widget_config_service.get_config()
    config = await widget_config_service.get_public_config()
    
    # Use configured site_url, fallback to request host
    site_url = full_config.get("site_url", "").rstrip("/")
    if not site_url:
        scheme = request.headers.get("x-forwarded-proto", "https")
        host = request.headers.get("x-forwarded-host", request.headers.get("host", ""))
        site_url = f"{scheme}://{host}"

    js = LOADER_JS_TEMPLATE.replace('__API_URL__', json.dumps(site_url)).replace('__CONFIG__', json.dumps(config))
    return Response(content=js.strip(), media_type="application/javascript")
