"""
Package List Print Module — Backend endpoints for:
- Package list format configuration (admin)
- Print job creation and Monday.com webhook trigger
- Printer configuration

Monday.com Batch Printing:
  When multiple button clicks arrive from Monday.com within a short time window,
  they are automatically batched into a single print job. This allows users to
  click the Print button on 10 rows and get one combined print job.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/print", tags=["Print"])

# Monday.com button column ID that triggers printing
PRINT_BUTTON_COLUMN_ID = "button_mm0xa5t0"

# Batch window: seconds to wait for more button clicks before finalizing the print job
MONDAY_BATCH_WINDOW_SECONDS = 15

db = None
get_admin_user = None
get_current_user = None
ws_manager = None

# In-memory batch accumulator: { batch_id: { "order_ids": [...], "monday_item_ids": [...], "task": asyncio.Task } }
_active_batch = None
_batch_lock = asyncio.Lock()

def init_print_routes(_db, _get_admin_user, _get_current_user, _ws_manager=None):
    global db, get_admin_user, get_current_user, ws_manager
    db = _db
    get_admin_user = _get_admin_user
    get_current_user = _get_current_user
    ws_manager = _ws_manager


# ============ DEFAULT CONFIGS ============

DEFAULT_FORMAT_CONFIG = {
    "paper_size": "80mm",
    "orientation": "portrait",
    "header": {
        "show_logo": True,
        "logo_url": "",
        "title": "Package List",
        "subtitle": "",
        "show_date": True,
        "show_order_id": True,
    },
    "body": {
        "show_student_name": True,
        "show_grade": True,
        "show_item_code": True,
        "show_item_name": True,
        "show_item_price": True,
        "show_item_quantity": True,
        "show_item_status": True,
        "show_checkboxes": True,
        "group_by": "none",
    },
    "footer": {
        "show_total": True,
        "show_item_count": True,
        "show_signature_line": True,
        "signature_label": "Received by",
        "custom_text": "",
        "show_barcode": False,
    },
    "style": {
        "font_size": "12px",
        "compact_mode": False,
    }
}

DEFAULT_PRINTER_CONFIG = {
    "printers": [],
    "default_printer_id": "",
    "auto_print": False,
}

DEFAULT_TEMPLATE = """<div class="package-list">
  <div class="header">
    {{#if header.show_logo}}<img src="{{header.logo_url}}" class="logo" />{{/if}}
    <h1>{{header.title}}</h1>
    {{#if header.subtitle}}<p class="subtitle">{{header.subtitle}}</p>{{/if}}
    {{#if header.show_date}}<p class="date">{{date}}</p>{{/if}}
    {{#if header.show_order_id}}<p class="order-id">Order: {{order_id}}</p>{{/if}}
  </div>
  <div class="student-info">
    <strong>{{student_name}}</strong> — Grade {{grade}}
  </div>
  <table class="items">
    <thead><tr>
      {{#if body.show_checkboxes}}<th>✓</th>{{/if}}
      {{#if body.show_item_code}}<th>Code</th>{{/if}}
      <th>Item</th>
      {{#if body.show_item_quantity}}<th>Qty</th>{{/if}}
      {{#if body.show_item_price}}<th>Price</th>{{/if}}
    </tr></thead>
    <tbody>{{items}}</tbody>
  </table>
  <div class="footer">
    {{#if footer.show_total}}<p class="total">Total: ${{total}}</p>{{/if}}
    {{#if footer.show_item_count}}<p>Items: {{item_count}}</p>{{/if}}
    {{#if footer.show_signature_line}}<div class="signature">_______________<br/>{{footer.signature_label}}</div>{{/if}}
    {{#if footer.custom_text}}<p class="custom">{{footer.custom_text}}</p>{{/if}}
  </div>
</div>"""


# ============ FORMAT CONFIG ============

@router.get("/config/format")
async def get_format_config(admin=Depends(lambda: get_admin_user)):
    """Get package list format configuration"""
    config = await db.app_config.find_one({"config_key": "print_format"}, {"_id": 0})
    return {
        "format": config["value"] if config else DEFAULT_FORMAT_CONFIG,
        "template": config.get("template") if config else DEFAULT_TEMPLATE,
    }


@router.put("/config/format")
async def update_format_config(data: dict, admin=Depends(lambda: get_admin_user)):
    """Update package list format configuration"""
    now = datetime.now(timezone.utc).isoformat()
    update = {
        "config_key": "print_format",
        "value": data.get("format", DEFAULT_FORMAT_CONFIG),
        "updated_at": now,
        "updated_by": admin.get("email", "") if isinstance(admin, dict) else "",
    }
    if "template" in data:
        update["template"] = data["template"]

    await db.app_config.update_one(
        {"config_key": "print_format"},
        {"$set": update},
        upsert=True
    )
    return {"success": True}


# ============ PRINTER CONFIG ============

@router.get("/config/printer")
async def get_printer_config(admin=Depends(lambda: get_admin_user)):
    """Get printer configuration"""
    config = await db.app_config.find_one({"config_key": "print_printer"}, {"_id": 0})
    return config["value"] if config else DEFAULT_PRINTER_CONFIG


@router.put("/config/printer")
async def update_printer_config(data: dict, admin=Depends(lambda: get_admin_user)):
    """Update printer configuration"""
    now = datetime.now(timezone.utc).isoformat()
    await db.app_config.update_one(
        {"config_key": "print_printer"},
        {"$set": {
            "config_key": "print_printer",
            "value": data,
            "updated_at": now,
            "updated_by": admin.get("email", "") if isinstance(admin, dict) else "",
        }},
        upsert=True
    )
    return {"success": True}


# ============ PRINT JOBS ============

@router.post("/jobs")
async def create_print_job(data: dict, admin=Depends(lambda: get_admin_user)):
    """Create a print job for one or more orders"""
    order_ids = data.get("order_ids", [])
    if not order_ids:
        raise HTTPException(status_code=400, detail="No orders specified")

    # Fetch orders from store_textbook_orders collection
    orders = await db.store_textbook_orders.find(
        {"order_id": {"$in": order_ids}},
        {"_id": 0}
    ).to_list(100)

    if not orders:
        raise HTTPException(status_code=404, detail="No orders found")

    # Get format config
    config = await db.app_config.find_one({"config_key": "print_format"}, {"_id": 0})
    fmt = config["value"] if config else DEFAULT_FORMAT_CONFIG
    template = config.get("template", DEFAULT_TEMPLATE) if config else DEFAULT_TEMPLATE

    now = datetime.now(timezone.utc).isoformat()
    job_id = f"PJ-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    job = {
        "job_id": job_id,
        "order_ids": order_ids,
        "orders": orders,
        "student_names": list({o.get("student_name", "") for o in orders if o.get("student_name")}),
        "order_count": len(orders),
        "format_config": fmt,
        "template": template,
        "status": "pending",
        "source": "app",
        "created_at": now,
        "created_by": admin.get("email", "") if isinstance(admin, dict) else "",
    }

    await db.print_jobs.insert_one(job)

    # Broadcast print event to all admin connections
    if ws_manager:
        await ws_manager.broadcast_to_room("admin", {
            "type": "print_job",
            "job_id": job_id,
            "order_ids": order_ids,
            "order_count": len(orders),
        })

    return {
        "job_id": job_id,
        "orders": orders,
        "format_config": fmt,
        "template": template,
    }


@router.get("/jobs/{job_id}")
async def get_print_job(job_id: str, admin=Depends(lambda: get_admin_user)):
    """Get a specific print job"""
    job = await db.print_jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    return job


@router.get("/jobs")
async def list_print_jobs(
    limit: int = 50,
    skip: int = 0,
    admin=Depends(lambda: get_admin_user)
):
    """List print job history with pagination"""
    total = await db.print_jobs.count_documents({})
    jobs = await db.print_jobs.find(
        {},
        {"_id": 0, "orders": 0, "format_config": 0, "template": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"jobs": jobs, "total": total}


@router.post("/jobs/{job_id}/complete")
async def complete_print_job(job_id: str, admin=Depends(lambda: get_admin_user)):
    """Mark a print job as printed"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.print_jobs.update_one(
        {"job_id": job_id},
        {"$set": {
            "status": "printed",
            "printed_at": now,
            "printed_by": admin.get("email", "") if isinstance(admin, dict) else "",
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Print job not found")
    return {"success": True, "printed_at": now}



@router.get("/monday-webhook-status")
async def get_monday_webhook_status(admin=Depends(lambda: get_admin_user)):
    """Get the status of the Monday.com print webhook integration"""
    config = await db.app_config.find_one({"config_key": "print_monday_webhook"}, {"_id": 0})
    if not config:
        return {"configured": False}
    return {"configured": True, **config.get("value", {})}


# ============ MONDAY.COM WEBHOOK ============

@router.post("/monday-trigger")
async def monday_print_trigger(data: dict):
    """Webhook endpoint for Monday.com button column to trigger printing.
    Monday.com sends: { "event": { "boardId", "pulseId", "columnId", "value" } }
    Webhook fires on ALL column changes — we filter for the print button column only.
    """
    # Monday.com challenge verification (sent once when webhook is created)
    if "challenge" in data:
        logger.info(f"[print/monday-trigger] Challenge: {data['challenge']}")
        return {"challenge": data["challenge"]}

    event = data.get("event", {})
    column_id = event.get("columnId", "")
    item_id = str(event.get("pulseId") or event.get("itemId") or "")

    logger.info(f"[print/monday-trigger] Event: column={column_id}, item={item_id}, board={event.get('boardId')}")

    # Ignore non-button column changes
    if column_id and column_id != PRINT_BUTTON_COLUMN_ID:
        return {"status": "ignored", "reason": f"column {column_id} is not the print button"}

    if not item_id:
        return {"status": "ignored", "reason": "no item ID"}

    # Find the order linked to this Monday.com item
    order = await db.store_textbook_orders.find_one(
        {"$or": [
            {"monday_item_id": item_id},
            {"monday_item_ids": item_id},
        ]},
        {"_id": 0}
    )

    if not order:
        logger.warning(f"[print/monday-trigger] No order found for monday item {item_id}")
        return {"status": "no_order_found", "monday_item_id": item_id}

    # Get format config
    config = await db.app_config.find_one({"config_key": "print_format"}, {"_id": 0})
    fmt = config["value"] if config else DEFAULT_FORMAT_CONFIG
    template = config.get("template", DEFAULT_TEMPLATE) if config else DEFAULT_TEMPLATE

    now = datetime.now(timezone.utc).isoformat()
    job_id = f"PJ-MON-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    job = {
        "job_id": job_id,
        "order_ids": [order["order_id"]],
        "orders": [order],
        "student_names": [order.get("student_name", "")],
        "order_count": 1,
        "format_config": fmt,
        "template": template,
        "status": "pending",
        "source": "monday",
        "monday_item_id": item_id,
        "created_at": now,
    }

    await db.print_jobs.insert_one(job)

    logger.info(f"[print/monday-trigger] Print job created: {job_id} for order {order['order_id']}")

    # Broadcast to admin browsers for immediate printing
    if ws_manager:
        await ws_manager.broadcast_to_room("admin", {
            "type": "print_job",
            "job_id": job_id,
            "order_ids": [order["order_id"]],
            "order_count": 1,
            "source": "monday",
        })

    return {"status": "print_triggered", "job_id": job_id, "order_id": order["order_id"]}
