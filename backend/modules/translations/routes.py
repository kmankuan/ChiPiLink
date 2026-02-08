"""
Translation Dictionary API
Core feature: centralized multilingual dictionary for auto-translate across the app.
Public endpoint for frontend cache + Admin CRUD for managing terms.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4

from core.database import get_database
from modules.auth.dependencies import get_admin_user

router = APIRouter(prefix="/translations", tags=["Translation Dictionary"])


class DictionaryEntry(BaseModel):
    en: str
    es: str = ""
    zh: str = ""
    category: str = "general"


class DictionaryEntryUpdate(BaseModel):
    en: Optional[str] = None
    es: Optional[str] = None
    zh: Optional[str] = None
    category: Optional[str] = None


# ============== PUBLIC ==============

@router.get("/dictionary")
async def get_dictionary():
    """Public: get full translation dictionary (frontend caches this)"""
    db = get_database()
    entries = await db.translation_dictionary.find({}, {"_id": 0}).to_list(5000)
    
    # If empty, seed defaults
    if not entries:
        entries = await seed_default_dictionary(db)
    
    return {"entries": entries, "count": len(entries)}


# ============== ADMIN ==============

@router.get("/admin/dictionary")
async def admin_get_dictionary(
    category: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: get dictionary with optional filters"""
    db = get_database()
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"en": {"$regex": search, "$options": "i"}},
            {"es": {"$regex": search, "$options": "i"}},
            {"zh": {"$regex": search, "$options": "i"}},
        ]
    entries = await db.translation_dictionary.find(query, {"_id": 0}).sort("en", 1).to_list(5000)
    
    if not entries and not category and not search:
        entries = await seed_default_dictionary(db)
    
    # Get distinct categories
    categories = await db.translation_dictionary.distinct("category")
    
    return {"entries": entries, "count": len(entries), "categories": categories}


@router.post("/admin/dictionary")
async def admin_add_entry(
    entry: DictionaryEntry,
    admin: dict = Depends(get_admin_user)
):
    """Admin: add a new dictionary entry"""
    db = get_database()
    
    # Check for duplicate EN key
    existing = await db.translation_dictionary.find_one({"en": {"$regex": f"^{entry.en}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=409, detail=f"Entry '{entry.en}' already exists")
    
    doc = {
        "term_id": f"term_{uuid4().hex[:8]}",
        "en": entry.en.strip(),
        "es": entry.es.strip(),
        "zh": entry.zh.strip(),
        "category": entry.category or "general",
        "is_custom": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.translation_dictionary.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/admin/dictionary/{term_id}")
async def admin_update_entry(
    term_id: str,
    data: DictionaryEntryUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Admin: update a dictionary entry"""
    db = get_database()
    update = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.translation_dictionary.update_one({"term_id": term_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    entry = await db.translation_dictionary.find_one({"term_id": term_id}, {"_id": 0})
    return entry


@router.delete("/admin/dictionary/{term_id}")
async def admin_delete_entry(
    term_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: delete a dictionary entry"""
    db = get_database()
    result = await db.translation_dictionary.delete_one({"term_id": term_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"success": True}


@router.get("/admin/dictionary/categories")
async def admin_get_categories(admin: dict = Depends(get_admin_user)):
    """Admin: get all distinct categories"""
    db = get_database()
    categories = await db.translation_dictionary.distinct("category")
    return {"categories": categories}


# ============== SEEDING ==============

async def seed_default_dictionary(db) -> list:
    """Seed the built-in dictionary with common form terms"""
    defaults = [
        # People
        {"en": "First Name", "es": "Nombre", "zh": "名", "category": "people"},
        {"en": "Last Name", "es": "Apellido", "zh": "姓", "category": "people"},
        {"en": "Full Name", "es": "Nombre Completo", "zh": "全名", "category": "people"},
        {"en": "Name", "es": "Nombre", "zh": "名称", "category": "people"},
        {"en": "Age", "es": "Edad", "zh": "年龄", "category": "people"},
        {"en": "Gender", "es": "Género", "zh": "性别", "category": "people"},
        {"en": "Nationality", "es": "Nacionalidad", "zh": "国籍", "category": "people"},
        {"en": "Date of Birth", "es": "Fecha de Nacimiento", "zh": "出生日期", "category": "people"},
        {"en": "Birthday", "es": "Cumpleaños", "zh": "生日", "category": "people"},
        {"en": "Occupation", "es": "Ocupación", "zh": "职业", "category": "people"},
        # Contact
        {"en": "Email", "es": "Correo Electrónico", "zh": "电子邮箱", "category": "contact"},
        {"en": "Email Address", "es": "Dirección de Correo", "zh": "电子邮箱地址", "category": "contact"},
        {"en": "Phone", "es": "Teléfono", "zh": "电话", "category": "contact"},
        {"en": "Phone Number", "es": "Número de Teléfono", "zh": "电话号码", "category": "contact"},
        {"en": "Mobile", "es": "Celular", "zh": "手机", "category": "contact"},
        {"en": "Mobile Number", "es": "Número de Celular", "zh": "手机号码", "category": "contact"},
        {"en": "WhatsApp", "es": "WhatsApp", "zh": "WhatsApp", "category": "contact"},
        {"en": "WhatsApp Number", "es": "Número de WhatsApp", "zh": "WhatsApp号码", "category": "contact"},
        {"en": "Website", "es": "Sitio Web", "zh": "网站", "category": "contact"},
        # Address
        {"en": "Address", "es": "Dirección", "zh": "地址", "category": "address"},
        {"en": "City", "es": "Ciudad", "zh": "城市", "category": "address"},
        {"en": "Country", "es": "País", "zh": "国家", "category": "address"},
        {"en": "State", "es": "Estado/Provincia", "zh": "省/州", "category": "address"},
        {"en": "Zip Code", "es": "Código Postal", "zh": "邮政编码", "category": "address"},
        {"en": "Postal Code", "es": "Código Postal", "zh": "邮政编码", "category": "address"},
        # Education
        {"en": "School", "es": "Colegio", "zh": "学校", "category": "education"},
        {"en": "Grade", "es": "Grado", "zh": "年级", "category": "education"},
        {"en": "Class", "es": "Clase", "zh": "班级", "category": "education"},
        {"en": "Student", "es": "Estudiante", "zh": "学生", "category": "education"},
        {"en": "Student Name", "es": "Nombre del Estudiante", "zh": "学生姓名", "category": "education"},
        {"en": "Student Number", "es": "Número de Estudiante", "zh": "学号", "category": "education"},
        {"en": "Student ID", "es": "ID del Estudiante", "zh": "学生编号", "category": "education"},
        {"en": "Teacher", "es": "Profesor", "zh": "教师", "category": "education"},
        {"en": "Parent", "es": "Padre/Madre", "zh": "父母", "category": "education"},
        {"en": "Guardian", "es": "Tutor", "zh": "监护人", "category": "education"},
        {"en": "Relationship", "es": "Relación", "zh": "关系", "category": "education"},
        {"en": "Year", "es": "Año", "zh": "年份", "category": "education"},
        {"en": "School Year", "es": "Año Escolar", "zh": "学年", "category": "education"},
        {"en": "Semester", "es": "Semestre", "zh": "学期", "category": "education"},
        # Commerce
        {"en": "Price", "es": "Precio", "zh": "价格", "category": "commerce"},
        {"en": "Quantity", "es": "Cantidad", "zh": "数量", "category": "commerce"},
        {"en": "Total", "es": "Total", "zh": "总计", "category": "commerce"},
        {"en": "Order", "es": "Pedido", "zh": "订单", "category": "commerce"},
        {"en": "Order Number", "es": "Número de Pedido", "zh": "订单号", "category": "commerce"},
        {"en": "Payment", "es": "Pago", "zh": "付款", "category": "commerce"},
        {"en": "Payment Method", "es": "Método de Pago", "zh": "支付方式", "category": "commerce"},
        {"en": "Receipt", "es": "Recibo", "zh": "收据", "category": "commerce"},
        {"en": "Invoice", "es": "Factura", "zh": "发票", "category": "commerce"},
        {"en": "Discount", "es": "Descuento", "zh": "折扣", "category": "commerce"},
        # General
        {"en": "Notes", "es": "Notas", "zh": "备注", "category": "general"},
        {"en": "Comments", "es": "Comentarios", "zh": "评论", "category": "general"},
        {"en": "Description", "es": "Descripción", "zh": "描述", "category": "general"},
        {"en": "Status", "es": "Estado", "zh": "状态", "category": "general"},
        {"en": "Type", "es": "Tipo", "zh": "类型", "category": "general"},
        {"en": "Category", "es": "Categoría", "zh": "类别", "category": "general"},
        {"en": "Date", "es": "Fecha", "zh": "日期", "category": "general"},
        {"en": "Photo", "es": "Foto", "zh": "照片", "category": "general"},
        {"en": "Image", "es": "Imagen", "zh": "图片", "category": "general"},
        {"en": "File", "es": "Archivo", "zh": "文件", "category": "general"},
        {"en": "Document", "es": "Documento", "zh": "文档", "category": "general"},
        {"en": "Attachment", "es": "Adjunto", "zh": "附件", "category": "general"},
        {"en": "Signature", "es": "Firma", "zh": "签名", "category": "general"},
        {"en": "Company", "es": "Empresa", "zh": "公司", "category": "general"},
        {"en": "Message", "es": "Mensaje", "zh": "消息", "category": "general"},
        {"en": "Subject", "es": "Asunto", "zh": "主题", "category": "general"},
        {"en": "Reference", "es": "Referencia", "zh": "参考", "category": "general"},
        {"en": "Other", "es": "Otro", "zh": "其他", "category": "general"},
        {"en": "Optional", "es": "Opcional", "zh": "可选", "category": "general"},
        {"en": "Required", "es": "Requerido", "zh": "必填", "category": "general"},
        # ID/Documents
        {"en": "ID Number", "es": "Número de Identificación", "zh": "身份证号", "category": "documents"},
        {"en": "Passport", "es": "Pasaporte", "zh": "护照", "category": "documents"},
        {"en": "Passport Number", "es": "Número de Pasaporte", "zh": "护照号码", "category": "documents"},
    ]
    
    docs = []
    for d in defaults:
        doc = {
            "term_id": f"term_{uuid4().hex[:8]}",
            "en": d["en"],
            "es": d["es"],
            "zh": d["zh"],
            "category": d.get("category", "general"),
            "is_custom": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        docs.append(doc)
    
    if docs:
        await db.translation_dictionary.insert_many(docs)
    
    # Return without _id
    return [{k: v for k, v in d.items() if k != "_id"} for d in docs]
