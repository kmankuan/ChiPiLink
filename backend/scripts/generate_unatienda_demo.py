"""
Demo Data Generator for Unatienda Private Catalog
Generates:
1. Private catalog products (textbooks for PCA students)
2. Pre-loaded students list for vinculacion flow
3. Sample orders to sync with Monday.com
"""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Dict
import random

# Database connection
from core.database import db


# ============== DEMO DATA DEFINITIONS ==============

# Grados de PCA (Pre-Kinder a 12vo)
GRADOS_PCA = [
    "Pre-Kinder", "Kinder",
    "1ro", "2do", "3ro", "4to", "5to", "6to",
    "7mo", "8vo", "9no", "10mo", "11vo", "12vo"
]

# Materias por nivel
MATERIAS_PRIMARIA = ["Espyearl", "Mathematics", "Ciencias Naturales", "Ciencias Sociales", "English", "Religion"]
MATERIAS_SECUNDARIA = ["Espyearl", "Mathematics", "Physics", "Chemistry", "Biology", "Historia", "Geography", "English", "Religion", "Technology"]

# Editoriales
EDITORIALES = ["Santillana", "SM", "Norma", "McGraw-Hill", "Pearson", "Oxford"]

# Nombres panameños de ejemplo
NOMBRES = ["Maria", "Jose", "Ana", "Carlos", "Sofia", "Miguel", "Isabella", "David", "Valentina", "Daniel", 
           "Camila", "Andres", "Lucia", "Juan", "Emma", "Diego", "Gabriela", "Sebastian", "Victoria", "Alejandro"]
APELLIDOS = ["Gonzalez", "Rodriguez", "Martinez", "Lopez", "Garcia", "Hernandez", "Perez", "Sanchez", "Ramirez", "Torres",
             "Flores", "Rivera", "Gomez", "Diaz", "Cruz", "Morales", "Ortega", "Vargas", "Castro", "Jimenez"]


def generate_isbn():
    """Generate a random ISBN-like code"""
    return f"978-{random.randint(1000, 9999)}-{random.randint(100, 999)}-{random.randint(10, 99)}"


def get_materias_for_grado(grado: str) -> List[str]:
    """Get subjects for a grade level"""
    if grado in ["Pre-Kinder", "Kinder"]:
        return ["Apresto", "English"]
    elif grado in ["1ro", "2do", "3ro", "4to", "5to", "6to"]:
        return MATERIAS_PRIMARIA
    else:
        return MATERIAS_SECUNDARIA


async def generate_catalog_products() -> List[Dict]:
    """Generate textbook catalog for all grades"""
    products = []
    
    # Clear existing demo products
    await db.libros.delete_many({"es_demo": True})
    
    for grado in GRADOS_PCA:
        materias = get_materias_for_grado(grado)
        
        for materia in materias:
            editorial = random.choice(EDITORIALES)
            
            # Base price varies by grade level
            base_price = random.uniform(12.0, 35.0)
            if grado in ["10mo", "11vo", "12vo"]:
                base_price = random.uniform(25.0, 45.0)
            
            product = {
                "libro_id": f"libro_{uuid.uuid4().hex[:12]}",
                "codigo": f"PCA-{grado[:3].upper()}-{materia[:3].upper()}-{random.randint(100,999)}",
                "nombre": f"{materia} {grado} - {editorial}",
                "descripcion": f"Libro de texto de {materia} para {grado} grado. Editorial {editorial}. Year escolar 2025-2026.",
                "categoria": "libros",
                "grado": grado,
                "grados": [grado],
                "materia": materia,
                "precio": round(base_price, 2),
                "precio_oferta": round(base_price * 0.9, 2) if random.random() > 0.7 else None,
                "cantidad_inventario": random.randint(20, 100),
                "isbn": generate_isbn(),
                "editorial": editorial,
                "imagen_url": f"https://picsum.photos/seed/{uuid.uuid4().hex[:8]}/300/400",
                "activo": True,
                "destacado": random.random() > 0.8,
                "en_promocion": random.random() > 0.85,
                "es_demo": True,
                "ano_escolar": "2025-2026",
                "es_catalogo_privado": True,
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            }
            products.append(product)
    
    # Insert all products
    if products:
        await db.libros.insert_many(products)
    
    return products


async def generate_students_list() -> List[Dict]:
    """Generate pre-loaded students list for vinculacion"""
    students = []
    
    # Clear existing demo students
    await db.estudiantes_sincronizados.delete_many({"es_demo": True})
    
    student_number = 1001
    
    for grado in GRADOS_PCA:
        # Generate 5-10 students per grade
        num_students = random.randint(5, 10)
        
        for _ in range(num_students):
            nombre = random.choice(NOMBRES)
            apellido = random.choice(APELLIDOS)
            apellido2 = random.choice(APELLIDOS)
            
            student = {
                "sync_id": f"sync_{uuid.uuid4().hex[:12]}",
                "numero_estudiante": f"PCA-{student_number}",
                "nombre_completo": f"{nombre} {apellido} {apellido2}",
                "nombre": nombre,
                "apellido": f"{apellido} {apellido2}",
                "grado": grado,
                "seccion": random.choice(["A", "B", "C"]),
                "sheet_id": "demo_sheet_pca_2025",
                "hoja_nombre": f"Estudiantes {grado}",
                "fila_numero": student_number - 1000,
                "estado": "activo",
                "override_local": False,
                "datos_extra": {
                    "email_acudiente": f"acudiente{student_number}@email.com",
                    "telefono_acudiente": f"+507 6{random.randint(100,999)}-{random.randint(1000,9999)}"
                },
                "es_demo": True,
                "fecha_sync": datetime.now(timezone.utc).isoformat(),
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            }
            students.append(student)
            student_number += 1
    
    # Insert all students
    if students:
        await db.estudiantes_sincronizados.insert_many(students)
    
    return students


async def generate_sample_orders(students: List[Dict], products: List[Dict]) -> List[Dict]:
    """Generate sample orders for Monday.com sync testing"""
    orders = []
    
    # Clear existing demo orders
    await db.textbook_orders.delete_many({"es_demo": True})
    
    # Select random students to have orders
    students_with_orders = random.sample(students, min(10, len(students)))
    
    for student in students_with_orders:
        # Get products for this student's grade
        grade_products = [p for p in products if student["grado"] in (p.get("grados") or [p.get("grado")])]
        
        if not grade_products:
            continue
        
        # Select 3-6 random products for the order
        order_products = random.sample(grade_products, min(random.randint(3, 6), len(grade_products)))
        
        items = []
        total = 0
        
        for product in order_products:
            cantidad = random.randint(1, 2)
            precio = product["precio_oferta"] or product["precio"]
            subtotal = cantidad * precio
            total += subtotal
            
            items.append({
                "item_id": f"item_{uuid.uuid4().hex[:8]}",
                "book_id": product["libro_id"],
                "book_code": product["codigo"],
                "book_name": product["nombre"],
                "quantity_ordered": cantidad,
                "price": precio,
                "subtotal": subtotal,
                "subject": product["materia"],
                "status": random.choice(["pending", "available", "reserved"])
            })
        
        # Create order with new schema
        statuses = ["draft", "pending", "confirmed", "processing", "ready"]
        
        order = {
            "order_id": f"order_{uuid.uuid4().hex[:12]}",
            "student_sync_id": student["sync_id"],
            "student_name": student["nombre_completo"],
            "grade": student["grado"],
            "student_number": student["numero_estudiante"],
            "user_name": f"Acudiente de {student['nombre']}",
            "user_email": student["datos_extra"].get("email_acudiente"),
            "user_phone": student["datos_extra"].get("telefono_acudiente"),
            "year": 2025,
            "status": random.choice(statuses),
            "items": items,
            "total_amount": round(total, 2),
            "items_count": len(items),
            "notes": f"Pedido de prueba para {student['nombre_completo']}",
            "es_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        orders.append(order)
    
    # Insert all orders
    if orders:
        await db.textbook_orders.insert_many(orders)
    
    return orders


async def generate_all_demo_data():
    """Generate all demo data for Unatienda"""
    print("🚀 Generando datos de demo para Unatienda...")
    
    # 1. Generate catalog
    print("\n📚 Generando catalog de libros...")
    products = await generate_catalog_products()
    print(f"   ✅ {len(products)} libros creados")
    
    # 2. Generate students
    print("\n👨‍🎓 Generando lista de estudiantes...")
    students = await generate_students_list()
    print(f"   ✅ {len(students)} estudiantes creados")
    
    # 3. Generate orders
    print("\n🛒 Generando pedidos de ejemplo...")
    orders = await generate_sample_orders(students, products)
    print(f"   ✅ {len(orders)} pedidos creados")
    
    # Summary by grade
    print("\n📊 Resumen por grado:")
    for grado in GRADOS_PCA:
        grado_products = len([p for p in products if p["grado"] == grado])
        grado_students = len([s for s in students if s["grado"] == grado])
        grado_orders = len([o for o in orders if o["estudiante_grado"] == grado])
        print(f"   {grado}: {grado_products} libros, {grado_students} estudiantes, {grado_orders} pedidos")
    
    return {
        "products": len(products),
        "students": len(students),
        "orders": len(orders),
        "products_list": products,
        "students_list": students,
        "orders_list": orders
    }


async def clear_demo_data():
    """Clear all demo data for Unatienda"""
    print("🗑️ Limpiando datos de demo...")
    
    result_libros = await db.libros.delete_many({"es_demo": True})
    result_estudiantes = await db.estudiantes_sincronizados.delete_many({"es_demo": True})
    result_orders = await db.textbook_orders.delete_many({"es_demo": True})
    
    return {
        "libros_eliminados": result_libros.deleted_count,
        "estudiantes_eliminados": result_estudiantes.deleted_count,
        "orders_deleted": result_orders.deleted_count
    }


# Main execution
if __name__ == "__main__":
    asyncio.run(generate_all_demo_data())
