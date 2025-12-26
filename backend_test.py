#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class TextbookStoreAPITester:
    def __init__(self, base_url="https://edutextbooks.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_resources = {
            'students': [],
            'books': [],
            'orders': []
        }

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            if not success:
                try:
                    error_detail = response.json().get('detail', response.text[:100])
                    details += f" - {error_detail}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details if not success else "")
            
            if success:
                try:
                    return response.json()
                except:
                    return {"success": True}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_admin_setup(self):
        """Test admin user setup"""
        print("\n🔧 Testing Admin Setup...")
        
        # Try to create admin user with query parameters
        url = f"{self.base_url}/api/admin/setup?email=admin@libreria.com&contrasena=admin123"
        
        try:
            response = requests.post(url, headers={'Content-Type': 'application/json'}, timeout=10)
            success = response.status_code == 200 or response.status_code == 400  # 400 if admin already exists
            
            if response.status_code == 400:
                # Admin already exists, which is fine
                self.log_test("Admin Setup", True, "Admin already exists")
                return True
            elif response.status_code == 200:
                self.log_test("Admin Setup", True)
                return True
            else:
                self.log_test("Admin Setup", False, f"Expected 200/400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Setup", False, f"Exception: {str(e)}")
            return False

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Authentication...")
        
        login_data = {
            "email": "admin@libreria.com",
            "contrasena": "admin123"
        }
        
        result = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            login_data
        )
        
        if result and 'token' in result:
            self.admin_token = result['token']
            return True
        return False

    def test_seed_data(self):
        """Test seeding sample data"""
        print("\n🌱 Testing Data Seeding...")
        
        # Use admin token for seeding
        old_token = self.token
        self.token = self.admin_token
        
        result = self.run_test(
            "Seed Sample Data",
            "POST",
            "admin/seed",
            200
        )
        
        self.token = old_token
        return result is not None

    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        
        user_data = {
            "email": f"test_parent_{datetime.now().strftime('%H%M%S')}@test.com",
            "contrasena": "TestPass123!",
            "nombre": "Test Parent",
            "telefono": "507-1234-5678",
            "direccion": "Test Address, Panama"
        }
        
        result = self.run_test(
            "User Registration",
            "POST",
            "auth/registro",
            200,
            user_data
        )
        
        if result and 'token' in result:
            self.token = result['token']
            return True
        return False

    def test_metadata_endpoints(self):
        """Test metadata endpoints"""
        print("\n📚 Testing Metadata Endpoints...")
        
        # Test grades endpoint
        grades = self.run_test(
            "Get Grades",
            "GET",
            "grados",
            200
        )
        
        # Test subjects endpoint
        subjects = self.run_test(
            "Get Subjects",
            "GET",
            "materias",
            200
        )
        
        return grades is not None and subjects is not None

    def test_books_catalog(self):
        """Test books catalog"""
        print("\n📖 Testing Books Catalog...")
        
        # Get all books
        books = self.run_test(
            "Get All Books",
            "GET",
            "libros",
            200
        )
        
        if books and len(books) > 0:
            # Test filtering by grade
            filtered_books = self.run_test(
                "Filter Books by Grade",
                "GET",
                "libros?grado=1",
                200
            )
            
            # Test filtering by subject
            subject_books = self.run_test(
                "Filter Books by Subject",
                "GET",
                "libros?materia=matematicas",
                200
            )
            
            # Test getting specific book
            book_id = books[0]['libro_id']
            specific_book = self.run_test(
                "Get Specific Book",
                "GET",
                f"libros/{book_id}",
                200
            )
            
            return all([books, filtered_books, subject_books, specific_book])
        
        return False

    def test_student_management(self):
        """Test student management"""
        print("\n🎓 Testing Student Management...")
        
        # Add a student
        student_data = {
            "nombre": "Test Student",
            "grado": "1",
            "escuela": "Test School",
            "notas": "Test notes"
        }
        
        student = self.run_test(
            "Add Student",
            "POST",
            "estudiantes",
            200,
            student_data
        )
        
        if student and 'estudiante_id' in student:
            student_id = student['estudiante_id']
            self.created_resources['students'].append(student_id)
            
            # Get students
            students = self.run_test(
                "Get Students",
                "GET",
                "estudiantes",
                200
            )
            
            # Update student
            updated_data = {
                "nombre": "Updated Student",
                "grado": "2",
                "escuela": "Updated School",
                "notas": "Updated notes"
            }
            
            update_result = self.run_test(
                "Update Student",
                "PUT",
                f"estudiantes/{student_id}",
                200,
                updated_data
            )
            
            return all([student, students, update_result])
        
        return False

    def test_order_creation(self):
        """Test order creation"""
        print("\n🛒 Testing Order Creation...")
        
        if not self.created_resources['students']:
            print("❌ No students available for order testing")
            return False
        
        # Get books for order
        books = self.run_test(
            "Get Books for Order",
            "GET",
            "libros?grado=1",
            200
        )
        
        if not books or len(books) == 0:
            print("❌ No books available for order testing")
            return False
        
        # Create order
        student_id = self.created_resources['students'][0]
        book = books[0]
        
        order_data = {
            "estudiante_id": student_id,
            "items": [
                {
                    "libro_id": book['libro_id'],
                    "nombre_libro": book['nombre'],
                    "cantidad": 2,
                    "precio_unitario": book['precio']
                }
            ],
            "metodo_pago": "transferencia_bancaria",
            "notas": "Test order"
        }
        
        order = self.run_test(
            "Create Order",
            "POST",
            "pedidos",
            200,
            order_data
        )
        
        if order and 'pedido_id' in order:
            order_id = order['pedido_id']
            self.created_resources['orders'].append(order_id)
            
            # Get user orders
            orders = self.run_test(
                "Get User Orders",
                "GET",
                "pedidos",
                200
            )
            
            # Get receipt
            receipt = self.run_test(
                "Get Receipt",
                "GET",
                f"pedidos/{order_id}/recibo",
                200
            )
            
            return all([order, orders, receipt])
        
        return False

    def test_public_books_api(self):
        """Test public books API (no auth required)"""
        print("\n📚 Testing Public Books API...")
        
        # Test public books endpoint without auth
        old_token = self.token
        self.token = None  # Remove auth for public endpoint
        
        # Get all public books
        all_books = self.run_test(
            "Get All Public Books",
            "GET",
            "public/libros",
            200
        )
        
        # Test filtering by grade
        grade_books = self.run_test(
            "Get Public Books by Grade",
            "GET",
            "public/libros?grado=1",
            200
        )
        
        # Restore token
        self.token = old_token
        
        return all([all_books, grade_books])

    def test_public_order_api(self):
        """Test public order API (embeddable form)"""
        print("\n🛒 Testing Public Order API...")
        
        # First get available books
        old_token = self.token
        self.token = None  # Remove auth for public endpoint
        
        books = self.run_test(
            "Get Books for Public Order",
            "GET",
            "public/libros?grado=1",
            200
        )
        
        if not books or len(books) == 0:
            print("❌ No books available for public order testing")
            self.token = old_token
            return False
        
        # Create public order with realistic data
        book = books[0]
        order_data = {
            # Guardian (Acudiente) info
            "nombre_acudiente": "María García López",
            "telefono_acudiente": "+507 6123-4567",
            "email_acudiente": "maria.garcia@test.com",
            
            # Student info
            "nombre_estudiante": "Carlos",
            "apellido_estudiante": "García Rodríguez",
            "grado_estudiante": "1",
            "email_estudiante": "carlos.garcia@test.com",
            "telefono_estudiante": "+507 6234-5678",
            "escuela_estudiante": "Escuela Primaria Test",
            
            # Order details
            "items": [
                {
                    "libro_id": book['libro_id'],
                    "nombre_libro": book['nombre'],
                    "cantidad": 2,
                    "precio_unitario": book['precio']
                }
            ],
            "metodo_pago": "transferencia_bancaria",
            "notas": "Pedido de prueba desde formulario embebible"
        }
        
        public_order = self.run_test(
            "Create Public Order",
            "POST",
            "public/pedido",
            200,
            order_data
        )
        
        # Restore token
        self.token = old_token
        
        if public_order and 'pedido_id' in public_order:
            self.created_resources['orders'].append(public_order['pedido_id'])
            return True
        
        return False

    def test_notifications_api(self):
        """Test notifications API"""
        print("\n🔔 Testing Notifications API...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Get notifications
        notifications = self.run_test(
            "Get Admin Notifications",
            "GET",
            "admin/notificaciones",
            200
        )
        
        # Get unread notifications only
        unread_notifications = self.run_test(
            "Get Unread Notifications",
            "GET",
            "admin/notificaciones?solo_no_leidas=true",
            200
        )
        
        # Get notifications by type
        order_notifications = self.run_test(
            "Get Order Notifications",
            "GET",
            "admin/notificaciones?tipos=pedido_nuevo",
            200
        )
        
        success = all([notifications, unread_notifications, order_notifications])
        
        # Test marking notification as read if we have notifications
        if notifications and notifications.get('notificaciones') and len(notifications['notificaciones']) > 0:
            notification_id = notifications['notificaciones'][0]['notificacion_id']
            
            mark_read = self.run_test(
                "Mark Notification as Read",
                "PUT",
                f"admin/notificaciones/{notification_id}/leer",
                200
            )
            
            # Test mark all as read
            mark_all_read = self.run_test(
                "Mark All Notifications as Read",
                "PUT",
                "admin/notificaciones/leer-todas",
                200
            )
            
            success = success and all([mark_read, mark_all_read])
        
        # Test notification config
        config = self.run_test(
            "Get Notification Config",
            "GET",
            "admin/config-notificaciones",
            200
        )
        
        # Update notification config
        config_data = {
            "mostrar_pedidos_nuevos": True,
            "mostrar_bajo_stock": True,
            "mostrar_pagos_confirmados": True,
            "mostrar_pedidos_enviados": True
        }
        
        update_config = self.run_test(
            "Update Notification Config",
            "PUT",
            "admin/config-notificaciones",
            200,
            config_data
        )
        
        success = success and all([config, update_config])
        
        # Restore token
        self.token = old_token
        return success

    def test_admin_functionality(self):
        """Test admin functionality"""
        print("\n👑 Testing Admin Functionality...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test inventory
        inventory = self.run_test(
            "Get Inventory",
            "GET",
            "admin/inventario",
            200
        )
        
        # Test all orders
        all_orders = self.run_test(
            "Get All Orders",
            "GET",
            "admin/pedidos",
            200
        )
        
        # Test product creation
        product_data = {
            "nombre": "Test Book",
            "descripcion": "Test description",
            "grado": "1",
            "materia": "matematicas",
            "precio": 25.99,
            "cantidad_inventario": 100,
            "isbn": "978-1-234-56789-9",
            "editorial": "Test Publisher"
        }
        
        product = self.run_test(
            "Create Product",
            "POST",
            "admin/libros",
            200,
            product_data
        )
        
        success = all([inventory, all_orders, product])
        
        if product and 'libro_id' in product:
            book_id = product['libro_id']
            self.created_resources['books'].append(book_id)
            
            # Test product update
            updated_product = {
                **product_data,
                "nombre": "Updated Test Book",
                "precio": 29.99
            }
            
            update_result = self.run_test(
                "Update Product",
                "PUT",
                f"admin/libros/{book_id}",
                200,
                updated_product
            )
            
            # Test inventory update
            inventory_update = self.run_test(
                "Update Inventory",
                "PUT",
                f"admin/inventario/{book_id}?cantidad=50",
                200
            )
            
            success = success and all([update_result, inventory_update])
        
        # Test order management if orders exist
        if self.created_resources['orders']:
            order_id = self.created_resources['orders'][0]
            
            # Test order status update
            status_update = self.run_test(
                "Update Order Status",
                "PUT",
                f"admin/pedidos/{order_id}?estado=confirmado",
                200
            )
            
            # Test payment confirmation
            payment_confirm = self.run_test(
                "Confirm Payment",
                "PUT",
                f"admin/pedidos/{order_id}/confirmar-pago",
                200
            )
            
            success = success and all([status_update, payment_confirm])
        
        # Restore original token
        self.token = old_token
        return success

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Use admin token for cleanup
        old_token = self.token
        self.token = self.admin_token
        
        # Delete created books
        for book_id in self.created_resources['books']:
            self.run_test(
                f"Delete Book {book_id}",
                "DELETE",
                f"admin/libros/{book_id}",
                200
            )
        
        # Restore token
        self.token = old_token
        
        # Delete students
        for student_id in self.created_resources['students']:
            self.run_test(
                f"Delete Student {student_id}",
                "DELETE",
                f"estudiantes/{student_id}",
                200
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Textbook Store API Tests")
        print(f"Testing against: {self.base_url}")
        
        # Test sequence
        tests = [
            ("Admin Setup", self.test_admin_setup),
            ("Admin Login", self.test_admin_login),
            ("Seed Data", self.test_seed_data),
            ("Public Books API", self.test_public_books_api),
            ("Public Order API", self.test_public_order_api),
            ("Notifications API", self.test_notifications_api),
            ("User Registration", self.test_user_registration),
            ("Metadata Endpoints", self.test_metadata_endpoints),
            ("Books Catalog", self.test_books_catalog),
            ("Student Management", self.test_student_management),
            ("Order Creation", self.test_order_creation),
            ("Admin Functionality", self.test_admin_functionality),
        ]
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                if not success:
                    print(f"⚠️  {test_name} failed - continuing with other tests")
            except Exception as e:
                print(f"💥 {test_name} crashed: {str(e)}")
        
        # Cleanup
        self.cleanup_resources()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TextbookStoreAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())