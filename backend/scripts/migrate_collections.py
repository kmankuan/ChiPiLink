"""
Database Migration Script - Phase 2
====================================
Migra las collections a nombres con prefijo de module.

Uso:
    python scripts/migrate_collections.py --action preview
    python scripts/migrate_collections.py --action migrate
    python scripts/migrate_collections.py --action rollback
    python scripts/migrate_collections.py --action verify
"""

import asyncio
import argparse
import json
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import db

# Migration mapping: old_name -> new_name
COLLECTION_MIGRATIONS = {
    # Auth Module
    "clientes": "auth_users",
    "user_sessions": "auth_sessions",
    
    # Store Module  
    "libros": "store_products",
    "pedidos": "store_orders",
    "categorias": "store_categories",
    "estudiantes_sincronizados": "store_students",
    
    # PinpanClub Module
    "pingpong_players": "pinpanclub_players",
    "pingpong_matches": "pinpanclub_matches",
    "pingpong_sponsors": "pinpanclub_sponsors",
    "pingpong_config": "pinpanclub_config",
    "pingpong_layouts": "pinpanclub_layouts",
    
    # SuperPin (part of PinpanClub)
    "superpin_leagues": "pinpanclub_superpin_leagues",
    "superpin_checkins": "pinpanclub_superpin_checkins",
    "superpin_matches": "pinpanclub_superpin_matches",
    "superpin_rankings": "pinpanclub_superpin_rankings",
    "superpin_tournaments": "pinpanclub_superpin_tournaments",
    
    # Community Module
    "gallery_albums": "community_albums",
    
    # Shared/Core - rename for clarity
    "app_config": "core_app_config",
    "site_config": "core_site_config",
    "notifications": "core_notifications",
    "translations": "core_translations",
    "paginas": "core_pages",
}

# Reverse mapping for rollback
ROLLBACK_MIGRATIONS = {v: k for k, v in COLLECTION_MIGRATIONS.items()}


async def preview_migration():
    """Preview what will be migrated"""
    print("\n📋 Migration Preview:\n")
    print(f"{'Current Name':<35} {'New Name':<35} {'Docs':<10}")
    print("-" * 85)
    
    collections = await db.list_collection_names()
    total_docs = 0
    migrations_needed = 0
    
    for old_name, new_name in COLLECTION_MIGRATIONS.items():
        if old_name in collections:
            count = await db[old_name].count_documents({})
            total_docs += count
            migrations_needed += 1
            status = "✅" if new_name not in collections else "⚠️ (target exists)"
            print(f"{old_name:<35} → {new_name:<35} {count:<10} {status}")
        else:
            print(f"{old_name:<35} → {new_name:<35} {'(not found)':<10} ⏭️")
    
    # Check for collections that won't be migrated
    print("\n📌 Collections that will NOT be migrated (already have correct prefix or system):")
    for col in sorted(collections):
        if col not in COLLECTION_MIGRATIONS and not col.startswith("system."):
            count = await db[col].count_documents({})
            print(f"  - {col}: {count} docs")
    
    print(f"\n📊 Summary:")
    print(f"   Migrations needed: {migrations_needed}")
    print(f"   Total documents to migrate: {total_docs}")
    print(f"\n💡 Run with --action migrate to execute\n")


async def execute_migration():
    """Execute the migration"""
    print("\n🚀 Starting Migration...\n")
    
    collections = await db.list_collection_names()
    migrated = []
    errors = []
    
    for old_name, new_name in COLLECTION_MIGRATIONS.items():
        if old_name not in collections:
            print(f"  ⏭️  {old_name} → (skipped, not found)")
            continue
            
        if new_name in collections:
            print(f"  ⚠️  {old_name} → {new_name} (target exists, skipping)")
            continue
        
        try:
            # MongoDB rename collection
            await db[old_name].rename(new_name)
            count = await db[new_name].count_documents({})
            print(f"  ✅ {old_name} → {new_name} ({count} docs)")
            migrated.append({"old": old_name, "new": new_name, "count": count})
        except Exception as e:
            print(f"  ❌ {old_name} → {new_name} (ERROR: {e})")
            errors.append({"old": old_name, "new": new_name, "error": str(e)})
    
    # Save migration log
    log_file = Path(__file__).parent / "migration_log.json"
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "action": "migrate",
        "migrated": migrated,
        "errors": errors
    }
    with open(log_file, "w") as f:
        json.dump(log_data, f, indent=2)
    
    print(f"\n📊 Migration Complete:")
    print(f"   Successful: {len(migrated)}")
    print(f"   Errors: {len(errors)}")
    print(f"   Log saved to: {log_file}")
    
    if errors:
        print(f"\n⚠️  Some migrations failed. Check log for details.")
    else:
        print(f"\n✅ All migrations completed successfully!")
        print(f"💡 Now update the repository COLLECTION_NAME constants.")


async def rollback_migration():
    """Rollback to original collection names"""
    print("\n🔄 Starting Rollback...\n")
    
    collections = await db.list_collection_names()
    rolled_back = []
    errors = []
    
    for new_name, old_name in ROLLBACK_MIGRATIONS.items():
        if new_name not in collections:
            continue
            
        if old_name in collections:
            print(f"  ⚠️  {new_name} → {old_name} (original exists, skipping)")
            continue
        
        try:
            await db[new_name].rename(old_name)
            count = await db[old_name].count_documents({})
            print(f"  ✅ {new_name} → {old_name} ({count} docs)")
            rolled_back.append({"new": new_name, "old": old_name, "count": count})
        except Exception as e:
            print(f"  ❌ {new_name} → {old_name} (ERROR: {e})")
            errors.append({"new": new_name, "old": old_name, "error": str(e)})
    
    print(f"\n📊 Rollback Complete:")
    print(f"   Successful: {len(rolled_back)}")
    print(f"   Errors: {len(errors)}")


async def verify_migration():
    """Verify the migration was successful"""
    print("\n🔍 Verifying Migration...\n")
    
    collections = await db.list_collection_names()
    
    # Check new names exist
    print("Expected new collections:")
    missing = []
    found = []
    
    for old_name, new_name in COLLECTION_MIGRATIONS.items():
        if new_name in collections:
            count = await db[new_name].count_documents({})
            print(f"  ✅ {new_name}: {count} docs")
            found.append(new_name)
        elif old_name in collections:
            count = await db[old_name].count_documents({})
            print(f"  ⚠️  {new_name} NOT FOUND (old '{old_name}' still exists with {count} docs)")
            missing.append(new_name)
    
    # Check old names don't exist
    print("\nOld collections that should NOT exist:")
    remaining_old = []
    for old_name in COLLECTION_MIGRATIONS.keys():
        if old_name in collections:
            print(f"  ⚠️  {old_name} still exists")
            remaining_old.append(old_name)
    
    if not remaining_old:
        print("  ✅ All old collections have been migrated")
    
    print(f"\n📊 Verification Summary:")
    print(f"   New collections found: {len(found)}")
    print(f"   Missing new collections: {len(missing)}")
    print(f"   Old collections remaining: {len(remaining_old)}")
    
    if not missing and not remaining_old:
        print(f"\n✅ Migration verified successfully!")
    else:
        print(f"\n⚠️  Migration incomplete or has issues.")


async def main():
    parser = argparse.ArgumentParser(description="Database Migration Script")
    parser.add_argument("--action", choices=["preview", "migrate", "rollback", "verify"], 
                       required=True, help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "preview":
        await preview_migration()
    elif args.action == "migrate":
        await execute_migration()
    elif args.action == "rollback":
        await rollback_migration()
    elif args.action == "verify":
        await verify_migration()


if __name__ == "__main__":
    asyncio.run(main())
