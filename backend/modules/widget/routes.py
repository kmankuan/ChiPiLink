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

  var style = document.createElement('style');
  style.textContent = [
    '#chipi-widget-frame { border:none; z-index:99999; background:transparent; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); }',
    '#chipi-widget-btn { position:fixed; z-index:99998; cursor:pointer; display:flex; align-items:center; gap:8px; padding:10px 18px; border-radius:999px; border:none; font-family:' + fontFamily + ',system-ui,sans-serif; font-size:14px; font-weight:600; color:#fff; background:' + primaryColor + '; box-shadow:0 4px 20px rgba(0,0,0,0.18); transition:transform 0.2s,box-shadow 0.2s; }',
    '#chipi-widget-btn:hover { transform:scale(1.05); box-shadow:0 6px 28px rgba(0,0,0,0.22); }',
    '#chipi-widget-btn svg { width:20px; height:20px; fill:currentColor; }',
    '.chipi-widget-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.3); z-index:99998; opacity:0; transition:opacity 0.3s; pointer-events:none; }',
    '.chipi-widget-overlay.active { opacity:1; pointer-events:all; }'
  ].join('\\n');
  document.head.appendChild(style);

  var pos = P.floating_position || 'bottom-right';
  var btn = document.createElement('button');
  btn.id = 'chipi-widget-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' + floatingLabel;
  if (pos === 'bottom-right') { btn.style.cssText += 'bottom:20px;right:20px;'; }
  else if (pos === 'bottom-left') { btn.style.cssText += 'bottom:20px;left:20px;'; }
  else if (pos === 'top-right') { btn.style.cssText += 'top:20px;right:20px;'; }
  else { btn.style.cssText += 'top:20px;left:20px;'; }

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
    config = await widget_config_service.get_public_config()
    scheme = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("x-forwarded-host", request.headers.get("host", ""))
    base_url = f"{scheme}://{host}"

    js = LOADER_JS_TEMPLATE.replace('__API_URL__', json.dumps(base_url)).replace('__CONFIG__', json.dumps(config))
    return Response(content=js.strip(), media_type="application/javascript")
