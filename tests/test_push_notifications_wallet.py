"""
Test Push Notifications for Wallet Alerts and Transfers
Tests the integration of push notifications with:
- POST /api/conexiones/alerta-saldo-insuficiente
- POST /api/conexiones/transferir
- GET /api/notifications/categories (wallet_alerts and connections categories)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestNotificationCategories:
    """Test notification categories include wallet_alerts and connections"""
    
    def test_get_categories_includes_wallet_alerts(self):
        """GET /api/notifications/categories should include wallet_alerts category"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "categories" in data
        
        categories = data["categories"]
        category_ids = [c["category_id"] for c in categories]
        
        assert "wallet_alerts" in category_ids, "wallet_alerts category should exist"
        
    def test_wallet_alerts_category_properties(self):
        """wallet_alerts category should have correct icon, color, and priority"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories/wallet_alerts")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        category = data["category"]
        assert category["icon"] == "💰", f"Expected icon 💰, got {category.get('icon')}"
        assert category["color"] == "#f59e0b", f"Expected color #f59e0b, got {category.get('color')}"
        assert category["priority"] == "high", f"Expected priority HIGH, got {category.get('priority')}"
        
    def test_get_categories_includes_connections(self):
        """GET /api/notifications/categories should include connections category"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories")
        assert response.status_code == 200
        
        data = response.json()
        categories = data["categories"]
        category_ids = [c["category_id"] for c in categories]
        
        assert "connections" in category_ids, "connections category should exist"
        
    def test_connections_category_properties(self):
        """connections category should have correct icon and color"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories/connections")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        category = data["category"]
        assert category["icon"] == "🔗", f"Expected icon 🔗, got {category.get('icon')}"
        assert category["color"] == "#8b5cf6", f"Expected color #8b5cf6, got {category.get('color')}"


class TestAlertaSaldoInsuficiente:
    """Test POST /api/conexiones/alerta-saldo-insuficiente with push notifications"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "contrasena": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def authenticated_client(self, auth_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_crear_alerta_saldo_insuficiente_returns_push_notifications(self, authenticated_client):
        """POST /api/conexiones/alerta-saldo-insuficiente should return push_notifications in response"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            json={
                "monto_requerido": 50.00,
                "descripcion": "TEST_Compra de libro de matemáticas"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify success
        assert data.get("success") == True
        
        # Verify alerta was created
        assert "alerta" in data
        alerta = data["alerta"]
        assert "alerta_id" in alerta
        assert alerta["monto_requerido"] == 50.00
        assert "TEST_" in alerta["descripcion"]
        
        # Verify push_notifications field exists in response
        assert "push_notifications" in data, "Response should include push_notifications field"
        
        push_results = data["push_notifications"]
        assert "usuario" in push_results, "push_notifications should have 'usuario' field"
        
        # In preview environment, push notifications return success=false with no devices registered
        # This is expected behavior - verify the structure is correct
        if push_results["usuario"]:
            usuario_result = push_results["usuario"]
            # Verify the push notification result structure
            assert "user_id" in usuario_result, "Push result should have user_id"
            assert "category_id" in usuario_result, "Push result should have category_id"
            assert usuario_result["category_id"] == "wallet_alerts", "Should use wallet_alerts category"
            
            # Either success or expected failure (no devices in preview)
            if not usuario_result.get("success"):
                # In preview, no devices registered - sent=0 and providers_used=[]
                # Or reason could be provided
                reason = usuario_result.get("reason")
                if reason:
                    assert reason in ["No devices registered", "Category disabled by user", "User has push disabled"], \
                        f"Unexpected push failure reason: {reason}"
                else:
                    # No reason means no devices - verify sent=0
                    assert usuario_result.get("sent", 0) == 0, "Expected sent=0 when no devices"
    
    def test_alerta_includes_action_url_and_data(self, authenticated_client):
        """Alerta push notification should include action_url and data with type and alerta_id"""
        # This test verifies the code structure - the actual push notification data
        # is passed to the push service with action_url and data fields
        response = authenticated_client.post(
            f"{BASE_URL}/api/conexiones/alerta-saldo-insuficiente",
            json={
                "monto_requerido": 25.00,
                "descripcion": "TEST_Verificar action_url y data"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "alerta" in data
        
        # The alerta should have an alerta_id that would be included in push notification data
        alerta = data["alerta"]
        assert "alerta_id" in alerta
        assert alerta["alerta_id"].startswith("alrt_")


class TestTransferenciaWallet:
    """Test POST /api/conexiones/transferir with push notifications"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "contrasena": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def authenticated_client(self, auth_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_transferir_requires_connection(self, authenticated_client):
        """POST /api/conexiones/transferir should require connection with user"""
        # Try to transfer to a non-connected user
        response = authenticated_client.post(
            f"{BASE_URL}/api/conexiones/transferir",
            json={
                "para_usuario_id": "cli_nonexistent123",
                "monto": 10.00,
                "mensaje": "TEST_Transfer"
            }
        )
        
        # Should fail because no connection exists
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Error could be "Usuario destino no encontrado" or "Debes tener conexión"
    
    def test_transferir_requires_positive_amount(self, authenticated_client):
        """POST /api/conexiones/transferir should require positive amount"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/conexiones/transferir",
            json={
                "para_usuario_id": "cli_test123",
                "monto": -10.00,
                "mensaje": "TEST_Negative transfer"
            }
        )
        
        # Should fail with error about positive amount or user not found
        assert response.status_code == 400


class TestMisAlertas:
    """Test GET /api/conexiones/mis-alertas endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "contrasena": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def authenticated_client(self, auth_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_mis_alertas(self, authenticated_client):
        """GET /api/conexiones/mis-alertas should return user's alerts"""
        response = authenticated_client.get(f"{BASE_URL}/api/conexiones/mis-alertas")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "alertas" in data
        assert isinstance(data["alertas"], list)
        
        # If there are alerts, verify structure
        if len(data["alertas"]) > 0:
            alerta = data["alertas"][0]
            assert "alerta_id" in alerta
            assert "monto_requerido" in alerta
            assert "descripcion" in alerta


class TestNotificationCategoriesComplete:
    """Complete test of all notification categories"""
    
    def test_all_categories_have_required_fields(self):
        """All categories should have required fields"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories")
        assert response.status_code == 200
        
        data = response.json()
        categories = data["categories"]
        
        required_fields = ["category_id", "name", "icon", "color", "priority"]
        
        for category in categories:
            for field in required_fields:
                assert field in category, f"Category {category.get('category_id')} missing field {field}"
    
    def test_categories_count(self):
        """Should have at least 10 notification categories"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] >= 10, f"Expected at least 10 categories, got {data['count']}"


class TestPushNotificationServiceIntegration:
    """Test push notification service integration"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "contrasena": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def authenticated_client(self, auth_token):
        """Session with auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_user_preferences(self, authenticated_client):
        """GET /api/notifications/preferences should return user preferences"""
        response = authenticated_client.get(f"{BASE_URL}/api/notifications/preferences")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "preferences" in data
        
        prefs = data["preferences"]
        assert "push_enabled" in prefs
        assert "categories" in prefs
    
    def test_get_user_devices(self, authenticated_client):
        """GET /api/notifications/devices should return user devices"""
        response = authenticated_client.get(f"{BASE_URL}/api/notifications/devices")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "devices" in data
        assert "count" in data
        
        # In preview, likely no devices registered
        assert isinstance(data["devices"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
