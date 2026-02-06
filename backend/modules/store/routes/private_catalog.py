"""
Store Module - Private Catalog Routes
Endpoints for Unatienda's private catalog (only users with linked PCA students)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone

from core.auth import get_current_user, get_admin_user, get_optional_user
from core.database import db
from ..services.textbook_access_service import textbook_access_service

router = APIRouter(prefix="/private-catalog", tags=["Store - Private Catalog"])


async def verify_private_catalog_access(user_id: str) -> dict:
    """
    Verify if user has access to the private catalog.
    Uses the textbook_access system (store_textbook_access_students collection).
    """
    students = []
    grades = set()
    
    try:
        user_students = await textbook_access_service.get_user_students(user_id)
        for student in user_students:
            if student.get("has_approved_access") or student.get("status") == "approved":
                students.append({
                    "sync_id": student.get("student_id"),
                    "name": student.get("full_name"),
                    "grade": student.get("grade"),
                    "section": student.get("section"),
                    "student_id": student.get("student_id"),
                    "school_name": student.get("school_name")
                })
                if student.get("grade"):
                    grades.add(student.get("grade"))
    except Exception as e:
        print(f"Error checking textbook access: {e}")
    
    if not students:
        return {
            "has_access": False,
            "students": [],
            "grades": [],
            "message": "No linked students. Link a PCA student to access the private catalog."
        }
    
    return {
        "has_access": True,
        "students": students,
        "grades": list(grades),
        "message": None
    }


@router.get("/access")
async def check_access(
    current_user: dict = Depends(get_current_user)
):
    """
    Check if user has access to the private catalog.
    Returns list of linked students and available grades.
    """
    return await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))


@router.get("/products")
async def get_private_catalog_products(
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    search: Optional[str] = None,
    featured: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """
    Get products from the private catalog.
    Only accessible to users with linked PCA students.
    """
    # Verify access
    access = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not access["has_access"]:
        raise HTTPException(
            status_code=403, 
            detail=access["message"] or "No access to private catalog"
        )
    
    # Build query - English field names only
    query = {
        "is_private_catalog": True,
        "active": True
    }
    
    # Filter by grade
    if grade:
        query["$or"] = [
            {"grade": grade},
            {"grades": grade}
        ]
    
    if subject:
        query["subject"] = subject
    
    if featured:
        query["featured"] = True
    
    if search:
        # Use $and to combine with existing conditions
        search_query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"code": {"$regex": search, "$options": "i"}},
                {"publisher": {"$regex": search, "$options": "i"}}
            ]
        }
        if "$or" in query:
            # Combine grade filter with search
            grade_filter = query.pop("$or")
            query["$and"] = [{"$or": grade_filter}, search_query]
        else:
            query.update(search_query)
    
    # Get products
    products = await db.store_products.find(
        query,
        {"_id": 0}
    ).sort([("grade", 1), ("subject", 1), ("name", 1)]).skip(skip).limit(limit).to_list(limit)
    
    # Count total
    total = await db.store_products.count_documents(query)
    
    # Get available grades and subjects for filters
    base_filter = {"is_private_catalog": True, "active": True}
    available_grades = await db.store_products.distinct("grade", base_filter)
    available_subjects = await db.store_products.distinct("subject", base_filter)
    
    return {
        "products": products,
        "total": total,
        "filters": {
            "grades": sorted([g for g in available_grades if g]),
            "subjects": sorted([m for m in available_subjects if m])
        },
        "access": {
            "students": access["students"],
            "student_grades": access["grades"]
        }
    }


@router.get("/products/{book_id}")
async def get_product_detail(
    book_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detail of a product from the private catalog.
    """
    # Verify access
    access = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not access["has_access"]:
        raise HTTPException(
            status_code=403, 
            detail="You do not have access to the private catalog"
        )
    
    product = await db.store_products.find_one(
        {"book_id": book_id, "is_private_catalog": True},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.get("/by-grade/{grade}")
async def get_products_by_grade(
    grade: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all products for a specific grade.
    Useful to display a student's book list.
    """
    # Verify access
    access = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not access["has_access"]:
        raise HTTPException(
            status_code=403, 
            detail="You do not have access to the private catalog"
        )
    
    # Handle grade format variations (e.g., "3" vs "G3")
    grade_variants = [grade]
    if grade.startswith("G"):
        grade_variants.append(grade[1:])  # "G3" -> "3"
    else:
        grade_variants.append(f"G{grade}")  # "3" -> "G3"
    
    query = {
        "is_private_catalog": True,
        "active": True,
        "$or": [
            {"grade": {"$in": grade_variants}},
            {"grades": {"$in": grade_variants}}
        ]
    }
    
    products = await db.store_products.find(
        query,
        {"_id": 0}
    ).sort([("subject", 1), ("name", 1)]).to_list(200)
    
    # Group by subject
    by_subject = {}
    for p in products:
        subj = p.get("subject", "Other")
        if subj not in by_subject:
            by_subject[subj] = []
        by_subject[subj].append(p)
    
    return {
        "grade": grade,
        "total": len(products),
        "products": products,
        "by_subject": by_subject
    }


@router.get("/summary")
async def get_catalog_summary(
    current_user: dict = Depends(get_current_user)
):
    """
    Get summary of the private catalog for the user.
    Shows available products for each linked student.
    """
    # Verify access
    access = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not access["has_access"]:
        raise HTTPException(
            status_code=403, 
            detail="You do not have access to the private catalog"
        )
    
    summary = []
    
    for student in access["students"]:
        grade = student.get("grade")
        
        if grade:
            # Count products for this grade
            count = await db.store_products.count_documents({
                "is_private_catalog": True,
                "active": True,
                "$or": [{"grade": grade}, {"grades": grade}]
            })
            
            # Calculate estimated total
            products = await db.store_products.find(
                {
                    "is_private_catalog": True,
                    "active": True,
                    "$or": [{"grade": grade}, {"grades": grade}]
                },
                {"price": 1, "sale_price": 1}
            ).to_list(200)
            
            estimated_total = sum(
                p.get("sale_price") or p.get("price", 0) 
                for p in products
            )
            
            summary.append({
                "student": student,
                "available_products": count,
                "estimated_total": round(estimated_total, 2)
            })
    
    return {
        "summary": summary,
        "total_students": len(access["students"])
    }


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/products")
async def admin_get_private_catalog_products(
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Get all products from the private catalog.
    """
    query = {"is_private_catalog": True}
    
    if grade:
        query["$or"] = [{"grade": grade}, {"grades": grade}]
    
    if subject:
        query["subject"] = subject
    
    if active is not None:
        query["active"] = active
    
    products = await db.store_products.find(
        query,
        {"_id": 0}
    ).sort([("grade", 1), ("subject", 1)]).skip(skip).limit(limit).to_list(limit)
    
    total = await db.store_products.count_documents(query)
    
    return {
        "products": products,
        "total": total
    }


@router.post("/admin/products")
async def admin_create_private_catalog_product(
    product: dict,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Create product in the private catalog.
    """
    import uuid
    
    # Ensure it's private catalog
    product["is_private_catalog"] = True
    product["book_id"] = product.get("book_id") or f"libro_{uuid.uuid4().hex[:12]}"
    product["active"] = product.get("active", True)
    product["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.store_products.insert_one(product)
    product.pop("_id", None)
    
    return {"success": True, "product": product}


@router.put("/admin/products/{book_id}")
async def admin_update_private_catalog_product(
    book_id: str,
    updates: dict,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Update product in the private catalog.
    """
    # Ensure is_private_catalog cannot be changed
    updates["is_private_catalog"] = True
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.store_products.update_one(
        {"book_id": book_id, "is_private_catalog": True},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.store_products.find_one({"book_id": book_id}, {"_id": 0})
    
    return {"success": True, "product": product}


@router.delete("/admin/products/{book_id}")
async def admin_delete_private_catalog_product(
    book_id: str,
    hard_delete: bool = False,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Delete product from the private catalog.
    By default does soft delete (active=False).
    """
    if hard_delete:
        result = await db.store_products.delete_one(
            {"book_id": book_id, "is_private_catalog": True}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        result = await db.store_products.update_one(
            {"book_id": book_id, "is_private_catalog": True},
            {"$set": {"active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "message": "Product deleted"}
