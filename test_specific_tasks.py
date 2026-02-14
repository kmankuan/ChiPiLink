#!/usr/bin/env python3

import requests
import sys
import json

class SpecificTasksTester:
    def __init__(self, base_url="https://mobile-carousel-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

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
        
        if self.admin_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'

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

    def test_branding_neutralization(self):
        """Test Task 1: Branding Neutralization (P1)"""
        print("\n🏷️ Testing Task 1: Branding Neutralization (P1)...")
        
        # Remove auth for public endpoint
        old_token = self.admin_token
        self.admin_token = None
        
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
        self.admin_token = old_token
        return success

    def test_thermal_receipt_with_existing_order(self):
        """Test Task 2: Thermal Receipt (P2) with existing order"""
        print("\n🧾 Testing Task 2: Thermal Receipt (P2) with existing order...")
        
        # Get existing orders
        orders = self.run_test(
            "Get Existing Orders",
            "GET",
            "admin/pedidos",
            200
        )
        
        if not orders or len(orders) == 0:
            self.log_test("Thermal Receipt Test", False, "No existing orders found")
            return False
        
        # Find a registered user order (has cliente_id) for better testing
        registered_orders = [o for o in orders if o.get('cliente_id')]
        test_order = registered_orders[0] if registered_orders else orders[0]
        
        pedido_id = test_order['pedido_id']
        is_registered_order = bool(test_order.get('cliente_id'))
        
        # Test the receipt endpoint with admin token (admin can access any receipt)
        receipt_result = self.run_test(
            f"GET /api/pedidos/{pedido_id}/recibo",
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
                
                # Check client data based on order type
                cliente_data = receipt_result['cliente']
                if is_registered_order:
                    if cliente_data:
                        required_client_fields = ['nombre', 'email']
                        for field in required_client_fields:
                            if field in cliente_data:
                                self.log_test(f"Receipt Client Contains '{field}'", True)
                            else:
                                self.log_test(f"Receipt Client Contains '{field}'", False, f"Missing '{field}' field")
                                success = False
                    else:
                        self.log_test("Receipt Client Data for Registered Order", False, "Client data is None for registered order")
                        success = False
                else:
                    # For public orders, cliente should be None
                    if cliente_data is None:
                        self.log_test("Receipt Client Data for Public Order", True, "Client data is None as expected for public order")
                    else:
                        self.log_test("Receipt Client Data for Public Order", False, "Client data should be None for public order")
                        success = False
                        
                # Check items structure
                if 'items' in pedido_data and len(pedido_data['items']) > 0:
                    item = pedido_data['items'][0]
                    item_fields = ['libro_id', 'nombre_libro', 'cantidad', 'precio_unitario']
                    for field in item_fields:
                        if field in item:
                            self.log_test(f"Receipt Item Contains '{field}'", True)
                        else:
                            self.log_test(f"Receipt Item Contains '{field}'", False, f"Missing '{field}' field")
                            success = False
                else:
                    self.log_test("Receipt Contains Items", False, "No items found in order")
                    success = False
            else:
                self.log_test("Receipt Contains Order and Client Data", False, "Missing 'pedido' or 'cliente' fields")
                success = False
        else:
            success = False
        
        return success

    def test_monday_integration(self):
        """Test Task 3: Monday.com Integration (P3)"""
        print("\n📋 Testing Task 3: Monday.com Integration (P3)...")
        
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
        
        return success

    def run_priority_tests(self):
        """Run the 3 priority tests from the review request"""
        print("🚀 Testing 3 Priority Tasks from Review Request")
        print(f"Testing against: {self.base_url}")
        
        # Login as admin first
        if not self.test_admin_login():
            print("❌ Failed to login as admin - cannot continue")
            return False
        
        # Test the 3 priority tasks
        tests = [
            ("Task 1: Branding Neutralization (P1)", self.test_branding_neutralization),
            ("Task 2: Thermal Receipt (P2)", self.test_thermal_receipt_with_existing_order),
            ("Task 3: Monday.com Integration (P3)", self.test_monday_integration),
        ]
        
        results = {}
        for test_name, test_func in tests:
            try:
                success = test_func()
                results[test_name] = success
                if not success:
                    print(f"⚠️  {test_name} failed")
            except Exception as e:
                print(f"💥 {test_name} crashed: {str(e)}")
                results[test_name] = False
        
        # Print summary
        print(f"\n📊 Priority Tasks Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        print(f"\n🎯 Task Results:")
        for task_name, success in results.items():
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"  {status} - {task_name}")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return all(results.values())

def main():
    tester = SpecificTasksTester()
    success = tester.run_priority_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())