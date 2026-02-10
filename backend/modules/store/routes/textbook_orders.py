"""
Textbook Order Routes
API endpoints for textbook ordering system
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from core.auth import get_current_user, get_admin_user
from ..services.textbook_order_service import textbook_order_service
from ..models.textbook_order import (
    OrderStatus, SubmitOrderRequest, ReorderRequest, AdminSetMaxQuantity
)

router = APIRouter(prefix="/textbook-orders", tags=["Store - Textbook Orders"])


# ============== USER ENDPOINTS ==============

@router.post("/submit")
async def submit_order_direct(
    request: SubmitOrderRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit order directly with student_id and items.
    This endpoint handles the complete submission flow from Unatienda.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        user_id = current_user["user_id"]
        student_id = request.student_id
        
        logger.info(f"[submit_order_direct] user_id={user_id}, student_id={student_id}")
        logger.info(f"[submit_order_direct] Request items count: {len(request.items)}")
        for item in request.items:
            logger.info(f"[submit_order_direct] Request item: book_id={item.book_id}, qty={item.get_quantity()}")
        
        # Get or create the order for this student
        order = await textbook_order_service.get_or_create_order(
            user_id=user_id,
            student_id=student_id
        )
        
        order_id = order.get("order_id")
        logger.info(f"[submit_order_direct] Got order: {order_id}")
        logger.info(f"[submit_order_direct] Order items count: {len(order.get('items', []))}")
        
        # Log existing order items
        for item in order.get("items", []):
            logger.info(f"[submit_order_direct] Order item: book_id={item.get('book_id')}, status={item.get('status')}, qty_ordered={item.get('quantity_ordered')}")
        
        # Update selections based on submitted items
        update_count = 0
        update_errors = []
        for item in request.items:
            book_id = item.book_id
            quantity = item.get_quantity()
            if book_id and quantity > 0:
                try:
                    await textbook_order_service.update_item_selection(
                        user_id=user_id,
                        order_id=order_id,
                        book_id=book_id,
                        quantity=quantity
                    )
                    update_count += 1
                    logger.info(f"[submit_order_direct] Updated item {book_id} to qty={quantity}")
                except ValueError as e:
                    error_msg = f"Could not update item {book_id}: {str(e)}"
                    update_errors.append(error_msg)
                    logger.warning(f"[submit_order_direct] {error_msg}")
        
        logger.info(f"[submit_order_direct] Updated {update_count} items, {len(update_errors)} errors")
        
        if update_count == 0:
            # No items were updated - return detailed error
            error_detail = "No items could be updated. "
            if update_errors:
                error_detail += "Errors: " + "; ".join(update_errors[:3])
            raise ValueError(error_detail)
        
        # Refresh order to get updated items
        order = await textbook_order_service.order_repo.get_by_id(order_id)
        
        # Log refreshed order items
        logger.info(f"[submit_order_direct] Refreshed order items:")
        for item in order.get("items", []):
            logger.info(f"  - book_id={item.get('book_id')}, status={item.get('status')}, qty_ordered={item.get('quantity_ordered')}")
        
        # Submit the order
        result = await textbook_order_service.submit_order(
            user_id=user_id,
            order_id=order_id,
            notes=request.form_data.get("notes") if request.form_data else None
        )
        
        logger.info(f"[submit_order_direct] Order submitted successfully: {result.get('order_id')}")
        
        return result
    except ValueError as e:
        logger.error(f"[submit_order_direct] ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[submit_order_direct] Error: {e}")
        import traceback
        logger.error(f"[submit_order_direct] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}")
async def get_student_order(
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get or create order for a student.
    Returns the textbook list for the student's grade with current selections.
    """
    try:
        order = await textbook_order_service.get_or_create_order(
            user_id=current_user["user_id"],
            student_id=student_id
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{order_id}/items/{book_id}")
async def update_item_selection(
    order_id: str,
    book_id: str,
    quantity: int = Query(ge=0, le=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Update item selection in a draft order.
    Set quantity to 0 to deselect, 1 to select.
    """
    try:
        order = await textbook_order_service.update_item_selection(
            user_id=current_user["user_id"],
            order_id=order_id,
            book_id=book_id,
            quantity=quantity
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/submit")
async def submit_order(
    order_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit order - locks selected items and sends to Monday.com.
    After submission, selected items cannot be modified.
    """
    try:
        order = await textbook_order_service.submit_order(
            user_id=current_user["user_id"],
            order_id=order_id,
            notes=notes
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/reorder/{book_id}")
async def request_reorder(
    order_id: str,
    book_id: str,
    request: ReorderRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Request to reorder a book that was already ordered.
    Admin must approve before user can order again.
    """
    try:
        order = await textbook_order_service.request_reorder(
            user_id=current_user["user_id"],
            order_id=order_id,
            book_id=book_id,
            reason=request.reason
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-orders")
async def get_my_orders(
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all orders for the current user"""
    import logging
    logger = logging.getLogger(__name__)
    
    user_id = current_user.get("user_id")
    logger.info(f"Getting orders for user_id: {user_id}")
    
    orders = await textbook_order_service.get_user_orders(
        user_id=user_id,
        year=year
    )
    
    logger.info(f"Found {len(orders)} orders for user {user_id}")
    
    return {
        "orders": orders, 
        "user_id": user_id,
        "total": len(orders)
    }


@router.get("/debug/my-info")
async def debug_my_info(
    current_user: dict = Depends(get_current_user)
):
    """Debug endpoint to see current user info and their orders"""
    from core.database import db
    
    user_id = current_user.get("user_id")
    
    # Get all orders for this user
    orders = await db.store_textbook_orders.find(
        {"user_id": user_id},
        {"_id": 0, "order_id": 1, "student_name": 1, "status": 1, "total_amount": 1}
    ).to_list(100)
    
    # Also check if there are orders with different user_id patterns
    all_orders_sample = await db.store_textbook_orders.find(
        {},
        {"_id": 0, "order_id": 1, "user_id": 1, "student_name": 1}
    ).to_list(10)
    
    return {
        "current_user": {
            "user_id": user_id,
            "email": current_user.get("email"),
            "name": current_user.get("name")
        },
        "my_orders": orders,
        "sample_all_orders": all_orders_sample
    }


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def get_all_orders(
    status: Optional[str] = None,
    grade: Optional[str] = None,
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all orders (admin view)"""
    orders = await textbook_order_service.get_all_orders(
        status=status,
        grade=grade,
        year=year
    )
    return {"orders": orders}


@router.get("/admin/stats")
async def get_order_stats(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get order statistics"""
    stats = await textbook_order_service.get_order_stats(year)
    return stats


@router.get("/admin/pending-reorders")
async def get_pending_reorders(
    admin: dict = Depends(get_admin_user)
):
    """Get all pending reorder requests"""
    reorders = await textbook_order_service.get_pending_reorders()
    return {"reorders": reorders}


@router.put("/admin/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    admin: dict = Depends(get_admin_user)
):
    """Update order status"""
    try:
        order = await textbook_order_service.admin_update_order_status(
            admin_id=admin["user_id"],
            order_id=order_id,
            status=status
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/{order_id}/items/{book_id}/approve-reorder")
async def approve_reorder(
    order_id: str,
    book_id: str,
    data: AdminSetMaxQuantity,
    admin: dict = Depends(get_admin_user)
):
    """Approve reorder request and set new max quantity"""
    try:
        order = await textbook_order_service.admin_approve_reorder(
            admin_id=admin["user_id"],
            order_id=order_id,
            book_id=book_id,
            max_quantity=data.max_quantity,
            admin_notes=data.admin_notes
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/{order_id}")
async def get_order_details(
    order_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get order details (admin view)"""
    order = await textbook_order_service.order_repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order



# ============== MONDAY.COM UPDATES (CHAT) ==============

@router.get("/{order_id}/updates")
async def get_order_updates(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Fetch Monday.com Updates (chat messages) for an order"""
    try:
        updates = await textbook_order_service.get_monday_updates(order_id, current_user["user_id"])
        return updates
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{order_id}/updates")
async def post_order_update(
    order_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Post a new Monday.com Update (chat message) for an order"""
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        result = await textbook_order_service.post_monday_update(
            order_id, current_user["user_id"], message
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{order_id}/updates/mark-read")
async def mark_messages_read(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark all chat messages in an order as read by the current user"""
    try:
        result = await textbook_order_service.mark_order_messages_read(
            order_id, current_user["user_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/notifications/unread")
async def get_unread_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Get unread message counts for the current user across all orders"""
    return await textbook_order_service.get_unread_counts(current_user["user_id"])



@router.get("/admin/diagnostic/textbooks")
async def diagnostic_textbooks(
    admin: dict = Depends(get_admin_user)
):
    """
    Diagnostic endpoint to debug textbook visibility issues.
    Returns detailed information about products, students, and field names.
    """
    from core.database import db
    import logging
    logger = logging.getLogger(__name__)
    
    result = {
        "products": {},
        "students": {},
        "field_analysis": {},
        "recommendations": []
    }
    
    # 1. Check product field names and counts
    logger.info("[DIAGNOSTIC] Checking store_products collection...")
    
    total_products = await db.store_products.count_documents({})
    
    # Check for English fields
    with_active_true = await db.store_products.count_documents({"active": True})
    with_active_false = await db.store_products.count_documents({"active": False})
    with_private_true = await db.store_products.count_documents({"is_private_catalog": True})
    with_private_false = await db.store_products.count_documents({"is_private_catalog": False})
    with_grade = await db.store_products.count_documents({"grade": {"$exists": True, "$ne": None}})
    with_grades = await db.store_products.count_documents({"grades": {"$exists": True, "$ne": []}})
    
    # Check for Spanish fields (should be 0 after migration)
    with_activo = await db.store_products.count_documents({"activo": {"$exists": True}})
    with_catalogo = await db.store_products.count_documents({"catalogo_privado": {"$exists": True}})
    with_grado = await db.store_products.count_documents({"grado": {"$exists": True}})
    
    # Products that should show (active, any catalog, with valid grade)
    visible_products = await db.store_products.count_documents({
        "active": True,
        "archived": {"$ne": True},
        "grade": {"$exists": True, "$ne": None, "$ne": "N/A"}
    })
    
    result["products"] = {
        "total": total_products,
        "english_fields": {
            "active_true": with_active_true,
            "active_false": with_active_false,
            "is_private_catalog_true": with_private_true,
            "is_private_catalog_false": with_private_false,
            "has_grade": with_grade,
            "has_grades_array": with_grades
        },
        "spanish_fields_remaining": {
            "has_activo": with_activo,
            "has_catalogo_privado": with_catalogo,
            "has_grado": with_grado
        },
        "visible_for_textbook_orders": visible_products
    }
    
    # 2. Get sample products to inspect
    sample_products = await db.store_products.find(
        {},
        {"_id": 0, "name": 1, "grade": 1, "grades": 1, "active": 1, "is_private_catalog": 1, "grado": 1, "activo": 1, "catalogo_privado": 1}
    ).limit(10).to_list(10)
    result["products"]["samples"] = sample_products
    
    # 3. Get visible products (what textbook service queries)
    visible_product_list = await db.store_products.find(
        {"active": True, "is_private_catalog": True},
        {"_id": 0, "name": 1, "grade": 1, "grades": 1, "book_id": 1}
    ).to_list(50)
    result["products"]["visible_product_list"] = visible_product_list
    
    # 4. Get unique grades from visible products
    grades_in_products = set()
    for p in visible_product_list:
        if p.get("grade"):
            grades_in_products.add(str(p.get("grade")))
        if p.get("grades"):
            for g in p.get("grades", []):
                grades_in_products.add(str(g))
    result["products"]["grades_available"] = list(grades_in_products)
    
    # 5. Check student records - check multiple possible collections
    logger.info("[DIAGNOSTIC] Checking student collections...")
    
    # The actual collection used by the repository is 'store_students'
    total_students = await db.store_students.count_documents({})
    approved_students = await db.store_students.count_documents({
        "enrollments": {"$elemMatch": {"status": "approved"}}
    })
    
    # Sample student with enrollments
    sample_students = await db.store_students.find(
        {},
        {"_id": 0, "full_name": 1, "nombre_completo": 1, "student_id": 1, "enrollments": 1, "user_id": 1}
    ).limit(5).to_list(5)
    
    # Also check other possible collections for students
    other_collections = {
        "store_student_records": await db.store_student_records.count_documents({}),
        "synced_students": await db.synced_students.count_documents({}),
        "estudiantes_sincronizados": await db.estudiantes_sincronizados.count_documents({})
    }
    
    result["students"] = {
        "collection_used": "store_students",
        "total": total_students,
        "with_approved_enrollment": approved_students,
        "samples": sample_students,
        "other_collections": other_collections
    }
    
    # 6. Get grades from approved enrollments
    grades_in_students = set()
    for s in sample_students:
        for e in s.get("enrollments", []):
            if e.get("status") == "approved" and e.get("grade"):
                grades_in_students.add(str(e.get("grade")))
    result["students"]["grades_enrolled"] = list(grades_in_students)
    
    # 7. Check field name consistency
    result["field_analysis"] = {
        "products_use_english": with_activo == 0 and with_catalogo == 0 and with_grado == 0,
        "has_visible_products": visible_products > 0,
        "grade_match": bool(grades_in_products & grades_in_students) if grades_in_products and grades_in_students else "unknown"
    }
    
    # 8. Generate recommendations
    if with_activo > 0 or with_catalogo > 0 or with_grado > 0:
        result["recommendations"].append("CRITICAL: Spanish field names still exist. Run the migration again.")
    
    if visible_products == 0:
        if with_private_true == 0:
            result["recommendations"].append("No products have is_private_catalog=true. Set this field for textbooks.")
        if with_active_true == 0:
            result["recommendations"].append("No products have active=true. Activate some products.")
        if with_private_true > 0 and with_active_true > 0:
            result["recommendations"].append("Products exist but none match both active=true AND is_private_catalog=true.")
    
    if grades_in_products and grades_in_students:
        if not (grades_in_products & grades_in_students):
            result["recommendations"].append(
                f"Grade mismatch! Products have grades {list(grades_in_products)}, "
                f"but students are enrolled in {list(grades_in_students)}."
            )
    
    if not result["recommendations"]:
        result["recommendations"].append("Configuration looks correct. Check browser console for API errors.")
    
    logger.info(f"[DIAGNOSTIC] Complete. Recommendations: {result['recommendations']}")
    
    return result


@router.get("/admin/diagnostic/order-flow/{student_id}")
async def diagnostic_order_flow(
    student_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Diagnostic endpoint to debug order submission issues for a specific student.
    """
    from core.database import db
    import logging
    logger = logging.getLogger(__name__)
    
    result = {
        "student_id": student_id,
        "student": None,
        "enrollment": None,
        "order": None,
        "available_books": [],
        "issues": []
    }
    
    # 1. Find student
    student = await db.store_students.find_one(
        {"student_id": student_id},
        {"_id": 0}
    )
    
    if not student:
        result["issues"].append(f"Student not found with student_id: {student_id}")
        return result
    
    result["student"] = {
        "student_id": student.get("student_id"),
        "full_name": student.get("full_name") or student.get("nombre_completo"),
        "user_id": student.get("user_id"),
        "enrollments_count": len(student.get("enrollments", []))
    }
    
    # 2. Check enrollment
    current_year = 2025  # You may need to adjust this
    enrollments = student.get("enrollments", [])
    
    approved_enrollment = next(
        (e for e in enrollments if e.get("status") == "approved"),
        None
    )
    
    if not approved_enrollment:
        result["issues"].append("No approved enrollment found for this student")
        result["enrollment"] = {"all_enrollments": enrollments}
        return result
    
    result["enrollment"] = {
        "status": approved_enrollment.get("status"),
        "grade": approved_enrollment.get("grade"),
        "year": approved_enrollment.get("year"),
        "school": approved_enrollment.get("school")
    }
    
    grade = approved_enrollment.get("grade")
    
    # 3. Check existing order
    order = await db.store_textbook_orders.find_one(
        {"student_id": student_id},
        {"_id": 0}
    )
    
    if order:
        result["order"] = {
            "order_id": order.get("order_id"),
            "status": order.get("status"),
            "total_items": len(order.get("items", [])),
            "items": [
                {
                    "book_id": item.get("book_id"),
                    "book_name": item.get("book_name"),
                    "status": item.get("status"),
                    "quantity_ordered": item.get("quantity_ordered", 0)
                }
                for item in order.get("items", [])
            ]
        }
        
        # Check for issues with order items
        for item in order.get("items", []):
            if item.get("status") == "ordered":
                result["issues"].append(f"Item '{item.get('book_name')}' is already ordered")
    else:
        result["order"] = None
        result["issues"].append("No existing order found - will be created on first access")
    
    # 4. Check available books for this grade
    # Use the same grade mapping as the service
    grade_mappings = {
        "1": ["1", "G1", "1st Grade", "Grade 1"],
        "2": ["2", "G2", "2nd Grade", "Grade 2"],
        "3": ["3", "G3", "3rd Grade", "Grade 3"],
        "4": ["4", "G4", "4th Grade", "Grade 4"],
        "5": ["5", "G5", "5th Grade", "Grade 5"],
        "6": ["6", "G6", "6th Grade", "Grade 6"],
        "G1": ["G1", "1", "1st Grade", "Grade 1"],
        "G2": ["G2", "2", "2nd Grade", "Grade 2"],
        "G3": ["G3", "3", "3rd Grade", "Grade 3"],
        "G4": ["G4", "4", "4th Grade", "Grade 4"],
        "G5": ["G5", "5", "5th Grade", "Grade 5"],
        "G6": ["G6", "6", "6th Grade", "Grade 6"],
    }
    
    grade_queries = grade_mappings.get(str(grade), [str(grade)])
    
    books = await db.store_products.find(
        {
            "active": True,
            "is_private_catalog": True,
            "$or": [
                {"grade": {"$in": grade_queries}},
                {"grades": {"$in": grade_queries}}
            ]
        },
        {"_id": 0, "book_id": 1, "name": 1, "grade": 1, "grades": 1, "price": 1}
    ).to_list(50)
    
    result["available_books"] = {
        "grade_searched": grade,
        "grade_queries_used": grade_queries,
        "books_found": len(books),
        "books": books
    }
    
    if len(books) == 0:
        result["issues"].append(f"No books found for grade '{grade}' (searched: {grade_queries})")
    
    # 5. Summary
    if not result["issues"]:
        result["issues"].append("No issues detected - order flow should work")
    
    return result
