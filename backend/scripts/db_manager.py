"""
Database Management Utilities
Scripts para management y migration de la base de datos por module

Uso:
    python scripts/db_manager.py --action list
    python scripts/db_manager.py --action export --module pinpanclub
    python scripts/db_manager.py --action stats
"""

import asyncio
import argparse
import json
from datetime import datetime
from pathlib import Path
import sys

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import db

# Module to collection mapping (Updated for Phase 2 naming convention)
MODULE_COLLECTIONS = {
    "auth": ["auth_users", "auth_sessions"],
    "store": ["store_products", "store_orders", "store_categories", "store_students"],
    "pinpanclub": [
        "pinpanclub_players", "pinpanclub_matches", "pinpanclub_sponsors", 
        "pinpanclub_config", "pinpanclub_layouts",
        "pinpanclub_superpin_leagues", "pinpanclub_superpin_checkins",
        "pinpanclub_superpin_matches", "pinpanclub_superpin_rankings",
        "pinpanclub_superpin_tournaments"
    ],
    "community": ["community_posts", "community_events", "community_albums", "community_comments"],
    "core": ["core_app_config", "core_site_config", "core_notifications", "core_translations", "core_pages"]
}


async def list_collections():
    """List all collections with document counts"""
    collections = await db.list_collection_names()
    print("\n📊 MongoDB Collections:\n")
    
    total_docs = 0
    for col in sorted(collections):
        count = await db[col].count_documents({})
        total_docs += count
        
        # Find module
        module = "unknown"
        for mod, cols in MODULE_COLLECTIONS.items():
            if col in cols or col.startswith(f"{mod}_"):
                module = mod
                break
        
        print(f"  [{module:12}] {col:35} {count:>6} docs")
    
    print(f"\n  {'Total':49} {total_docs:>6} docs\n")


async def get_stats():
    """Get database statistics by module"""
    print("\n📈 Database Statistics by Module:\n")
    
    module_stats = {}
    collections = await db.list_collection_names()
    
    for module, expected_cols in MODULE_COLLECTIONS.items():
        module_stats[module] = {
            "collections": 0,
            "documents": 0,
            "details": []
        }
        
        for col in expected_cols:
            if col in collections:
                count = await db[col].count_documents({})
                module_stats[module]["collections"] += 1
                module_stats[module]["documents"] += count
                module_stats[module]["details"].append({"name": col, "count": count})
    
    for module, stats in module_stats.items():
        print(f"  📦 {module.upper()}")
        print(f"     Collections: {stats['collections']}")
        print(f"     Documents:   {stats['documents']}")
        if stats['details']:
            for detail in stats['details']:
                print(f"       - {detail['name']}: {detail['count']}")
        print()


async def export_module(module_name: str, output_dir: str = "exports"):
    """Export all collections for a specific module"""
    if module_name not in MODULE_COLLECTIONS:
        print(f"❌ Unknown module: {module_name}")
        print(f"   Available modules: {', '.join(MODULE_COLLECTIONS.keys())}")
        return
    
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    module_dir = output_path / f"{module_name}_{timestamp}"
    module_dir.mkdir(exist_ok=True)
    
    print(f"\n📤 Exporting module: {module_name}")
    print(f"   Output directory: {module_dir}\n")
    
    collections = MODULE_COLLECTIONS[module_name]
    existing_collections = await db.list_collection_names()
    
    for col in collections:
        if col not in existing_collections:
            print(f"   ⏭️  {col} (not found, skipping)")
            continue
        
        docs = await db[col].find({}, {"_id": 0}).to_list(None)
        
        output_file = module_dir / f"{col}.json"
        with open(output_file, "w") as f:
            json.dump(docs, f, indent=2, default=str)
        
        print(f"   ✅ {col}: {len(docs)} documents exported")
    
    print(f"\n   Export complete: {module_dir}\n")


async def verify_module_isolation():
    """Verify that each module's collections are properly isolated"""
    print("\n🔍 Verifying Module Isolation:\n")
    
    collections = await db.list_collection_names()
    issues = []
    
    # Check for collections not assigned to any module
    all_known = []
    for cols in MODULE_COLLECTIONS.values():
        all_known.extend(cols)
    
    for col in collections:
        if col not in all_known and not col.startswith("system."):
            # Check if it matches any prefix
            known_prefixes = ["pingpong_", "community_", "store_", "auth_"]
            matches_prefix = any(col.startswith(p) for p in known_prefixes)
            
            if not matches_prefix:
                issues.append(f"Unassigned collection: {col}")
    
    if issues:
        print("  ⚠️  Issues found:")
        for issue in issues:
            print(f"     - {issue}")
    else:
        print("  ✅ All collections are properly assigned to modules")
    
    print()


async def main():
    parser = argparse.ArgumentParser(description="Database Management Utilities")
    parser.add_argument("--action", choices=["list", "stats", "export", "verify"], 
                       required=True, help="Action to perform")
    parser.add_argument("--module", help="Module name (for export)")
    parser.add_argument("--output", default="exports", help="Output directory")
    
    args = parser.parse_args()
    
    if args.action == "list":
        await list_collections()
    elif args.action == "stats":
        await get_stats()
    elif args.action == "export":
        if not args.module:
            print("❌ --module is required for export action")
            return
        await export_module(args.module, args.output)
    elif args.action == "verify":
        await verify_module_isolation()


if __name__ == "__main__":
    asyncio.run(main())
