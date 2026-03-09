"""
Direct integration test for presale mode fix.
This test verifies that when _refresh_order_items is called, 
items with 0 inventory show as 'available' for presale students.
"""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, '/app/backend')

async def test_presale_refresh():
    """Test that _refresh_order_items correctly applies presale_mode"""
    from core.database import db
    from modules.store.services.textbook_order_service import textbook_order_service
    
    # Test student with presale_mode=True
    student_id = "std_e32ae7fae07a"
    
    # 1. Check student's presale_mode
    student = await db.store_students.find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        print(f"❌ Student {student_id} not found")
        return False
    
    presale_mode = student.get("presale_mode", False)
    print(f"Student: {student.get('full_name')}, presale_mode={presale_mode}")
    
    if not presale_mode:
        print("❌ Student is not in presale mode - test cannot proceed")
        return False
    
    # 2. Get existing order
    current_year = 2026
    order = await db.store_textbook_orders.find_one(
        {"student_id": student_id, "year": current_year},
        {"_id": 0}
    )
    
    if not order:
        print("❌ No order found for student")
        return False
    
    print(f"Order: {order.get('order_id')}, status: {order.get('status')}")
    print(f"Items BEFORE refresh:")
    for item in order.get('items', []):
        print(f"  - {item.get('book_name')}: status={item.get('status')}")
    
    # 3. Call _refresh_order_items (this is what the user endpoint does)
    print("\n--- Calling _refresh_order_items ---\n")
    refreshed_order = await textbook_order_service._refresh_order_items(order)
    
    print(f"Items AFTER refresh:")
    out_of_stock_count = 0
    available_count = 0
    for item in refreshed_order.get('items', []):
        status = item.get('status')
        print(f"  - {item.get('book_name')}: status={status}")
        if status == 'out_of_stock':
            out_of_stock_count += 1
        elif status == 'available':
            available_count += 1
    
    # 4. Verify all items are 'available' since student has presale_mode=True
    if out_of_stock_count > 0:
        print(f"\n❌ FAIL: {out_of_stock_count} items still show as 'out_of_stock'")
        print("   Presale mode should show ALL items as 'available' regardless of inventory")
        return False
    else:
        print(f"\n✅ PASS: All {available_count} items show as 'available' (presale mode working)")
        return True

if __name__ == "__main__":
    result = asyncio.run(test_presale_refresh())
    sys.exit(0 if result else 1)
