"""
Database Migration Script
Renames collections to follow the new naming standard.
Run this script ONCE to migrate the database.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

# Migration mappings: old_name -> new_name
COLLECTION_RENAMES = {
    'schools': 'store_schools',
    'textbook_access_students': 'store_students',
    'form_field_configs': 'store_form_configs',
    'users_profiles': 'user_profiles',
}

# Collections to delete (empty or deprecated)
COLLECTIONS_TO_DELETE = [
    'usuarios',  # Deprecated Spanish collection (1 doc)
    'vinculaciones',  # Deprecated Spanish collection (1 doc)
    'store_orders',  # Empty
]


async def backup_collection(db, coll_name):
    """Create a backup of a collection before modifying it"""
    backup_name = f"_backup_{coll_name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    
    # Copy all documents
    docs = await db[coll_name].find({}).to_list(None)
    if docs:
        await db[backup_name].insert_many(docs)
        print(f"  ✓ Backed up {len(docs)} docs to {backup_name}")
    return backup_name


async def rename_collection(db, old_name, new_name):
    """Rename a collection"""
    try:
        # Check if old collection exists
        if old_name not in await db.list_collection_names():
            print(f"  ⚠ Collection {old_name} does not exist, skipping")
            return False
        
        # Check if new collection already exists
        if new_name in await db.list_collection_names():
            print(f"  ⚠ Collection {new_name} already exists, skipping")
            return False
        
        # Backup first
        await backup_collection(db, old_name)
        
        # Rename
        await db[old_name].rename(new_name)
        print(f"  ✓ Renamed {old_name} -> {new_name}")
        return True
    except Exception as e:
        print(f"  ✗ Error renaming {old_name}: {e}")
        return False


async def delete_collection(db, coll_name):
    """Delete a collection after backup"""
    try:
        if coll_name not in await db.list_collection_names():
            print(f"  ⚠ Collection {coll_name} does not exist, skipping")
            return False
        
        count = await db[coll_name].count_documents({})
        if count > 0:
            # Backup first
            await backup_collection(db, coll_name)
        
        await db[coll_name].drop()
        print(f"  ✓ Deleted {coll_name} ({count} docs)")
        return True
    except Exception as e:
        print(f"  ✗ Error deleting {coll_name}: {e}")
        return False


async def main():
    print("=" * 50)
    print("DATABASE MIGRATION SCRIPT")
    print("=" * 50)
    
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client['chipilink_prod']
    
    # Current state
    print("\n📊 Current collections:")
    for coll in sorted(await db.list_collection_names()):
        count = await db[coll].count_documents({})
        print(f"  {coll}: {count}")
    
    # Rename collections
    if COLLECTION_RENAMES:
        print("\n🔄 Renaming collections...")
        for old_name, new_name in COLLECTION_RENAMES.items():
            await rename_collection(db, old_name, new_name)
    else:
        print("\n🔄 No collections to rename (all skipped)")
    
    # Delete collections
    if COLLECTIONS_TO_DELETE:
        print("\n🗑️ Deleting deprecated collections...")
        for coll_name in COLLECTIONS_TO_DELETE:
            await delete_collection(db, coll_name)
    else:
        print("\n🗑️ No collections to delete (all skipped)")
    
    # Final state
    print("\n📊 Final collections:")
    for coll in sorted(await db.list_collection_names()):
        if not coll.startswith('_backup'):
            count = await db[coll].count_documents({})
            print(f"  {coll}: {count}")
    
    print("\n✅ Migration complete!")
    print("Note: Backup collections are prefixed with '_backup_'")


if __name__ == "__main__":
    asyncio.run(main())
