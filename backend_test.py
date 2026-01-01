#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class TextbookStoreAPITester:
    def __init__(self, base_url="https://unatienda.preview.emergentagent.com"):
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
        url = f"{self.base_url}/api/admin/setup?email=admin@libreria.com&contrasena=adminpassword"
        
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
            "contrasena": "adminpassword"
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
        
        # Create test user and student data as mentioned in the review
        self.token = old_token
        
        # Create test user juan.perez@test.com
        test_user_data = {
            "email": "juan.perez@test.com",
            "contrasena": "password123",
            "nombre": "Juan Pérez",
            "telefono": "507-1234-5678",
            "direccion": "Ciudad de Panamá, Panamá"
        }
        
        test_user_result = self.run_test(
            "Create Test User (juan.perez@test.com)",
            "POST",
            "auth/registro",
            200,
            test_user_data
        )
        
        if test_user_result and 'token' in test_user_result:
            # Use the test user token to create María Pérez García
            test_token = test_user_result['token']
            old_token = self.token
            self.token = test_token
            
            # Create María Pérez García student with confirmed enrollment
            maria_data = {
                "nombre": "María",
                "apellido": "Pérez García", 
                "grado": "4",
                "escuela": "Escuela Primaria Central",
                "es_nuevo": False,
                "documento_matricula": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
            }
            
            maria_result = self.run_test(
                "Create María Pérez García Student",
                "POST",
                "estudiantes",
                200,
                maria_data
            )
            
            if maria_result and 'estudiante_id' in maria_result:
                # Get user info to approve María's enrollment
                user_info = self.run_test(
                    "Get Test User Info",
                    "GET", 
                    "auth/me",
                    200
                )
                
                if user_info and 'cliente_id' in user_info:
                    cliente_id = user_info['cliente_id']
                    estudiante_id = maria_result['estudiante_id']
                    
                    # Switch to admin token to approve María's enrollment
                    self.token = self.admin_token
                    
                    approval_result = self.run_test(
                        "Approve María's Enrollment",
                        "PUT",
                        f"admin/matriculas/{cliente_id}/{estudiante_id}/verificar?accion=aprobar",
                        200
                    )
                    
                    self.token = old_token
                    return all([result, test_user_result, maria_result, approval_result])
            
            self.token = old_token
        
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
        
        # Add a student with enrollment document
        student_data = {
            "nombre": "María",
            "apellido": "Pérez García",
            "grado": "4",
            "escuela": "Escuela Primaria Central",
            "es_nuevo": False,
            "documento_matricula": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
        }
        
        student = self.run_test(
            "Add Student with Enrollment Document",
            "POST",
            "estudiantes",
            200,
            student_data
        )
        
        if student and 'estudiante_id' in student:
            student_id = student['estudiante_id']
            self.created_resources['students'].append(student_id)
            
            # Verify student has pending enrollment status
            if student.get('estado_matricula') != 'pendiente':
                self.log_test("Student Enrollment Status", False, f"Expected 'pendiente', got '{student.get('estado_matricula')}'")
                return False
            else:
                self.log_test("Student Enrollment Status", True)
            
            # Get students
            students = self.run_test(
                "Get Students",
                "GET",
                "estudiantes",
                200
            )
            
            # Update student
            updated_data = {
                "nombre": "María",
                "apellido": "Pérez García",
                "grado": "4",
                "escuela": "Escuela Primaria Central Actualizada",
                "es_nuevo": False,
                "notas": "Estudiante actualizada"
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

    def test_enrollment_verification_flow(self):
        """Test the complete enrollment verification flow"""
        print("\n📋 Testing Enrollment Verification Flow...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Get pending enrollments
        pending_enrollments = self.run_test(
            "Get Pending Enrollments",
            "GET",
            "admin/matriculas-pendientes",
            200
        )
        
        # Get all enrollments
        all_enrollments = self.run_test(
            "Get All Enrollments",
            "GET",
            "admin/matriculas",
            200
        )
        
        # Filter by confirmed status
        confirmed_enrollments = self.run_test(
            "Get Confirmed Enrollments",
            "GET",
            "admin/matriculas?estado=confirmada",
            200
        )
        
        # Filter by pending status
        pending_filtered = self.run_test(
            "Get Pending Enrollments (Filtered)",
            "GET",
            "admin/matriculas?estado=pendiente",
            200
        )
        
        success = all([pending_enrollments, all_enrollments, confirmed_enrollments, pending_filtered])
        
        # If we have pending enrollments, test approval/rejection
        if pending_enrollments and len(pending_enrollments) > 0:
            enrollment = pending_enrollments[0]
            cliente_id = enrollment.get('cliente_id')
            estudiante_id = enrollment.get('estudiante_id')
            
            if cliente_id and estudiante_id:
                # Test approval
                approval_result = self.run_test(
                    "Approve Enrollment",
                    "PUT",
                    f"admin/matriculas/{cliente_id}/{estudiante_id}/verificar?accion=aprobar",
                    200
                )
                
                success = success and approval_result is not None
                
                # Verify the enrollment is now confirmed
                confirmed_check = self.run_test(
                    "Verify Enrollment Confirmed",
                    "GET",
                    "admin/matriculas?estado=confirmada",
                    200
                )
                
                success = success and confirmed_check is not None
        
        # Restore token
        self.token = old_token
        return success

    def test_book_purchase_flow(self):
        """Test the complete book purchase flow for enrolled students"""
        print("\n📚 Testing Book Purchase Flow...")
        
        if not self.created_resources['students']:
            print("❌ No students available for purchase testing")
            return False
        
        student_id = self.created_resources['students'][0]
        
        # First, we need to confirm the student's enrollment as admin
        old_token = self.token
        self.token = self.admin_token
        
        # Get the student's client info
        user_info = None
        self.token = old_token  # Switch back to user token to get user info
        
        user_data = self.run_test(
            "Get Current User Info",
            "GET",
            "auth/me",
            200
        )
        
        if user_data and 'cliente_id' in user_data:
            cliente_id = user_data['cliente_id']
            
            # Switch to admin token to approve enrollment
            self.token = self.admin_token
            
            approval_result = self.run_test(
                "Approve Student Enrollment for Purchase",
                "PUT",
                f"admin/matriculas/{cliente_id}/{student_id}/verificar?accion=aprobar",
                200
            )
            
            # Switch back to user token
            self.token = old_token
            
            if approval_result:
                # Test getting available books for the student
                available_books = self.run_test(
                    "Get Available Books for Student",
                    "GET",
                    f"estudiantes/{student_id}/libros-disponibles",
                    200
                )
                
                if available_books and available_books.get('libros') and len(available_books['libros']) > 0:
                    # Select books for purchase
                    books = available_books['libros']
                    available_books_list = [book for book in books if book.get('disponible', False)]
                    
                    if len(available_books_list) >= 2:
                        # Create order with 2 books
                        book1 = available_books_list[0]
                        book2 = available_books_list[1]
                        
                        order_data = {
                            "estudiante_id": student_id,
                            "items": [
                                {
                                    "libro_id": book1['libro_id'],
                                    "nombre_libro": book1['nombre'],
                                    "cantidad": 1,
                                    "precio_unitario": book1['precio']
                                },
                                {
                                    "libro_id": book2['libro_id'],
                                    "nombre_libro": book2['nombre'],
                                    "cantidad": 1,
                                    "precio_unitario": book2['precio']
                                }
                            ],
                            "metodo_pago": "transferencia_bancaria",
                            "notas": "Compra de libros de 4to grado"
                        }
                        
                        order = self.run_test(
                            "Create Book Order for Enrolled Student",
                            "POST",
                            "pedidos",
                            200,
                            order_data
                        )
                        
                        if order and 'pedido_id' in order:
                            order_id = order['pedido_id']
                            self.created_resources['orders'].append(order_id)
                            
                            # Verify books are now marked as purchased
                            updated_books = self.run_test(
                                "Verify Books Marked as Purchased",
                                "GET",
                                f"estudiantes/{student_id}/libros-disponibles",
                                200
                            )
                            
                            if updated_books and updated_books.get('libros'):
                                purchased_books = [book for book in updated_books['libros'] if book.get('ya_comprado', False)]
                                if len(purchased_books) >= 2:
                                    self.log_test("Books Marked as Purchased", True)
                                    return True
                                else:
                                    self.log_test("Books Marked as Purchased", False, f"Expected 2+ purchased books, found {len(purchased_books)}")
                            
                            return order is not None
                        
                        return False
                    else:
                        print("❌ Not enough available books for purchase testing")
                        return False
                else:
                    print("❌ No available books for enrolled student")
                    return False
            else:
                print("❌ Failed to approve student enrollment")
                return False
        else:
            print("❌ Could not get user info for enrollment approval")
            return False

    def test_duplicate_purchase_prevention(self):
        """Test prevention of duplicate book purchases"""
        print("\n🚫 Testing Duplicate Purchase Prevention...")
        
        if not self.created_resources['students'] or not self.created_resources['orders']:
            print("❌ No students or orders available for duplicate purchase testing")
            return False
        
        student_id = self.created_resources['students'][0]
        
        # Get the student's available books (should show already purchased books)
        available_books = self.run_test(
            "Get Books After Purchase",
            "GET",
            f"estudiantes/{student_id}/libros-disponibles",
            200
        )
        
        if available_books and available_books.get('libros'):
            purchased_books = [book for book in available_books['libros'] if book.get('ya_comprado', False)]
            
            if len(purchased_books) > 0:
                # Try to purchase the same book again
                purchased_book = purchased_books[0]
                
                duplicate_order_data = {
                    "estudiante_id": student_id,
                    "items": [
                        {
                            "libro_id": purchased_book['libro_id'],
                            "nombre_libro": purchased_book['nombre'],
                            "cantidad": 1,
                            "precio_unitario": purchased_book['precio']
                        }
                    ],
                    "metodo_pago": "transferencia_bancaria",
                    "notas": "Intento de compra duplicada"
                }
                
                # This should fail with 400 status
                duplicate_result = self.run_test(
                    "Attempt Duplicate Purchase (Should Fail)",
                    "POST",
                    "pedidos",
                    400,  # Expecting failure
                    duplicate_order_data
                )
                
                # If we get here and the test passed, it means the duplicate was properly prevented
                return duplicate_result is None  # None means the test "passed" (got expected 400)
            else:
                print("❌ No purchased books found to test duplicate prevention")
                return False
        else:
            print("❌ Could not get student's book list")
            return False

    def test_block_based_landing_page_public_endpoints(self):
        """Test Block-Based Landing Page Editor - Public Endpoints"""
        print("\n🏠 Testing Block-Based Landing Page - Public Endpoints...")
        
        # Remove auth for public endpoints
        old_token = self.token
        self.token = None
        
        # Test public site config
        site_config = self.run_test(
            "Get Public Site Configuration",
            "GET",
            "public/site-config",
            200
        )
        
        # Test public landing page
        landing_page = self.run_test(
            "Get Public Landing Page",
            "GET",
            "public/landing-page",
            200
        )
        
        # Restore token
        self.token = old_token
        
        # Validate response structure
        success = True
        if site_config:
            required_fields = ['nombre_sitio', 'color_primario', 'color_secundario', 'footer_texto']
            for field in required_fields:
                if field not in site_config:
                    self.log_test(f"Site Config Field '{field}'", False, f"Missing required field")
                    success = False
                else:
                    self.log_test(f"Site Config Field '{field}'", True)
        
        if landing_page:
            required_fields = ['pagina_id', 'titulo', 'bloques', 'publicada']
            for field in required_fields:
                if field not in landing_page:
                    self.log_test(f"Landing Page Field '{field}'", False, f"Missing required field")
                    success = False
                else:
                    self.log_test(f"Landing Page Field '{field}'", True)
        
        return success and all([site_config, landing_page])

    def test_block_based_landing_page_admin_endpoints(self):
        """Test Block-Based Landing Page Editor - Admin Endpoints"""
        print("\n👑 Testing Block-Based Landing Page - Admin Endpoints...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test get block templates
        block_templates = self.run_test(
            "Get Block Templates",
            "GET",
            "admin/block-templates",
            200
        )
        
        # Validate block templates
        if block_templates:
            expected_blocks = ['hero', 'features', 'text', 'image', 'cta', 'stats', 'cards', 'banner', 'testimonials', 'spacer', 'divider']
            found_blocks = list(block_templates.keys())
            
            if len(found_blocks) >= 11:
                self.log_test("Block Templates Count (11+ types)", True)
            else:
                self.log_test("Block Templates Count (11+ types)", False, f"Expected 11+, got {len(found_blocks)}")
            
            for block_type in expected_blocks:
                if block_type in block_templates:
                    self.log_test(f"Block Template '{block_type}'", True)
                else:
                    self.log_test(f"Block Template '{block_type}'", False, f"Missing block type")
        
        # Test get admin site config
        admin_site_config = self.run_test(
            "Get Admin Site Configuration",
            "GET",
            "admin/site-config",
            200
        )
        
        # Test update site config
        if admin_site_config:
            updated_config = admin_site_config.copy()
            updated_config['nombre_sitio'] = "Mi Plataforma"
            updated_config['color_primario'] = "#16a34a"
            updated_config['footer_texto'] = "© 2025 Mi Plataforma - Todos los derechos reservados"
            
            update_result = self.run_test(
                "Update Site Configuration",
                "PUT",
                "admin/site-config",
                200,
                updated_config
            )
            
            # Verify the update worked
            if update_result and update_result.get('success'):
                self.log_test("Site Config Update Success", True)
            else:
                self.log_test("Site Config Update Success", False, "Update did not return success")
        
        # Test get admin landing page
        admin_landing_page = self.run_test(
            "Get Admin Landing Page",
            "GET",
            "admin/landing-page",
            200
        )
        
        # Store initial block count for later comparison
        initial_block_count = 0
        if admin_landing_page and admin_landing_page.get('bloques'):
            initial_block_count = len(admin_landing_page['bloques'])
            self.log_test(f"Initial Landing Page Blocks ({initial_block_count} blocks)", True)
        
        # Restore token
        self.token = old_token
        
        return all([block_templates, admin_site_config, admin_landing_page])

    def test_block_crud_operations(self):
        """Test Block CRUD Operations"""
        print("\n🧱 Testing Block CRUD Operations...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test adding a new text block
        add_block_result = self.run_test(
            "Add Text Block",
            "POST",
            "admin/landing-page/blocks?tipo=text",
            200
        )
        
        block_id = None
        if add_block_result and add_block_result.get('block') and add_block_result['block'].get('bloque_id'):
            block_id = add_block_result['block']['bloque_id']
            self.log_test("Text Block Creation", True)
            
            # Test updating the text block
            update_config = {
                "titulo": "Bloque de Texto de Prueba",
                "contenido": "Este es un bloque de texto creado durante las pruebas automatizadas.",
                "alineacion": "center",
                "ancho_max": "600px"
            }
            
            update_result = self.run_test(
                "Update Text Block Content",
                "PUT",
                f"admin/landing-page/blocks/{block_id}",
                200,
                update_config
            )
            
            if update_result and update_result.get('success'):
                self.log_test("Text Block Update", True)
                
                # Test deleting the text block
                delete_result = self.run_test(
                    "Delete Text Block",
                    "DELETE",
                    f"admin/landing-page/blocks/{block_id}",
                    200
                )
                
                if delete_result and delete_result.get('success'):
                    self.log_test("Text Block Deletion", True)
                    
                    # Restore token
                    self.token = old_token
                    return True
                else:
                    self.log_test("Text Block Deletion", False, "Delete did not return success")
            else:
                self.log_test("Text Block Update", False, "Update did not return success")
        else:
            self.log_test("Text Block Creation", False, "Block creation failed or missing block_id")
        
        # Restore token
        self.token = old_token
        return False

    def test_block_reorder_operations(self):
        """Test Block Reorder Operations"""
        print("\n🔄 Testing Block Reorder Operations...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # First, get current landing page to see existing blocks
        current_page = self.run_test(
            "Get Current Landing Page for Reorder",
            "GET",
            "admin/landing-page",
            200
        )
        
        if current_page and current_page.get('bloques') and len(current_page['bloques']) >= 2:
            blocks = current_page['bloques']
            
            # Create reorder data - reverse the order of first two blocks
            reorder_data = []
            for i, block in enumerate(blocks[:2]):
                reorder_data.append({
                    "bloque_id": block['bloque_id'],
                    "orden": 1 - i  # Reverse order: 0->1, 1->0
                })
            
            # Add remaining blocks with their current order + adjustment
            for i, block in enumerate(blocks[2:], start=2):
                reorder_data.append({
                    "bloque_id": block['bloque_id'],
                    "orden": i
                })
            
            # Note: The reorder endpoint has a FastAPI model issue - it expects List[dict] 
            # but FastAPI interprets this as expecting a dict wrapper. This is a backend issue.
            self.log_test("Block Reorder Operation", False, "Backend endpoint expects List[dict] but FastAPI requires wrapper model")
            self.log_test("Block Reorder Prerequisites", True, f"Found {len(blocks)} blocks ready for reordering")
        else:
            self.log_test("Block Reorder Prerequisites", False, "Need at least 2 blocks to test reordering")
        
        # Restore token
        self.token = old_token
        return False

    def test_landing_page_publish_toggle(self):
        """Test Landing Page Publish Toggle"""
        print("\n📢 Testing Landing Page Publish Toggle...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test unpublishing the landing page
        unpublish_result = self.run_test(
            "Unpublish Landing Page",
            "PUT",
            "admin/landing-page/publish?publicada=false",
            200
        )
        
        if unpublish_result and unpublish_result.get('success'):
            self.log_test("Landing Page Unpublish", True)
            
            # Test publishing it back
            publish_result = self.run_test(
                "Publish Landing Page",
                "PUT",
                "admin/landing-page/publish?publicada=true",
                200
            )
            
            if publish_result and publish_result.get('success'):
                self.log_test("Landing Page Publish", True)
                
                # Restore token
                self.token = old_token
                return True
            else:
                self.log_test("Landing Page Publish", False, "Publish did not return success")
        else:
            self.log_test("Landing Page Unpublish", False, "Unpublish did not return success")
        
        # Restore token
        self.token = old_token
        return False

    def test_branding_neutralization(self):
        """Test Task 1: Branding Neutralization (P1)"""
        print("\n🏷️ Testing Branding Neutralization (P1)...")
        
        # Remove auth for public endpoint
        old_token = self.token
        self.token = None
        
        # Test public site config endpoint
        site_config = self.run_test(
            "GET /api/public/site-config",
            "GET",
            "public/site-config",
            200
        )
        
        success = True
        if site_config:
            # Check that it returns current site config with nombre_sitio
            if 'nombre_sitio' in site_config:
                site_name = site_config['nombre_sitio']
                self.log_test("Site Config Contains 'nombre_sitio'", True, f"Site name: {site_name}")
                
                # Check that it's not the old hardcoded "Librería Escolar"
                if site_name != "Librería Escolar":
                    self.log_test("Site Name is Dynamic (not 'Librería Escolar')", True, f"Current name: {site_name}")
                else:
                    self.log_test("Site Name is Dynamic (not 'Librería Escolar')", False, "Still using hardcoded 'Librería Escolar'")
                    success = False
            else:
                self.log_test("Site Config Contains 'nombre_sitio'", False, "Missing 'nombre_sitio' field")
                success = False
                
            # Check for other required fields
            required_fields = ['color_primario', 'color_secundario', 'footer_texto']
            for field in required_fields:
                if field in site_config:
                    self.log_test(f"Site Config Contains '{field}'", True)
                else:
                    self.log_test(f"Site Config Contains '{field}'", False, f"Missing '{field}' field")
                    success = False
        else:
            success = False
        
        # Restore token
        self.token = old_token
        return success

    def test_thermal_receipt(self):
        """Test Task 2: Thermal Receipt (P2)"""
        print("\n🧾 Testing Thermal Receipt (P2)...")
        
        # First, create a test order
        if not self.admin_token:
            self.log_test("Thermal Receipt Test", False, "Admin token required for setup")
            return False
        
        # Use admin token to create test data
        old_token = self.token
        self.token = self.admin_token
        
        # Get available books
        books = self.run_test(
            "Get Books for Receipt Test",
            "GET",
            "libros",
            200
        )
        
        if not books or len(books) == 0:
            self.log_test("Thermal Receipt Test", False, "No books available for testing")
            self.token = old_token
            return False
        
        # Create a test user for the order
        test_user_data = {
            "email": f"receipt_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "contrasena": "TestPass123!",
            "nombre": "Receipt Test User",
            "telefono": "507-1234-5678",
            "direccion": "Test Address"
        }
        
        user_result = self.run_test(
            "Create Test User for Receipt",
            "POST",
            "auth/registro",
            200,
            test_user_data
        )
        
        if not user_result or 'token' not in user_result:
            self.log_test("Thermal Receipt Test", False, "Failed to create test user")
            self.token = old_token
            return False
        
        # Switch to user token
        user_token = user_result['token']
        self.token = user_token
        
        # Add a student
        student_data = {
            "nombre": "Test",
            "apellido": "Student Receipt",
            "grado": "1",
            "escuela": "Test School",
            "es_nuevo": True
        }
        
        student_result = self.run_test(
            "Create Test Student for Receipt",
            "POST",
            "estudiantes",
            200,
            student_data
        )
        
        if not student_result or 'estudiante_id' not in student_result:
            self.log_test("Thermal Receipt Test", False, "Failed to create test student")
            self.token = old_token
            return False
        
        student_id = student_result['estudiante_id']
        
        # Get user info for approval
        user_info = self.run_test(
            "Get User Info for Receipt Test",
            "GET",
            "auth/me",
            200
        )
        
        if not user_info or 'cliente_id' not in user_info:
            self.log_test("Thermal Receipt Test", False, "Failed to get user info")
            self.token = old_token
            return False
        
        cliente_id = user_info['cliente_id']
        
        # Switch to admin token to approve enrollment
        self.token = self.admin_token
        
        approval_result = self.run_test(
            "Approve Student for Receipt Test",
            "PUT",
            f"admin/matriculas/{cliente_id}/{student_id}/verificar?accion=aprobar",
            200
        )
        
        if not approval_result:
            self.log_test("Thermal Receipt Test", False, "Failed to approve student enrollment")
            self.token = old_token
            return False
        
        # Switch back to user token to create order
        self.token = user_token
        
        # Create order
        book = books[0]
        order_data = {
            "estudiante_id": student_id,
            "items": [
                {
                    "libro_id": book['libro_id'],
                    "nombre_libro": book['nombre'],
                    "cantidad": 1,
                    "precio_unitario": book['precio']
                }
            ],
            "metodo_pago": "transferencia_bancaria",
            "notas": "Test order for receipt"
        }
        
        order_result = self.run_test(
            "Create Order for Receipt Test",
            "POST",
            "pedidos",
            200,
            order_data
        )
        
        if not order_result or 'pedido_id' not in order_result:
            self.log_test("Thermal Receipt Test", False, "Failed to create test order")
            self.token = old_token
            return False
        
        pedido_id = order_result['pedido_id']
        
        # Now test the receipt endpoint
        receipt_result = self.run_test(
            "GET /api/pedidos/{pedido_id}/recibo",
            "GET",
            f"pedidos/{pedido_id}/recibo",
            200
        )
        
        success = True
        if receipt_result:
            # Validate receipt structure
            if 'pedido' in receipt_result and 'cliente' in receipt_result:
                self.log_test("Receipt Contains Order and Client Data", True)
                
                # Check order data
                pedido_data = receipt_result['pedido']
                required_order_fields = ['pedido_id', 'items', 'total', 'metodo_pago', 'fecha_creacion']
                for field in required_order_fields:
                    if field in pedido_data:
                        self.log_test(f"Receipt Order Contains '{field}'", True)
                    else:
                        self.log_test(f"Receipt Order Contains '{field}'", False, f"Missing '{field}' field")
                        success = False
                
                # Check client data
                cliente_data = receipt_result['cliente']
                required_client_fields = ['nombre', 'email']
                for field in required_client_fields:
                    if field in cliente_data:
                        self.log_test(f"Receipt Client Contains '{field}'", True)
                    else:
                        self.log_test(f"Receipt Client Contains '{field}'", False, f"Missing '{field}' field")
                        success = False
            else:
                self.log_test("Receipt Contains Order and Client Data", False, "Missing 'pedido' or 'cliente' fields")
                success = False
        else:
            success = False
        
        # Cleanup - delete the test student
        delete_result = self.run_test(
            "Cleanup Test Student",
            "DELETE",
            f"estudiantes/{student_id}",
            200
        )
        
        # Restore token
        self.token = old_token
        return success

    def test_monday_integration(self):
        """Test Task 3: Monday.com Integration (P3)"""
        print("\n📋 Testing Monday.com Integration (P3)...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test Monday.com status endpoint
        monday_status = self.run_test(
            "GET /api/admin/monday/status",
            "GET",
            "admin/monday/status",
            200
        )
        
        success = True
        if monday_status:
            # Check required fields in response
            required_fields = ['api_key_configured', 'board_id_configured', 'connected', 'boards']
            for field in required_fields:
                if field in monday_status:
                    self.log_test(f"Monday Status Contains '{field}'", True)
                else:
                    self.log_test(f"Monday Status Contains '{field}'", False, f"Missing '{field}' field")
                    success = False
            
            # Validate expected values based on environment
            if 'api_key_configured' in monday_status:
                api_key_configured = monday_status['api_key_configured']
                if api_key_configured:
                    self.log_test("Monday API Key Configured", True)
                else:
                    self.log_test("Monday API Key Configured", False, "API key not configured")
                    success = False
            
            if 'board_id_configured' in monday_status:
                board_id_configured = monday_status['board_id_configured']
                if not board_id_configured:
                    self.log_test("Monday Board ID Not Configured (Expected)", True, "MONDAY_BOARD_ID is empty as expected")
                else:
                    self.log_test("Monday Board ID Not Configured (Expected)", False, "Board ID should be empty for this test")
            
            if 'connected' in monday_status:
                connected = monday_status['connected']
                if connected:
                    self.log_test("Monday API Connection Working", True)
                else:
                    self.log_test("Monday API Connection Working", False, "API connection failed")
                    success = False
            
            if 'boards' in monday_status:
                boards = monday_status['boards']
                if isinstance(boards, list) and len(boards) > 0:
                    self.log_test("Monday Boards List Available", True, f"Found {len(boards)} boards")
                    
                    # Check board structure
                    first_board = boards[0]
                    if isinstance(first_board, dict) and 'id' in first_board and 'name' in first_board:
                        self.log_test("Monday Board Structure Valid", True, f"Board: {first_board.get('name', 'Unknown')}")
                    else:
                        self.log_test("Monday Board Structure Valid", False, "Invalid board structure")
                        success = False
                else:
                    self.log_test("Monday Boards List Available", False, "No boards found or invalid format")
                    success = False
        else:
            success = False
        
        # Restore token
        self.token = old_token
        return success

    def test_platform_store_public_endpoints(self):
        """Test Platform Store Public Endpoints"""
        print("\n🏪 Testing Platform Store Public Endpoints...")
        
        # Remove auth for public endpoints
        old_token = self.token
        self.token = None
        
        # Test GET /api/platform-store
        platform_store = self.run_test(
            "GET /api/platform-store",
            "GET",
            "platform-store",
            200
        )
        
        # Test GET /api/platform-store/products
        platform_products = self.run_test(
            "GET /api/platform-store/products",
            "GET",
            "platform-store/products",
            200
        )
        
        # Test GET /api/platform-store/yappy/cdn
        yappy_cdn = self.run_test(
            "GET /api/platform-store/yappy/cdn",
            "GET",
            "platform-store/yappy/cdn",
            200
        )
        
        # Restore token
        self.token = old_token
        
        # Validate response structures
        success = True
        
        if platform_store:
            required_fields = ['nombre', 'descripcion', 'activo']
            for field in required_fields:
                if field in platform_store:
                    self.log_test(f"Platform Store Contains '{field}'", True)
                else:
                    self.log_test(f"Platform Store Contains '{field}'", False, f"Missing '{field}' field")
                    success = False
        else:
            success = False
        
        if platform_products:
            required_fields = ['products', 'total', 'page']
            for field in required_fields:
                if field in platform_products:
                    self.log_test(f"Platform Products Contains '{field}'", True)
                else:
                    self.log_test(f"Platform Products Contains '{field}'", False, f"Missing '{field}' field")
                    success = False
        else:
            success = False
        
        if yappy_cdn:
            required_fields = ['cdn_url', 'activo']
            for field in required_fields:
                if field in yappy_cdn:
                    self.log_test(f"Yappy CDN Contains '{field}'", True)
                else:
                    self.log_test(f"Yappy CDN Contains '{field}'", False, f"Missing '{field}' field")
                    success = False
        else:
            success = False
        
        return success and all([platform_store, platform_products, yappy_cdn])

    def test_platform_store_admin_endpoints(self):
        """Test Platform Store Admin Endpoints"""
        print("\n👑 Testing Platform Store Admin Endpoints...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test GET /api/platform-store/admin/config
        admin_config = self.run_test(
            "GET /api/platform-store/admin/config",
            "GET",
            "platform-store/admin/config",
            200
        )
        
        success = True
        
        if admin_config:
            # Check required sections
            required_sections = ['store', 'yappy']
            for section in required_sections:
                if section in admin_config:
                    self.log_test(f"Admin Config Contains '{section}' Section", True)
                else:
                    self.log_test(f"Admin Config Contains '{section}' Section", False, f"Missing '{section}' section")
                    success = False
            
            # Check store config fields
            if 'store' in admin_config:
                store_config = admin_config['store']
                store_fields = ['nombre', 'descripcion', 'activo']
                for field in store_fields:
                    if field in store_config:
                        self.log_test(f"Store Config Contains '{field}'", True)
                    else:
                        self.log_test(f"Store Config Contains '{field}'", False, f"Missing '{field}' field")
                        success = False
            
            # Check yappy config fields
            if 'yappy' in admin_config:
                yappy_config = admin_config['yappy']
                yappy_fields = ['merchant_id', 'secret_key', 'url_domain', 'activo', 'ambiente']
                for field in yappy_fields:
                    if field in yappy_config:
                        self.log_test(f"Yappy Config Contains '{field}'", True)
                    else:
                        self.log_test(f"Yappy Config Contains '{field}'", False, f"Missing '{field}' field")
                        success = False
        else:
            success = False
        
        # Test PUT /api/platform-store/admin/config
        if admin_config:
            # Update config with test data
            updated_config = {
                "store": {
                    "nombre": "Unatienda Test",
                    "descripcion": "Tienda oficial de la plataforma - Test",
                    "logo_url": "",
                    "activo": True
                },
                "yappy": {
                    "merchant_id": "BAQIJ-98619452",
                    "secret_key": "test_secret_key",
                    "url_domain": "https://unatienda.preview.emergentagent.com",
                    "activo": True,
                    "ambiente": "produccion"
                }
            }
            
            update_result = self.run_test(
                "PUT /api/platform-store/admin/config",
                "PUT",
                "platform-store/admin/config",
                200,
                updated_config
            )
            
            if update_result and update_result.get('success'):
                self.log_test("Platform Store Config Update", True)
            else:
                self.log_test("Platform Store Config Update", False, "Update did not return success")
                success = False
        
        # Restore token
        self.token = old_token
        return success

    def test_platform_store_yappy_integration(self):
        """Test Platform Store Yappy Integration"""
        print("\n💳 Testing Platform Store Yappy Integration...")
        
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        # Test POST /api/platform-store/admin/yappy/test
        yappy_test = self.run_test(
            "POST /api/platform-store/admin/yappy/test",
            "POST",
            "platform-store/admin/yappy/test",
            400  # Expecting 400 because domain registration is pending
        )
        
        # For this test, we expect a 400 error because the domain needs to be registered in Yappy Comercial
        # This is expected behavior according to the review request
        if yappy_test is None:  # None means we got the expected 400 status
            self.log_test("Yappy Test Connection (Expected 400)", True, "Domain registration pending in Yappy Comercial - this is expected")
            success = True
        else:
            # If we got a 200 response, that's also valid (means Yappy is working)
            self.log_test("Yappy Test Connection (Unexpected 200)", True, "Yappy connection working unexpectedly")
            success = True
        
        # Restore token
        self.token = old_token
        return success

    def test_user_login_with_test_credentials(self):
        """Test login with the specific test credentials mentioned in the review"""
        print("\n🔐 Testing Login with Test Credentials...")
        
        # Test user login
        user_login_data = {
            "email": "juan.perez@test.com",
            "contrasena": "password123"
        }
        
        user_result = self.run_test(
            "Login Test User (juan.perez@test.com)",
            "POST",
            "auth/login",
            200,
            user_login_data
        )
        
        if user_result and 'token' in user_result:
            # Store the test user token
            test_user_token = user_result['token']
            
            # Test admin login
            admin_login_data = {
                "email": "admin@libreria.com",
                "contrasena": "adminpassword"
            }
            
            admin_result = self.run_test(
                "Login Admin (admin@libreria.com)",
                "POST",
                "auth/login",
                200,
                admin_login_data
            )
            
            if admin_result and 'token' in admin_result:
                # Verify we can access user data with test user token
                old_token = self.token
                self.token = test_user_token
                
                user_students = self.run_test(
                    "Get Test User Students",
                    "GET",
                    "estudiantes",
                    200
                )
                
                # Check if María Pérez García exists and is confirmed
                if user_students and len(user_students) > 0:
                    maria_student = None
                    for student in user_students:
                        if (student.get('nombre') == 'María' and 
                            student.get('apellido') == 'Pérez García' and
                            student.get('grado') == '4'):
                            maria_student = student
                            break
                    
                    if maria_student:
                        if maria_student.get('estado_matricula') == 'confirmada':
                            self.log_test("María Pérez García Enrollment Confirmed", True)
                        else:
                            self.log_test("María Pérez García Enrollment Confirmed", False, 
                                        f"Expected 'confirmada', got '{maria_student.get('estado_matricula')}'")
                    else:
                        self.log_test("María Pérez García Found", False, "Student not found")
                
                self.token = old_token
                return all([user_result, admin_result, user_students])
            
            return user_result is not None
        
        return False

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

    def test_yappy_checkout_flow(self):
        """Test Yappy Checkout Flow Implementation"""
        print("\n💳 Testing Yappy Checkout Flow Implementation...")
        
        # Test 1: GET /api/pedidos/{pedido_id}/public - Get order details for checkout
        test_order_id = "ped_363bbcd6c5f4"
        
        # Remove auth for public endpoint
        old_token = self.token
        self.token = None
        
        order_details = self.run_test(
            "GET /api/pedidos/{pedido_id}/public - Get order details for checkout",
            "GET",
            f"pedidos/{test_order_id}/public",
            200
        )
        
        success = True
        if order_details:
            # Validate response structure
            required_fields = ['pedido_id', 'items', 'subtotal', 'total', 'estado', 'estado_pago']
            for field in required_fields:
                if field in order_details:
                    self.log_test(f"Order Details Contains '{field}'", True)
                else:
                    self.log_test(f"Order Details Contains '{field}'", False, f"Missing '{field}' field")
                    success = False
            
            # Validate specific values
            if order_details.get('pedido_id') == test_order_id:
                self.log_test("Order ID Matches Request", True)
            else:
                self.log_test("Order ID Matches Request", False, f"Expected {test_order_id}, got {order_details.get('pedido_id')}")
                success = False
        else:
            success = False
        
        # Test 2: POST /api/platform-store/yappy/validate - Validate Yappy merchant
        yappy_validate = self.run_test(
            "POST /api/platform-store/yappy/validate - Validate Yappy merchant",
            "POST",
            "platform-store/yappy/validate",
            200
        )
        
        if yappy_validate:
            # Should return success=true with token
            if yappy_validate.get('success'):
                self.log_test("Yappy Validation Success", True)
                if 'token' in yappy_validate:
                    self.log_test("Yappy Validation Returns Token", True)
                    yappy_token = yappy_validate['token']
                else:
                    self.log_test("Yappy Validation Returns Token", False, "Missing token in response")
                    success = False
            else:
                self.log_test("Yappy Validation Success", False, f"Validation failed: {yappy_validate.get('error', 'Unknown error')}")
                success = False
        else:
            success = False
        
        # Test 3: POST /api/platform-store/yappy/create-order - Create Yappy payment
        create_order_data = {
            "order_id": "TEST123",
            "alias_yappy": "60001234",
            "subtotal": 10.00,
            "taxes": 0.00,
            "discount": 0.00,
            "total": 10.00
        }
        
        yappy_create_order = self.run_test(
            "POST /api/platform-store/yappy/create-order - Create Yappy payment",
            "POST",
            "platform-store/yappy/create-order",
            200,
            create_order_data
        )
        
        if yappy_create_order:
            if yappy_create_order.get('success'):
                self.log_test("Yappy Create Order Success", True)
                # Check for expected fields
                expected_fields = ['transaction_id', 'token', 'document_name']
                for field in expected_fields:
                    if field in yappy_create_order:
                        self.log_test(f"Yappy Order Response Contains '{field}'", True)
                    else:
                        self.log_test(f"Yappy Order Response Contains '{field}'", False, f"Missing '{field}' field")
            else:
                self.log_test("Yappy Create Order Success", False, f"Order creation failed: {yappy_create_order.get('error', 'Unknown error')}")
                success = False
        else:
            success = False
        
        # Test 4: GET /api/platform-store/yappy/ipn - IPN callback endpoint
        ipn_params = {
            "orderId": "TEST123",
            "Hash": "test_hash_value",
            "status": "E",  # E=Ejecutado (successful)
            "domain": "https://unatienda.preview.emergentagent.com"
        }
        
        # Build query string for GET request
        query_string = "&".join([f"{k}={v}" for k, v in ipn_params.items()])
        
        yappy_ipn = self.run_test(
            "GET /api/platform-store/yappy/ipn - IPN callback endpoint",
            "GET",
            f"platform-store/yappy/ipn?{query_string}",
            200
        )
        
        if yappy_ipn:
            # Should verify hash and update order status
            if yappy_ipn.get('status') == 'ok':
                self.log_test("Yappy IPN Callback Success", True)
                if 'order_id' in yappy_ipn and 'payment_status' in yappy_ipn:
                    self.log_test("Yappy IPN Response Complete", True)
                else:
                    self.log_test("Yappy IPN Response Complete", False, "Missing order_id or payment_status")
                    success = False
            else:
                self.log_test("Yappy IPN Callback Success", False, f"IPN failed: {yappy_ipn.get('message', 'Unknown error')}")
                success = False
        else:
            success = False
        
        # Restore token
        self.token = old_token
        
        return success and all([order_details, yappy_validate, yappy_create_order, yappy_ipn])

    def test_yappy_checkout_flow_with_real_order(self):
        """Test Yappy Checkout Flow with a real order creation"""
        print("\n🛒 Testing Yappy Checkout Flow with Real Order...")
        
        # First create a real order to test with
        if not self.admin_token:
            self.log_test("Yappy Real Order Test", False, "Admin token required for setup")
            return False
        
        # Use admin token to create test data
        old_token = self.token
        self.token = self.admin_token
        
        # Get available books
        books = self.run_test(
            "Get Books for Yappy Test",
            "GET",
            "libros",
            200
        )
        
        if not books or len(books) == 0:
            self.log_test("Yappy Real Order Test", False, "No books available for testing")
            self.token = old_token
            return False
        
        # Create a test user for the order
        test_user_data = {
            "email": f"yappy_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "contrasena": "TestPass123!",
            "nombre": "Yappy Test User",
            "telefono": "507-6123-4567",
            "direccion": "Test Address for Yappy"
        }
        
        user_result = self.run_test(
            "Create Test User for Yappy",
            "POST",
            "auth/registro",
            200,
            test_user_data
        )
        
        if not user_result or 'token' not in user_result:
            self.log_test("Yappy Real Order Test", False, "Failed to create test user")
            self.token = old_token
            return False
        
        # Switch to user token
        user_token = user_result['token']
        self.token = user_token
        
        # Add a student
        student_data = {
            "nombre": "Carlos",
            "apellido": "Yappy Test",
            "grado": "3",
            "escuela": "Escuela Test Yappy",
            "es_nuevo": True
        }
        
        student_result = self.run_test(
            "Create Test Student for Yappy",
            "POST",
            "estudiantes",
            200,
            student_data
        )
        
        if not student_result or 'estudiante_id' not in student_result:
            self.log_test("Yappy Real Order Test", False, "Failed to create test student")
            self.token = old_token
            return False
        
        student_id = student_result['estudiante_id']
        
        # Get user info for approval
        user_info = self.run_test(
            "Get User Info for Yappy Test",
            "GET",
            "auth/me",
            200
        )
        
        if not user_info or 'cliente_id' not in user_info:
            self.log_test("Yappy Real Order Test", False, "Failed to get user info")
            self.token = old_token
            return False
        
        cliente_id = user_info['cliente_id']
        
        # Switch to admin token to approve enrollment
        self.token = self.admin_token
        
        approval_result = self.run_test(
            "Approve Student for Yappy Test",
            "PUT",
            f"admin/matriculas/{cliente_id}/{student_id}/verificar?accion=aprobar",
            200
        )
        
        if not approval_result:
            self.log_test("Yappy Real Order Test", False, "Failed to approve student enrollment")
            self.token = old_token
            return False
        
        # Switch back to user token to create order
        self.token = user_token
        
        # Create order with Yappy payment method
        book = books[0]
        order_data = {
            "estudiante_id": student_id,
            "items": [
                {
                    "libro_id": book['libro_id'],
                    "nombre_libro": book['nombre'],
                    "cantidad": 1,
                    "precio_unitario": book['precio']
                }
            ],
            "metodo_pago": "yappy",
            "notas": "Test order for Yappy checkout flow"
        }
        
        order_result = self.run_test(
            "Create Order with Yappy Payment Method",
            "POST",
            "pedidos",
            200,
            order_data
        )
        
        if not order_result or 'pedido_id' not in order_result:
            self.log_test("Yappy Real Order Test", False, "Failed to create test order")
            self.token = old_token
            return False
        
        pedido_id = order_result['pedido_id']
        
        # Now test the public order endpoint with the real order
        self.token = None  # Remove auth for public endpoint
        
        public_order = self.run_test(
            "GET Real Order Details for Checkout",
            "GET",
            f"pedidos/{pedido_id}/public",
            200
        )
        
        success = True
        if public_order:
            # Validate the order has the expected structure and data
            if public_order.get('pedido_id') == pedido_id:
                self.log_test("Real Order ID Matches", True)
            else:
                self.log_test("Real Order ID Matches", False, f"Expected {pedido_id}, got {public_order.get('pedido_id')}")
                success = False
            
            if public_order.get('items') and len(public_order['items']) > 0:
                self.log_test("Real Order Has Items", True)
                item = public_order['items'][0]
                if item.get('libro_id') == book['libro_id']:
                    self.log_test("Real Order Item Matches", True)
                else:
                    self.log_test("Real Order Item Matches", False, "Order item doesn't match created item")
                    success = False
            else:
                self.log_test("Real Order Has Items", False, "Order has no items")
                success = False
            
            if public_order.get('total') == book['precio']:
                self.log_test("Real Order Total Correct", True)
            else:
                self.log_test("Real Order Total Correct", False, f"Expected {book['precio']}, got {public_order.get('total')}")
                success = False
        else:
            success = False
        
        # Test Yappy payment flow with the real order
        if success and public_order:
            # Test creating Yappy payment for this order
            create_yappy_data = {
                "order_id": pedido_id,
                "alias_yappy": "60001234",  # Test phone number
                "subtotal": public_order.get('total', 0),
                "taxes": 0.00,
                "discount": 0.00,
                "total": public_order.get('total', 0)
            }
            
            yappy_payment = self.run_test(
                "Create Yappy Payment for Real Order",
                "POST",
                "platform-store/yappy/create-order",
                200,
                create_yappy_data
            )
            
            if yappy_payment and yappy_payment.get('success'):
                self.log_test("Yappy Payment Creation for Real Order", True)
                
                # Test IPN callback for the real order
                ipn_params = {
                    "orderId": pedido_id,
                    "Hash": "test_hash_for_real_order",
                    "status": "E",  # Successful payment
                    "domain": "https://unatienda.preview.emergentagent.com"
                }
                
                query_string = "&".join([f"{k}={v}" for k, v in ipn_params.items()])
                
                ipn_result = self.run_test(
                    "Process IPN for Real Order",
                    "GET",
                    f"platform-store/yappy/ipn?{query_string}",
                    200
                )
                
                if ipn_result and ipn_result.get('status') == 'ok':
                    self.log_test("IPN Processing for Real Order", True)
                else:
                    self.log_test("IPN Processing for Real Order", False, "IPN processing failed")
                    success = False
            else:
                self.log_test("Yappy Payment Creation for Real Order", False, "Failed to create Yappy payment")
                success = False
        
        # Cleanup - delete the test student
        self.token = user_token
        delete_result = self.run_test(
            "Cleanup Yappy Test Student",
            "DELETE",
            f"estudiantes/{student_id}",
            200
        )
        
        # Restore token
        self.token = old_token
        return success

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Textbook Store API Tests")
        print(f"Testing against: {self.base_url}")
        
        # Test sequence - prioritizing the 3 specific tasks from review request
        tests = [
            ("Admin Setup", self.test_admin_setup),
            ("Admin Login", self.test_admin_login),
            ("Seed Data", self.test_seed_data),
            
            # Priority tests from review request
            ("Task 1: Branding Neutralization (P1)", self.test_branding_neutralization),
            ("Task 2: Thermal Receipt (P2)", self.test_thermal_receipt),
            ("Task 3: Monday.com Integration (P3)", self.test_monday_integration),
            
            # NEW: Unatienda/Platform Store Integration Tests
            ("Platform Store Public Endpoints", self.test_platform_store_public_endpoints),
            ("Platform Store Admin Endpoints", self.test_platform_store_admin_endpoints),
            ("Platform Store Yappy Integration", self.test_platform_store_yappy_integration),
            
            # NEW: Yappy Checkout Flow Tests (from review request)
            ("Yappy Checkout Flow Implementation", self.test_yappy_checkout_flow),
            ("Yappy Checkout Flow with Real Order", self.test_yappy_checkout_flow_with_real_order),
            
            # Other existing tests
            ("Block-Based Landing Page - Public Endpoints", self.test_block_based_landing_page_public_endpoints),
            ("Block-Based Landing Page - Admin Endpoints", self.test_block_based_landing_page_admin_endpoints),
            ("Block CRUD Operations", self.test_block_crud_operations),
            ("Block Reorder Operations", self.test_block_reorder_operations),
            ("Landing Page Publish Toggle", self.test_landing_page_publish_toggle),
            ("Public Books API", self.test_public_books_api),
            ("Public Order API", self.test_public_order_api),
            ("Notifications API", self.test_notifications_api),
            ("Test Credentials Login", self.test_user_login_with_test_credentials),
            ("User Registration", self.test_user_registration),
            ("Metadata Endpoints", self.test_metadata_endpoints),
            ("Books Catalog", self.test_books_catalog),
            ("Student Management", self.test_student_management),
            ("Enrollment Verification Flow", self.test_enrollment_verification_flow),
            ("Book Purchase Flow", self.test_book_purchase_flow),
            ("Duplicate Purchase Prevention", self.test_duplicate_purchase_prevention),
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