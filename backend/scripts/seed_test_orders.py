"""
Generate realistic textbook test orders for workflow review.
Creates products, students with approved enrollments, and orders in various statuses.
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "chipi_link")

def gen_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    year = now.year
    
    # ===== 1. ADD MORE PRODUCTS (textbooks) across grades =====
    new_products = [
        # Grade 3
        {"book_id": gen_id("libro"), "name": "Matemáticas 3er Grado - Santillana", "grade": "G3", "price": 28.50, "code": "MAT-3-SANT", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 50, "reserved_quantity": 3},
        {"book_id": gen_id("libro"), "name": "Ciencias Naturales 3er Grado", "grade": "G3", "price": 24.99, "code": "SCI-3-NAT", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 30, "reserved_quantity": 0},
        {"book_id": gen_id("libro"), "name": "Estudios Sociales 3er Grado", "grade": "G3", "price": 22.00, "code": "SOC-3-EST", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 0, "reserved_quantity": 0},
        # Grade 4
        {"book_id": gen_id("libro"), "name": "Matemáticas 4to Grado - Pearson", "grade": "G4", "price": 32.00, "code": "MAT-4-PEAR", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 40, "reserved_quantity": 2},
        {"book_id": gen_id("libro"), "name": "Español 4to Grado", "grade": "G4", "price": 27.50, "code": "ESP-4", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 25, "reserved_quantity": 0},
        {"book_id": gen_id("libro"), "name": "English 4th Grade - Cambridge", "grade": "G4", "price": 35.00, "code": "ENG-4-CAM", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 20, "reserved_quantity": 1},
        # Grade 5
        {"book_id": gen_id("libro"), "name": "Español Lectura 5to Grado", "grade": "G5", "price": 29.99, "code": "ESP-5-LEC", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 35, "reserved_quantity": 0},
        {"book_id": gen_id("libro"), "name": "Ciencias 5to Grado - Discovery", "grade": "G5", "price": 31.50, "code": "SCI-5-DIS", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 15, "reserved_quantity": 5},
        # Grade 6
        {"book_id": gen_id("libro"), "name": "Matemáticas 6to Grado - Oxford", "grade": "G6", "price": 34.99, "code": "MAT-6-OXF", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 40, "reserved_quantity": 0},
        {"book_id": gen_id("libro"), "name": "Historia de Panamá 6to Grado", "grade": "G6", "price": 26.00, "code": "HIS-6-PAN", "category": "Textbooks", "active": True, "is_private_catalog": True, "inventory_quantity": 18, "reserved_quantity": 0},
    ]
    
    for p in new_products:
        p["created_at"] = now.isoformat()
        p["updated_at"] = now.isoformat()
        p["is_demo"] = True
    
    result = await db.store_products.insert_many(new_products)
    print(f"Inserted {len(result.inserted_ids)} new products")
    
    # ===== 2. CREATE TEST USERS =====
    test_users = [
        {"user_id": "user_parent_001", "email": "maria.chen@gmail.com", "nombre": "Maria Chen", "first_name": "Maria", "last_name": "Chen", "role": "user", "status": "active", "tiene_membresia_activa": False},
        {"user_id": "user_parent_002", "email": "carlos.wong@gmail.com", "nombre": "Carlos Wong", "first_name": "Carlos", "last_name": "Wong", "role": "user", "status": "active", "tiene_membresia_activa": True},
        {"user_id": "user_parent_003", "email": "lin.zhao@gmail.com", "nombre": "Lin Zhao", "first_name": "Lin", "last_name": "Zhao", "role": "user", "status": "active", "tiene_membresia_activa": False},
    ]
    
    for u in test_users:
        u["is_demo"] = True
        u["created_at"] = now.isoformat()
        await db.users.update_one({"user_id": u["user_id"]}, {"$set": u}, upsert=True)
    print(f"Upserted {len(test_users)} test users")
    
    # ===== 3. CREATE STUDENTS with approved enrollments =====
    students = [
        # Maria Chen's kids
        {"student_id": gen_id("std"), "user_id": "user_parent_001", "full_name": "Sofía Chen", "date_of_birth": "2017-03-15", "school_id": "school_001",
         "enrollments": [{"year": year, "grade": "3", "status": "approved", "approved_at": (now - timedelta(days=10)).isoformat(), "approved_by": "admin_940d8c6a", "is_editable": False}]},
        {"student_id": gen_id("std"), "user_id": "user_parent_001", "full_name": "Diego Chen", "date_of_birth": "2014-08-22", "school_id": "school_001",
         "enrollments": [{"year": year, "grade": "6", "status": "approved", "approved_at": (now - timedelta(days=8)).isoformat(), "approved_by": "admin_940d8c6a", "is_editable": False}]},
        # Carlos Wong's kid
        {"student_id": gen_id("std"), "user_id": "user_parent_002", "full_name": "Valentina Wong", "date_of_birth": "2016-01-10", "school_id": "school_001",
         "enrollments": [{"year": year, "grade": "4", "status": "approved", "approved_at": (now - timedelta(days=12)).isoformat(), "approved_by": "admin_940d8c6a", "is_editable": False}]},
        # Lin Zhao's kids
        {"student_id": gen_id("std"), "user_id": "user_parent_003", "full_name": "Emma Zhao", "date_of_birth": "2015-05-03", "school_id": "school_002",
         "enrollments": [{"year": year, "grade": "5", "status": "approved", "approved_at": (now - timedelta(days=7)).isoformat(), "approved_by": "admin_940d8c6a", "is_editable": False}]},
        {"student_id": gen_id("std"), "user_id": "user_parent_003", "full_name": "Lucas Zhao", "date_of_birth": "2017-11-20", "school_id": "school_002",
         "enrollments": [{"year": year, "grade": "3", "status": "approved", "approved_at": (now - timedelta(days=7)).isoformat(), "approved_by": "admin_940d8c6a", "is_editable": False}]},
    ]
    
    for s in students:
        s["created_at"] = now.isoformat()
        s["updated_at"] = now.isoformat()
        s["is_demo"] = True
    
    result = await db.store_students.insert_many(students)
    print(f"Inserted {len(result.inserted_ids)} students")
    
    # ===== 4. GET ALL AVAILABLE BOOKS BY GRADE =====
    books_by_grade = {}
    for grade_key in ["G3", "G4", "G5", "G6"]:
        grade_queries = [grade_key, grade_key.replace("G", "")]
        books = await db.store_products.find(
            {"active": True, "is_private_catalog": True, "$or": [{"grade": {"$in": grade_queries}}, {"grades": {"$in": grade_queries}}]},
            {"_id": 0}
        ).to_list(50)
        books_by_grade[grade_key] = books
        print(f"  Grade {grade_key}: {len(books)} books")
    
    # ===== 5. CREATE ORDERS IN VARIOUS STATUSES =====
    def make_order_items(books, selections):
        """selections: dict of book_index -> (quantity, item_status)"""
        items = []
        for i, book in enumerate(books):
            qty, status = selections.get(i, (0, "available"))
            items.append({
                "book_id": book["book_id"],
                "book_code": book.get("code", ""),
                "book_name": book["name"],
                "price": float(book.get("price", 0)),
                "quantity_ordered": qty,
                "max_quantity": 1,
                "status": status,
                "ordered_at": (now - timedelta(days=5)).isoformat() if qty > 0 else None,
                "notes": None,
                "monday_subitem_id": None,
            })
        return items
    
    orders = []
    
    # -- Order 1: Sofía Chen (grade 3) - SUBMITTED, all items ordered
    g3_books = books_by_grade["G3"]
    if g3_books:
        items = make_order_items(g3_books, {i: (1, "ordered") for i in range(len(g3_books))})
        total = sum(it["price"] * it["quantity_ordered"] for it in items if it["quantity_ordered"] > 0)
        orders.append({
            "order_id": gen_id("ord"), "user_id": "user_parent_001", "student_id": students[0]["student_id"],
            "student_name": "Sofía Chen", "school_id": "school_001", "grade": "3", "year": year,
            "items": items, "total_amount": total, "status": "submitted",
            "submitted_at": (now - timedelta(days=5)).isoformat(),
            "monday_item_id": None, "monday_subitems": [],
            "form_data": {"parent_name": "Maria Chen", "phone": "+507 6789-1234", "notes": "Please deliver to school entrance"},
            "is_demo": True,
        })
    
    # -- Order 2: Diego Chen (grade 6) - PROCESSING, mixed item statuses
    g6_books = books_by_grade["G6"]
    if g6_books:
        sel = {}
        for i in range(len(g6_books)):
            if i == 0:
                sel[i] = (1, "processing")
            elif i == 1:
                sel[i] = (1, "ready_for_pickup")
            else:
                sel[i] = (1, "ordered")
        items = make_order_items(g6_books, sel)
        total = sum(it["price"] * it["quantity_ordered"] for it in items if it["quantity_ordered"] > 0)
        orders.append({
            "order_id": gen_id("ord"), "user_id": "user_parent_001", "student_id": students[1]["student_id"],
            "student_name": "Diego Chen", "school_id": "school_001", "grade": "6", "year": year,
            "items": items, "total_amount": total, "status": "processing",
            "submitted_at": (now - timedelta(days=8)).isoformat(),
            "monday_item_id": "monday_sim_1234", "monday_subitems": [],
            "form_data": {"parent_name": "Maria Chen", "phone": "+507 6789-1234"},
            "is_demo": True,
        })
    
    # -- Order 3: Valentina Wong (grade 4) - READY for pickup
    g4_books = books_by_grade["G4"]
    if g4_books:
        items = make_order_items(g4_books, {i: (1, "ready_for_pickup") for i in range(len(g4_books))})
        total = sum(it["price"] * it["quantity_ordered"] for it in items if it["quantity_ordered"] > 0)
        orders.append({
            "order_id": gen_id("ord"), "user_id": "user_parent_002", "student_id": students[2]["student_id"],
            "student_name": "Valentina Wong", "school_id": "school_001", "grade": "4", "year": year,
            "items": items, "total_amount": total, "status": "ready",
            "submitted_at": (now - timedelta(days=12)).isoformat(),
            "monday_item_id": "monday_sim_5678", "monday_subitems": [],
            "form_data": {"parent_name": "Carlos Wong", "phone": "+507 6543-9876", "notes": "Call before delivery"},
            "is_demo": True,
        })
    
    # -- Order 4: Emma Zhao (grade 5) - DELIVERED (completed)
    g5_books = books_by_grade["G5"]
    if g5_books:
        items = make_order_items(g5_books, {i: (1, "delivered") for i in range(len(g5_books))})
        total = sum(it["price"] * it["quantity_ordered"] for it in items if it["quantity_ordered"] > 0)
        orders.append({
            "order_id": gen_id("ord"), "user_id": "user_parent_003", "student_id": students[3]["student_id"],
            "student_name": "Emma Zhao", "school_id": "school_002", "grade": "5", "year": year,
            "items": items, "total_amount": total, "status": "delivered",
            "submitted_at": (now - timedelta(days=20)).isoformat(),
            "monday_item_id": "monday_sim_9012", "monday_subitems": [],
            "form_data": {"parent_name": "Lin Zhao", "phone": "+507 6111-2222"},
            "is_demo": True,
        })
    
    # -- Order 5: Lucas Zhao (grade 3) - SUBMITTED, has a reorder request on one item
    if g3_books:
        sel = {}
        for i in range(len(g3_books)):
            if i == 0:
                sel[i] = (1, "reorder_requested")
            else:
                sel[i] = (1, "ordered")
        items = make_order_items(g3_books, sel)
        # Add reorder info on first item
        items[0]["notes"] = "Book was damaged during delivery, requesting replacement"
        total = sum(it["price"] * it["quantity_ordered"] for it in items if it["quantity_ordered"] > 0)
        orders.append({
            "order_id": gen_id("ord"), "user_id": "user_parent_003", "student_id": students[4]["student_id"],
            "student_name": "Lucas Zhao", "school_id": "school_002", "grade": "3", "year": year,
            "items": items, "total_amount": total, "status": "submitted",
            "submitted_at": (now - timedelta(days=3)).isoformat(),
            "monday_item_id": None, "monday_subitems": [],
            "form_data": {"parent_name": "Lin Zhao", "phone": "+507 6111-2222", "notes": "Second child enrollment"},
            "is_demo": True,
        })
    
    # -- Order 6: Another parent (admin user) grade 4 - CANCELLED
    if g4_books:
        items = make_order_items(g4_books, {0: (1, "ordered"), 1: (1, "ordered")})
        total = sum(it["price"] * it["quantity_ordered"] for it in items if it["quantity_ordered"] > 0)
        orders.append({
            "order_id": gen_id("ord"), "user_id": "admin_940d8c6a", "student_id": "std_cancelled_test",
            "student_name": "Pedro García (Cancelled)", "school_id": "school_001", "grade": "4", "year": year,
            "items": items, "total_amount": total, "status": "cancelled",
            "submitted_at": (now - timedelta(days=15)).isoformat(),
            "monday_item_id": None, "monday_subitems": [],
            "form_data": {"parent_name": "Admin Test", "notes": "Parent cancelled - moved to different school"},
            "is_demo": True,
        })
    
    for o in orders:
        o["created_at"] = (now - timedelta(days=15)).isoformat()
        o["updated_at"] = now.isoformat()
        o["chat_messages"] = []
    
    if orders:
        result = await db.store_textbook_orders.insert_many(orders)
        print(f"\nInserted {len(result.inserted_ids)} test orders:")
        for o in orders:
            print(f"  - {o['order_id']}: {o['student_name']} (grade {o['grade']}) → {o['status']} | ${o['total_amount']:.2f} | {len([i for i in o['items'] if i['quantity_ordered']>0])} items")
    
    # ===== 6. SUMMARY =====
    total_products = await db.store_products.count_documents({"active": True, "is_private_catalog": True})
    total_orders = await db.store_textbook_orders.count_documents({})
    total_students = await db.store_students.count_documents({})
    
    print(f"\n=== SUMMARY ===")
    print(f"Active textbook products: {total_products}")
    print(f"Total students: {total_students}")
    print(f"Total orders: {total_orders}")
    
    # Order breakdown by status
    for status in ["draft", "submitted", "processing", "ready", "delivered", "cancelled"]:
        count = await db.store_textbook_orders.count_documents({"status": status})
        if count > 0:
            print(f"  {status}: {count}")
    
    client.close()
    print("\nDone! Test data generated successfully.")

asyncio.run(main())
