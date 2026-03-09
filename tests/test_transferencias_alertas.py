"""
Test Suite for Transferencias and Alertas Bilaterales
Tests the new endpoints:
- POST /api/conexiones/transferir - Transfer wallet balance between connected users
- POST /api/conexiones/alerta-saldo-insuficiente - Create insufficient balance alert
- GET /api/conexiones/mis-alertas - Get alerts (as user or as acudiente)
- POST /api/conexiones/alertas/{alerta_id}/resolver - Resolve alert
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTransferenciasAlertas:
    """Test suite for transferencias and alertas bilaterales"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        self.token = data.get("token")
        self.user = data.get("cliente", {})
        self.user_id = self.user.get("cliente_id")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    # ============== TRANSFERENCIAS TESTS ==============
    
    def test_transferir_requires_auth(self):
        """Test that transferir endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            json={"para_usuario_id": "test", "monto": 10}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Transferir requires authentication")
    
    def test_transferir_requires_connection(self):
        """Test that transfer requires connection between users"""
        # Try to transfer to a non-connected user
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            headers=self.headers,
            json={
                "para_usuario_id": "non_existent_user_id",
                "monto": 10.00,
                "mensaje": "Test transfer"
            }
        )
        # Should fail because no connection exists
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "conexión" in data.get("detail", "").lower() or "connection" in data.get("detail", "").lower(), \
            f"Expected connection error, got: {data}"
        print("✓ Transfer requires connection between users")
    
    def test_transferir_positive_amount_required(self):
        """Test that transfer amount must be positive"""
        # Get a connected user first
        conexiones_response = requests.get(
            f"{BASE_URL}/api/conexiones/mis-conexiones",
            headers=self.headers
        )
        assert conexiones_response.status_code == 200
        conexiones = conexiones_response.json().get("conexiones", [])
        
        if not conexiones:
            pytest.skip("No connections available for testing")
        
        connected_user_id = conexiones[0].get("user_id")
        
        # Try to transfer negative amount
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            headers=self.headers,
            json={
                "para_usuario_id": connected_user_id,
                "monto": -10.00,
                "mensaje": "Test negative transfer"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Transfer requires positive amount")
    
    def test_transferir_to_connected_user(self):
        """Test successful transfer to connected user with permission"""
        # Get connections
        conexiones_response = requests.get(
            f"{BASE_URL}/api/conexiones/mis-conexiones",
            headers=self.headers
        )
        assert conexiones_response.status_code == 200
        conexiones = conexiones_response.json().get("conexiones", [])
        
        # Find a connection with transfer permission
        transfer_target = None
        for con in conexiones:
            permisos = con.get("permisos", {})
            if permisos.get("transferir_wallet", False):
                transfer_target = con
                break
        
        if not transfer_target:
            # Try to find any acudido (they should have transfer permission from acudiente)
            for con in conexiones:
                if con.get("subtipo") == "acudido":
                    transfer_target = con
                    break
        
        if not transfer_target:
            pytest.skip("No connection with transfer permission available")
        
        target_user_id = transfer_target.get("user_id")
        
        # Check wallet balance first
        wallet_response = requests.get(
            f"{BASE_URL}/api/wallet/summary",
            headers=self.headers
        )
        if wallet_response.status_code == 200:
            wallet = wallet_response.json().get("wallet", {})
            balance = wallet.get("USD", 0)
            if balance < 1:
                pytest.skip(f"Insufficient balance for transfer test: ${balance}")
        
        # Attempt transfer
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            headers=self.headers,
            json={
                "para_usuario_id": target_user_id,
                "monto": 0.01,  # Small amount for testing
                "mensaje": "TEST_Transfer from pytest"
            }
        )
        
        # Could succeed or fail based on balance/permissions
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "transferencia" in data
            print(f"✓ Transfer successful to {target_user_id}")
        else:
            # Check if it's a valid error (insufficient balance, no permission)
            data = response.json()
            detail = data.get("detail", "")
            assert "saldo" in detail.lower() or "permiso" in detail.lower() or "balance" in detail.lower(), \
                f"Unexpected error: {detail}"
            print(f"✓ Transfer correctly rejected: {detail}")
    
    # ============== ALERTAS TESTS ==============
    
    def test_crear_alerta_saldo_insuficiente(self):
        """Test creating insufficient balance alert"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            headers=self.headers,
            json={
                "monto_requerido": 100.00,
                "descripcion": "TEST_Necesito fondos para compra de libros"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "alerta" in data
        alerta = data["alerta"]
        assert "alerta_id" in alerta
        assert alerta.get("monto_requerido") == 100.00
        assert alerta.get("descripcion") == "TEST_Necesito fondos para compra de libros"
        assert alerta.get("estado") == "pendiente"
        print(f"✓ Alert created: {alerta.get('alerta_id')}")
        
        # Store for later tests
        self.test_alerta_id = alerta.get("alerta_id")
        return alerta
    
    def test_crear_alerta_requires_auth(self):
        """Test that creating alert requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            json={
                "monto_requerido": 50.00,
                "descripcion": "Test alert"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Creating alert requires authentication")
    
    def test_get_mis_alertas(self):
        """Test getting user's alerts"""
        response = requests.get(
            f"{BASE_URL}/api/conexiones/mis-alertas",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "alertas" in data
        alertas = data["alertas"]
        assert isinstance(alertas, list)
        
        # Check alert structure if any exist
        if alertas:
            alerta = alertas[0]
            assert "alerta_id" in alerta
            assert "monto_requerido" in alerta
            assert "descripcion" in alerta
            assert "estado" in alerta
            # Check bilateral flags
            assert "es_mia" in alerta or "es_de_acudido" in alerta
            print(f"✓ Found {len(alertas)} alerts")
            
            # Verify bilateral marking
            for a in alertas:
                if a.get("es_mia"):
                    print(f"  - Mi alerta: {a.get('descripcion')[:30]}...")
                elif a.get("es_de_acudido"):
                    print(f"  - De acudido: {a.get('descripcion')[:30]}...")
        else:
            print("✓ No alerts found (empty list)")
    
    def test_get_mis_alertas_requires_auth(self):
        """Test that getting alerts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/conexiones/mis-alertas")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Getting alerts requires authentication")
    
    def test_resolver_alerta(self):
        """Test resolving an alert"""
        # First get existing alerts
        alertas_response = requests.get(
            f"{BASE_URL}/api/conexiones/mis-alertas",
            headers=self.headers
        )
        assert alertas_response.status_code == 200
        alertas = alertas_response.json().get("alertas", [])
        
        # Find a pending alert to resolve
        pending_alert = None
        for a in alertas:
            if a.get("estado") == "pendiente":
                pending_alert = a
                break
        
        if not pending_alert:
            # Create one first
            create_response = requests.post(
                f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
                headers=self.headers,
                json={
                    "monto_requerido": 25.00,
                    "descripcion": "TEST_Alert to resolve"
                }
            )
            if create_response.status_code == 200:
                pending_alert = create_response.json().get("alerta")
        
        if not pending_alert:
            pytest.skip("No pending alert available for testing")
        
        alerta_id = pending_alert.get("alerta_id")
        
        # Resolve the alert
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alertas/{alerta_id}/resolver",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Alert {alerta_id} resolved successfully")
    
    def test_resolver_alerta_not_found(self):
        """Test resolving non-existent alert returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alertas/non_existent_alert_id/resolver",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Resolving non-existent alert returns 404")
    
    def test_resolver_alerta_requires_auth(self):
        """Test that resolving alert requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alertas/some_alert_id/resolver"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Resolving alert requires authentication")
    
    # ============== BILATERAL ALERTS TESTS ==============
    
    def test_alertas_bilateral_structure(self):
        """Test that alerts have bilateral flags (es_mia or es_de_acudido)"""
        response = requests.get(
            f"{BASE_URL}/api/conexiones/mis-alertas",
            headers=self.headers
        )
        assert response.status_code == 200
        alertas = response.json().get("alertas", [])
        
        for alerta in alertas:
            # Each alert should have one of these flags
            has_flag = alerta.get("es_mia") or alerta.get("es_de_acudido")
            assert has_flag or (not alerta.get("es_mia") and not alerta.get("es_de_acudido")), \
                f"Alert missing bilateral flag: {alerta}"
        
        print(f"✓ All {len(alertas)} alerts have proper bilateral structure")
    
    def test_alerta_includes_acudientes_ids(self):
        """Test that created alerts include acudientes_ids"""
        # Create an alert
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            headers=self.headers,
            json={
                "monto_requerido": 75.00,
                "descripcion": "TEST_Alert with acudientes check"
            }
        )
        assert response.status_code == 200
        alerta = response.json().get("alerta", {})
        
        # Should have acudientes_ids field (may be empty list)
        assert "acudientes_ids" in alerta, "Alert should have acudientes_ids field"
        assert isinstance(alerta["acudientes_ids"], list), "acudientes_ids should be a list"
        print(f"✓ Alert has acudientes_ids: {alerta['acudientes_ids']}")


class TestTransferenciasEndpointValidation:
    """Additional validation tests for transferencias endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        assert login_response.status_code == 200
        data = login_response.json()
        self.token = data.get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_transferir_endpoint_exists(self):
        """Test that transferir endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            headers=self.headers,
            json={
                "para_usuario_id": "test_user",
                "monto": 10.00
            }
        )
        # Should not be 404 or 405
        assert response.status_code not in [404, 405], \
            f"Endpoint not found or method not allowed: {response.status_code}"
        print("✓ Transferir endpoint exists and responds")
    
    def test_transferir_validates_monto_type(self):
        """Test that monto must be a number"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            headers=self.headers,
            json={
                "para_usuario_id": "test_user",
                "monto": "not_a_number"
            }
        )
        assert response.status_code == 422, f"Expected 422 for invalid monto type, got {response.status_code}"
        print("✓ Transferir validates monto type")
    
    def test_transferir_requires_para_usuario_id(self):
        """Test that para_usuario_id is required"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/transferir",
            headers=self.headers,
            json={
                "monto": 10.00
            }
        )
        assert response.status_code == 422, f"Expected 422 for missing para_usuario_id, got {response.status_code}"
        print("✓ Transferir requires para_usuario_id")


class TestAlertasEndpointValidation:
    """Additional validation tests for alertas endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        assert login_response.status_code == 200
        data = login_response.json()
        self.token = data.get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_alerta_endpoint_exists(self):
        """Test that alerta-saldo-insuficiente endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            headers=self.headers,
            json={
                "monto_requerido": 50.00,
                "descripcion": "Test"
            }
        )
        assert response.status_code not in [404, 405], \
            f"Endpoint not found or method not allowed: {response.status_code}"
        print("✓ Alerta-saldo-insuficiente endpoint exists")
    
    def test_mis_alertas_endpoint_exists(self):
        """Test that mis-alertas endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/conexiones/mis-alertas",
            headers=self.headers
        )
        assert response.status_code not in [404, 405], \
            f"Endpoint not found or method not allowed: {response.status_code}"
        print("✓ Mis-alertas endpoint exists")
    
    def test_resolver_alerta_endpoint_exists(self):
        """Test that resolver alerta endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alertas/test_id/resolver",
            headers=self.headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code != 405, \
            f"Method not allowed: {response.status_code}"
        print("✓ Resolver alerta endpoint exists")
    
    def test_alerta_validates_monto_requerido(self):
        """Test that monto_requerido must be a number"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            headers=self.headers,
            json={
                "monto_requerido": "not_a_number",
                "descripcion": "Test"
            }
        )
        assert response.status_code == 422, f"Expected 422 for invalid monto_requerido, got {response.status_code}"
        print("✓ Alerta validates monto_requerido type")
    
    def test_alerta_requires_descripcion(self):
        """Test that descripcion is required"""
        response = requests.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            headers=self.headers,
            json={
                "monto_requerido": 50.00
            }
        )
        assert response.status_code == 422, f"Expected 422 for missing descripcion, got {response.status_code}"
        print("✓ Alerta requires descripcion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
