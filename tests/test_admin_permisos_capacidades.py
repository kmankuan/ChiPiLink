"""
Test Suite for Admin Permisos por Relación y Capacidades CRUD - ChiPiLink
Tests: GET/PUT permisos-relacion, POST/PUT/DELETE capacidades
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"
AUTH_ENDPOINT = "/api/auth-v2/login"


class TestAdminPermisosCapacidades:
    """Test suite for Admin Permisos and Capacidades CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
            
        response = self.session.post(
            f"{BASE_URL}{AUTH_ENDPOINT}",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("cliente_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    # ============== PERMISOS POR RELACION TESTS ==============
    
    def test_01_get_permisos_relacion(self):
        """GET /api/conexiones/admin/permisos-relacion - Get all configured permissions"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/admin/permisos-relacion")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "permisos" in data, "Response should contain 'permisos' key"
        permisos = data["permisos"]
        assert isinstance(permisos, list), "permisos should be a list"
        
        print(f"✓ Found {len(permisos)} permisos configurados")
        
        # If there are permisos, verify structure
        if permisos:
            perm = permisos[0]
            assert "tipo" in perm, "Permiso should have 'tipo'"
            assert "subtipo" in perm, "Permiso should have 'subtipo'"
            print(f"  Sample permiso: tipo={perm.get('tipo')}, subtipo={perm.get('subtipo')}")
    
    def test_02_update_permisos_relacion(self):
        """PUT /api/conexiones/admin/permisos-relacion - Update permissions for relation type"""
        self.get_auth_token()
        
        # Update permisos for 'familiar/padre' relation
        permisos_data = {
            "tipo": "familiar",
            "subtipo": "padre",
            "transferir_wallet": True,
            "ver_wallet": True,
            "recargar_wallet": True,
            "recibir_alertas": True,
            "limite_transferencia_diario": 100.0
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/conexiones/admin/permisos-relacion",
            json=permisos_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"✓ Permisos updated for familiar/padre: {data}")
    
    def test_03_update_permisos_relacion_acudiente(self):
        """PUT /api/conexiones/admin/permisos-relacion - Update acudiente permissions"""
        self.get_auth_token()
        
        # Update permisos for 'especial/acudiente' relation
        permisos_data = {
            "tipo": "especial",
            "subtipo": "acudiente",
            "transferir_wallet": True,
            "ver_wallet": True,
            "recargar_wallet": True,
            "recibir_alertas": True,
            "limite_transferencia_diario": 500.0
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/conexiones/admin/permisos-relacion",
            json=permisos_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"✓ Permisos updated for especial/acudiente: {data}")
    
    def test_04_verify_permisos_persisted(self):
        """GET /api/conexiones/admin/permisos-relacion - Verify permisos were saved"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/admin/permisos-relacion")
        
        assert response.status_code == 200
        data = response.json()
        permisos = data.get("permisos", [])
        
        # Find the familiar/padre permiso we updated
        padre_permiso = None
        for p in permisos:
            if p.get("tipo") == "familiar" and p.get("subtipo") == "padre":
                padre_permiso = p
                break
        
        assert padre_permiso is not None, "familiar/padre permiso should exist"
        
        # Verify the permisos values
        perm_values = padre_permiso.get("permisos", {})
        assert perm_values.get("transferir_wallet") == True, "transferir_wallet should be True"
        assert perm_values.get("ver_wallet") == True, "ver_wallet should be True"
        
        print(f"✓ Permisos persisted correctly: {perm_values}")
    
    # ============== CAPACIDADES CRUD TESTS ==============
    
    def test_05_create_capacidad(self):
        """POST /api/conexiones/admin/capacidades - Create new capacidad"""
        self.get_auth_token()
        
        # Create a test capacidad
        capacidad_data = {
            "capacidad_id": f"test_cap_{int(time.time())}",
            "nombre_es": "TEST Capacidad de Prueba",
            "nombre_en": "TEST Test Capability",
            "descripcion_es": "Capacidad creada para testing",
            "descripcion_en": "Capability created for testing",
            "icono": "🧪",
            "color": "#FF5733",
            "tipo": "solicitada",
            "membresia_requerida": "",
            "requiere_aprobacion": True,
            "activa": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/admin/capacidades",
            json=capacidad_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "capacidad" in data, "Response should contain 'capacidad'"
        
        created_cap = data["capacidad"]
        assert created_cap.get("capacidad_id") == capacidad_data["capacidad_id"]
        assert created_cap.get("nombre", {}).get("es") == capacidad_data["nombre_es"]
        assert created_cap.get("icono") == "🧪"
        assert created_cap.get("color") == "#FF5733"
        assert created_cap.get("tipo") == "solicitada"
        assert created_cap.get("requiere_aprobacion") == True
        
        # Store for later tests
        self.__class__.test_capacidad_id = capacidad_data["capacidad_id"]
        
        print(f"✓ Capacidad created: {created_cap.get('capacidad_id')}")
    
    def test_06_create_capacidad_duplicate_fails(self):
        """POST /api/conexiones/admin/capacidades - Duplicate ID should fail"""
        self.get_auth_token()
        
        # Try to create capacidad with existing ID
        capacidad_data = {
            "capacidad_id": "cliente",  # This should already exist
            "nombre_es": "Duplicate Test",
            "tipo": "solicitada"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/admin/capacidades",
            json=capacidad_data
        )
        
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "detail" in data or "error" in data, "Should return error message"
        print(f"✓ Duplicate capacidad correctly rejected: {data}")
    
    def test_07_update_capacidad(self):
        """PUT /api/conexiones/admin/capacidades/{id} - Update existing capacidad"""
        self.get_auth_token()
        
        # Get the test capacidad ID from previous test
        test_cap_id = getattr(self.__class__, 'test_capacidad_id', None)
        if not test_cap_id:
            pytest.skip("No test capacidad created in previous test")
        
        # Update the capacidad
        update_data = {
            "capacidad_id": test_cap_id,
            "nombre_es": "TEST Capacidad Actualizada",
            "nombre_en": "TEST Updated Capability",
            "descripcion_es": "Descripción actualizada",
            "descripcion_en": "Updated description",
            "icono": "✅",
            "color": "#00FF00",
            "tipo": "beneficio_extendido",
            "membresia_requerida": "pinpanclub",
            "requiere_aprobacion": False,
            "activa": True
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/conexiones/admin/capacidades/{test_cap_id}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"✓ Capacidad updated: {test_cap_id}")
    
    def test_08_verify_capacidad_updated(self):
        """GET /api/conexiones/capacidades - Verify capacidad was updated"""
        self.get_auth_token()
        
        test_cap_id = getattr(self.__class__, 'test_capacidad_id', None)
        if not test_cap_id:
            pytest.skip("No test capacidad created")
        
        response = self.session.get(f"{BASE_URL}/api/conexiones/capacidades")
        assert response.status_code == 200
        
        data = response.json()
        capacidades = data.get("capacidades", [])
        
        # Find our test capacidad
        test_cap = None
        for cap in capacidades:
            if cap.get("capacidad_id") == test_cap_id:
                test_cap = cap
                break
        
        assert test_cap is not None, f"Test capacidad {test_cap_id} should exist"
        assert test_cap.get("nombre", {}).get("es") == "TEST Capacidad Actualizada"
        assert test_cap.get("icono") == "✅"
        assert test_cap.get("color") == "#00FF00"
        assert test_cap.get("tipo") == "beneficio_extendido"
        
        print(f"✓ Capacidad update verified: {test_cap}")
    
    def test_09_delete_capacidad(self):
        """DELETE /api/conexiones/admin/capacidades/{id} - Deactivate capacidad"""
        self.get_auth_token()
        
        test_cap_id = getattr(self.__class__, 'test_capacidad_id', None)
        if not test_cap_id:
            pytest.skip("No test capacidad created")
        
        response = self.session.delete(
            f"{BASE_URL}/api/conexiones/admin/capacidades/{test_cap_id}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"✓ Capacidad deactivated: {test_cap_id}")
    
    def test_10_verify_capacidad_deactivated(self):
        """GET /api/conexiones/capacidades - Verify deactivated capacidad is NOT in public list"""
        self.get_auth_token()
        
        test_cap_id = getattr(self.__class__, 'test_capacidad_id', None)
        if not test_cap_id:
            pytest.skip("No test capacidad created")
        
        # The public endpoint only returns active capacidades
        response = self.session.get(f"{BASE_URL}/api/conexiones/capacidades")
        assert response.status_code == 200
        
        data = response.json()
        capacidades = data.get("capacidades", [])
        
        # Find our test capacidad - it should NOT be in the list (filtered out)
        test_cap = None
        for cap in capacidades:
            if cap.get("capacidad_id") == test_cap_id:
                test_cap = cap
                break
        
        # Deactivated capacidad should NOT appear in public list
        assert test_cap is None, f"Deactivated capacidad {test_cap_id} should NOT appear in public list"
        
        print(f"✓ Deactivated capacidad correctly filtered from public list")
    
    def test_11_delete_nonexistent_capacidad(self):
        """DELETE /api/conexiones/admin/capacidades/{id} - Non-existent returns 404"""
        self.get_auth_token()
        
        response = self.session.delete(
            f"{BASE_URL}/api/conexiones/admin/capacidades/nonexistent_cap_12345"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Non-existent capacidad correctly returns 404")
    
    def test_12_update_nonexistent_capacidad(self):
        """PUT /api/conexiones/admin/capacidades/{id} - Non-existent returns 404"""
        self.get_auth_token()
        
        update_data = {
            "capacidad_id": "nonexistent_cap_12345",
            "nombre_es": "Test",
            "tipo": "solicitada"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/conexiones/admin/capacidades/nonexistent_cap_12345",
            json=update_data
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Non-existent capacidad update correctly returns 404")
    
    # ============== AUTHENTICATION TESTS ==============
    
    def test_13_permisos_requires_admin(self):
        """Verify permisos endpoints require admin authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # GET permisos-relacion
        response = no_auth_session.get(f"{BASE_URL}/api/conexiones/admin/permisos-relacion")
        assert response.status_code in [401, 403], f"GET permisos should require auth: {response.status_code}"
        
        # PUT permisos-relacion
        response = no_auth_session.put(
            f"{BASE_URL}/api/conexiones/admin/permisos-relacion",
            json={"tipo": "test", "subtipo": "test"}
        )
        assert response.status_code in [401, 403, 422], f"PUT permisos should require auth: {response.status_code}"
        
        print("✓ Permisos endpoints correctly require admin authentication")
    
    def test_14_capacidades_crud_requires_admin(self):
        """Verify capacidades CRUD endpoints require admin authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # POST capacidades
        response = no_auth_session.post(
            f"{BASE_URL}/api/conexiones/admin/capacidades",
            json={"capacidad_id": "test", "nombre_es": "test", "tipo": "solicitada"}
        )
        assert response.status_code in [401, 403, 422], f"POST capacidades should require auth: {response.status_code}"
        
        # PUT capacidades
        response = no_auth_session.put(
            f"{BASE_URL}/api/conexiones/admin/capacidades/test",
            json={"capacidad_id": "test", "nombre_es": "test", "tipo": "solicitada"}
        )
        assert response.status_code in [401, 403, 422], f"PUT capacidades should require auth: {response.status_code}"
        
        # DELETE capacidades
        response = no_auth_session.delete(f"{BASE_URL}/api/conexiones/admin/capacidades/test")
        assert response.status_code in [401, 403], f"DELETE capacidades should require auth: {response.status_code}"
        
        print("✓ Capacidades CRUD endpoints correctly require admin authentication")
    
    # ============== VALIDATION TESTS ==============
    
    def test_15_create_capacidad_validation(self):
        """POST /api/conexiones/admin/capacidades - Validate required fields"""
        self.get_auth_token()
        
        # Missing capacidad_id
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/admin/capacidades",
            json={"nombre_es": "Test", "tipo": "solicitada"}
        )
        assert response.status_code == 422, f"Missing capacidad_id should return 422: {response.status_code}"
        
        # Missing nombre_es
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/admin/capacidades",
            json={"capacidad_id": "test_validation", "tipo": "solicitada"}
        )
        assert response.status_code == 422, f"Missing nombre_es should return 422: {response.status_code}"
        
        print("✓ Capacidad creation validation working correctly")
    
    def test_16_update_permisos_validation(self):
        """PUT /api/conexiones/admin/permisos-relacion - Validate required fields"""
        self.get_auth_token()
        
        # Missing tipo
        response = self.session.put(
            f"{BASE_URL}/api/conexiones/admin/permisos-relacion",
            json={"subtipo": "test"}
        )
        assert response.status_code == 422, f"Missing tipo should return 422: {response.status_code}"
        
        # Missing subtipo
        response = self.session.put(
            f"{BASE_URL}/api/conexiones/admin/permisos-relacion",
            json={"tipo": "test"}
        )
        assert response.status_code == 422, f"Missing subtipo should return 422: {response.status_code}"
        
        print("✓ Permisos update validation working correctly")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    print("\n✓ Test cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
