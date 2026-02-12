"""
Translation Management Routes for ChiPi Link
Permission-gated: users with translations.* permissions can contribute.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional, List, Dict
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/translations", tags=["translations"])
security = HTTPBearer(auto_error=False)

# These will be set by the main server
db = None
_get_admin_user = None
_get_current_user_fn = None


def init_routes(_db, admin_fn, current_user_fn):
    global db, _get_admin_user, _get_current_user_fn
    db = _db
    _get_admin_user = admin_fn
    _get_current_user_fn = current_user_fn


async def get_authenticated_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Resolve the current user using the auth module's function"""
    return await _get_current_user_fn(request, credentials)


async def _check_permission(user: dict, permission: str):
    """Check if user has a specific translations permission"""
    if user.get("is_admin"):
        return True
    from core.auth import get_user_permissions, check_permission_match
    perms = await get_user_permissions(user["user_id"])
    if check_permission_match(perms, permission):
        return True
    raise HTTPException(status_code=403, detail=f"Required: {permission}")


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/all")
async def get_all_translations(lang: Optional[str] = None):
    """Get all translations, optionally filtered by language"""
    translations = await db.translations.find({}, {"_id": 0}).to_list(5000)
    if not translations:
        return {}

    result = {}
    for t in translations:
        key = t.get("key")
        if key:
            if key not in result:
                result[key] = {"key": key, "es": "", "zh": "", "en": ""}
            result[key][t.get("lang", "es")] = t.get("value", "")

    if lang:
        return {k: v.get(lang, v.get("es", "")) for k, v in result.items()}
    return list(result.values())


@router.get("/by-key/{key}")
async def get_translation_by_key(key: str):
    """Get a specific translation by key"""
    translations = await db.translations.find({"key": key}, {"_id": 0}).to_list(3)
    result = {"key": key, "es": "", "zh": "", "en": ""}
    for t in translations:
        result[t.get("lang", "es")] = t.get("value", "")
    return result


@router.get("/locale/{lang}")
async def get_locale(lang: str):
    """Get all translations for a specific language in nested format"""
    translations = await db.translations.find({"lang": lang}, {"_id": 0}).to_list(5000)
    result = {}
    for t in translations:
        key = t.get("key", "")
        value = t.get("value", "")
        parts = key.split(".")
        current = result
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            current = current[part]
        if parts:
            current[parts[-1]] = value
    return result


# ==================== PERMISSION-GATED ENDPOINTS ====================

@router.get("/admin/list")
async def admin_list_translations(
    search: Optional[str] = None,
    category: Optional[str] = None,
    missing_only: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_authenticated_user)
):
    """List translations (requires translations.view)"""
    await _check_permission(user, "translations.view")

    pipeline = [
        {"$group": {
            "_id": "$key",
            "translations": {"$push": {"lang": "$lang", "value": "$value"}}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db.translations.aggregate(pipeline).to_list(5000)

    items = []
    for r in results:
        key = r["_id"]
        item = {
            "key": key,
            "category": key.split(".")[0] if "." in key else "general",
            "es": "", "zh": "", "en": ""
        }
        for t in r.get("translations", []):
            item[t["lang"]] = t["value"]

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
    key: str, lang: str, value: str,
    user: dict = Depends(get_authenticated_user)
):
    """Update a single translation (requires translations.edit)"""
    await _check_permission(user, "translations.edit")

    if lang not in ["es", "zh", "en"]:
        raise HTTPException(status_code=400, detail="Invalid language")

    await db.translations.update_one(
        {"key": key, "lang": lang},
        {
            "$set": {
                "value": value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user.get("user_id", "unknown"),
            },
            "$setOnInsert": {
                "key": key, "lang": lang,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {"success": True}


@router.post("/admin/bulk-update")
async def admin_bulk_update(
    translations: List[Dict],
    user: dict = Depends(get_authenticated_user)
):
    """Bulk update translations (requires translations.edit)"""
    await _check_permission(user, "translations.edit")

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
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                            "updated_by": user.get("user_id", "unknown"),
                        },
                        "$setOnInsert": {
                            "key": key, "lang": lang,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                    },
                    upsert=True
                )
                updated += 1
    return {"success": True, "updated": updated}


@router.delete("/admin/delete/{key}")
async def admin_delete_translation(
    key: str,
    user: dict = Depends(get_authenticated_user)
):
    """Delete a translation key (requires translations.manage)"""
    await _check_permission(user, "translations.manage")
    result = await db.translations.delete_many({"key": key})
    return {"success": True, "deleted": result.deleted_count}


@router.get("/admin/export")
async def admin_export_translations(
    lang: Optional[str] = None,
    user: dict = Depends(get_authenticated_user)
):
    """Export translations (requires translations.view)"""
    await _check_permission(user, "translations.view")

    if lang:
        return await get_locale(lang)
    result = {}
    for l in ["es", "zh", "en"]:
        result[l] = await get_locale(l)
    return result


@router.get("/admin/coverage")
async def admin_translation_coverage(
    user: dict = Depends(get_authenticated_user)
):
    """Analyze translation coverage across all locale files"""
    await _check_permission(user, "translations.view")

    import os
    base_path = "/app/frontend/src/i18n/locales"

    def flatten_dict(d, parent_key=''):
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(flatten_dict(v, new_key))
            else:
                items.append((new_key, str(v)))
        return items

    locale_keys = {}
    locale_counts = {}
    for lang in ["en", "es", "zh"]:
        file_path = f"{base_path}/{lang}.json"
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            flat = flatten_dict(data)
            locale_keys[lang] = {k for k, v in flat if v.strip()}
            locale_counts[lang] = len(flat)
        else:
            locale_keys[lang] = set()
            locale_counts[lang] = 0

    all_keys = set()
    for keys in locale_keys.values():
        all_keys.update(keys)
    reference_keys = locale_keys.get("en", all_keys)

    languages = {}
    for lang in ["en", "es", "zh"]:
        present = locale_keys.get(lang, set())
        missing = sorted(reference_keys - present)
        total_ref = len(reference_keys) if reference_keys else 1
        pct = round(len(present & reference_keys) / total_ref * 100, 1)
        languages[lang] = {
            "total_keys": locale_counts.get(lang, 0),
            "translated": len(present & reference_keys),
            "missing_count": len(missing),
            "missing_keys": missing[:200],
            "extra_count": len(sorted(present - reference_keys)),
            "coverage_pct": pct,
        }

    categories = {}
    for key in reference_keys:
        cat = key.split(".")[0] if "." in key else "general"
        if cat not in categories:
            categories[cat] = {"total": 0, "en": 0, "es": 0, "zh": 0}
        categories[cat]["total"] += 1
        for lang in ["en", "es", "zh"]:
            if key in locale_keys.get(lang, set()):
                categories[cat][lang] += 1

    return {
        "reference_lang": "en",
        "total_reference_keys": len(reference_keys),
        "languages": languages,
        "categories": dict(sorted(categories.items())),
    }


@router.post("/admin/sync-from-files")
async def admin_sync_from_files(
    user: dict = Depends(get_authenticated_user)
):
    """Sync translations from JSON files to database (requires translations.manage)"""
    await _check_permission(user, "translations.manage")

    import os
    base_path = "/app/frontend/src/i18n/locales"
    synced = 0

    for lang in ["es", "zh", "en"]:
        file_path = f"{base_path}/{lang}.json"
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

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
                            "key": key, "lang": lang,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                    },
                    upsert=True
                )
                synced += 1

    return {"success": True, "synced": synced}
