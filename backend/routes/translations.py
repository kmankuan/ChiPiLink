"""
Translation Management Routes for ChiPi Link
Allows admins to manage translations dynamically
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/translations", tags=["translations"])

# These will be set by the main server
db = None
get_admin_user = None

def init_routes(_db, _get_admin_user, _get_current_user):
    global db, get_admin_user
    db = _db
    get_admin_user = _get_admin_user

# ==================== PUBLIC ENDPOINTS ====================

@router.get("/all")
async def get_all_translations(lang: Optional[str] = None):
    """Get all translations, optionally filtered by language"""
    # First get base translations from DB
    translations = await db.translations.find({}, {"_id": 0}).to_list(5000)
    
    if not translations:
        return {}
    
    # Group by key
    result = {}
    for t in translations:
        key = t.get("key")
        if key:
            if key not in result:
                result[key] = {"key": key, "es": "", "zh": "", "en": ""}
            result[key][t.get("lang", "es")] = t.get("value", "")
    
    if lang:
        # Return flat structure for specific language
        return {k: v.get(lang, v.get("es", "")) for k, v in result.items()}
    
    return list(result.values())

@router.get("/by-key/{key}")
async def get_translation_by_key(key: str):
    """Get a specific translation by key"""
    translations = await db.translations.find(
        {"key": key},
        {"_id": 0}
    ).to_list(3)
    
    result = {"key": key, "es": "", "zh": "", "en": ""}
    for t in translations:
        result[t.get("lang", "es")] = t.get("value", "")
    
    return result

@router.get("/locale/{lang}")
async def get_locale(lang: str):
    """Get all translations for a specific language in nested format for i18n"""
    translations = await db.translations.find(
        {"lang": lang},
        {"_id": 0}
    ).to_list(5000)
    
    # Build nested structure from dot-notation keys
    result = {}
    for t in translations:
        key = t.get("key", "")
        value = t.get("value", "")
        
        # Handle dot notation (e.g., "nav.home" -> {nav: {home: value}})
        parts = key.split(".")
        current = result
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            current = current[part]
        if parts:
            current[parts[-1]] = value
    
    return result

# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/list")
async def admin_list_translations(
    search: Optional[str] = None,
    category: Optional[str] = None,
    missing_only: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    admin = Depends(lambda: get_admin_user)
):
    """List all translations with search and filter (admin)"""
    # Get all unique keys
    pipeline = [
        {"$group": {
            "_id": "$key",
            "translations": {
                "$push": {"lang": "$lang", "value": "$value"}
            }
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.translations.aggregate(pipeline).to_list(5000)
    
    # Transform to unified format
    items = []
    for r in results:
        key = r["_id"]
        item = {
            "key": key,
            "category": key.split(".")[0] if "." in key else "general",
            "es": "",
            "zh": "",
            "en": ""
        }
        for t in r.get("translations", []):
            item[t["lang"]] = t["value"]
        
        # Apply filters
        if search and search.lower() not in key.lower() and \
           search.lower() not in item["es"].lower() and \
           search.lower() not in item["zh"].lower() and \
           search.lower() not in item["en"].lower():
            continue
        
        if category and item["category"] != category:
            continue
        
        if missing_only and item["es"] and item["zh"] and item["en"]:
            continue
        
        items.append(item)
    
    # Pagination
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "categories": list(set(i["category"] for i in items))
    }

@router.post("/admin/update")
async def admin_update_translation(
    key: str,
    lang: str,
    value: str,
    admin = Depends(lambda: get_admin_user)
):
    """Update a single translation (admin)"""
    if lang not in ["es", "zh", "en"]:
        raise HTTPException(status_code=400, detail="Invalid language")
    
    # Upsert the translation
    await db.translations.update_one(
        {"key": key, "lang": lang},
        {
            "$set": {
                "value": value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "key": key,
                "lang": lang,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True}

@router.post("/admin/bulk-update")
async def admin_bulk_update(
    translations: List[Dict],
    admin = Depends(lambda: get_admin_user)
):
    """Bulk update translations (admin)"""
    updated = 0
    for t in translations:
        key = t.get("key")
        if not key:
            continue
        
        for lang in ["es", "zh", "en"]:
            if lang in t and t[lang]:
                await db.translations.update_one(
                    {"key": key, "lang": lang},
                    {
                        "$set": {
                            "value": t[lang],
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        },
                        "$setOnInsert": {
                            "key": key,
                            "lang": lang,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                    },
                    upsert=True
                )
                updated += 1
    
    return {"success": True, "updated": updated}

@router.post("/admin/import")
async def admin_import_translations(
    data: Dict,
    lang: str,
    admin = Depends(lambda: get_admin_user)
):
    """Import translations from JSON structure (admin)"""
    if lang not in ["es", "zh", "en"]:
        raise HTTPException(status_code=400, detail="Invalid language")
    
    def flatten_dict(d, parent_key=''):
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(flatten_dict(v, new_key))
            else:
                items.append((new_key, str(v)))
        return items
    
    flat = flatten_dict(data)
    
    for key, value in flat:
        await db.translations.update_one(
            {"key": key, "lang": lang},
            {
                "$set": {
                    "value": value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "key": key,
                    "lang": lang,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
    
    return {"success": True, "imported": len(flat)}

@router.delete("/admin/delete/{key}")
async def admin_delete_translation(
    key: str,
    admin = Depends(lambda: get_admin_user)
):
    """Delete a translation key (all languages) (admin)"""
    result = await db.translations.delete_many({"key": key})
    return {"success": True, "deleted": result.deleted_count}

@router.get("/admin/export")
async def admin_export_translations(
    lang: Optional[str] = None,
    admin = Depends(lambda: get_admin_user)
):
    """Export all translations (admin)"""
    if lang:
        return await get_locale(lang)
    
    # Export all languages
    result = {}
    for l in ["es", "zh", "en"]:
        result[l] = await get_locale(l)
    
    return result

@router.post("/admin/sync-from-files")
async def admin_sync_from_files(admin = Depends(lambda: get_admin_user)):
    """Sync translations from JSON files to database (admin)"""
    import os
    
    base_path = "/app/frontend/src/i18n/locales"
    synced = 0
    
    for lang in ["es", "zh", "en"]:
        file_path = f"{base_path}/{lang}.json"
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Import to DB
            def flatten_dict(d, parent_key=''):
                items = []
                for k, v in d.items():
                    new_key = f"{parent_key}.{k}" if parent_key else k
                    if isinstance(v, dict):
                        items.extend(flatten_dict(v, new_key))
                    else:
                        items.append((new_key, str(v)))
                return items
            
            flat = flatten_dict(data)
            
            for key, value in flat:
                await db.translations.update_one(
                    {"key": key, "lang": lang},
                    {
                        "$set": {"value": value},
                        "$setOnInsert": {
                            "key": key,
                            "lang": lang,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                    },
                    upsert=True
                )
                synced += 1
    
    return {"success": True, "synced": synced}
