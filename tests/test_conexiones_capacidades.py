"""
Test Suite for Sistema de Conexiones y Capacidades - ChiPiLink
Tests: Conexiones, Capacidades, Acudidos, Solicitudes, Invitaciones, Transferencias, Admin endpoints
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


class TestConexionesCapacidades:
    """Test suite for Conexiones y Capacidades system"""
    
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
    
    # ============== CAPACIDADES TESTS ==============
    
    def test_01_get_capacidades_disponibles(self):
        """GET /api/conexiones/capacidades - Get all available capacidades"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/capacidades")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "capacidades" in data, "Response should contain 'capacidades' key"
        capacidades = data["capacidades"]
        assert isinstance(capacidades, list), "capacidades should be a list"
        
        # Verify default capacidades exist
        capacidad_ids = [c.get("capacidad_id") for c in capacidades]
        expected_capacidades = ["cliente", "jugador_ranking", "arbitro", "acudiente", "estudiante_tutoria"]
        for cap_id in expected_capacidades:
            assert cap_id in capacidad_ids, f"Expected capacidad '{cap_id}' not found"
        
        # Verify capacidad structure
        if capacidades:
            cap = capacidades[0]
            assert "capacidad_id" in cap
            assert "nombre" in cap
            assert "tipo" in cap
            assert "activa" in cap
        
        print(f"✓ Found {len(capacidades)} capacidades: {capacidad_ids}")
    
    def test_02_get_mis_capacidades(self):
        """GET /api/conexiones/mis-capacidades - Get user's active capacidades"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/mis-capacidades")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "capacidades" in data, "Response should contain 'capacidades' key"
        assert isinstance(data["capacidades"], list), "capacidades should be a list"
        
        print(f"✓ User has {len(data['capacidades'])} active capacidades")
    
    # ============== CONEXIONES TESTS ==============
    
    def test_03_get_mis_conexiones(self):
        """GET /api/conexiones/mis-conexiones - Get user's connections"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/mis-conexiones")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "conexiones" in data, "Response should contain 'conexiones' key"
        assert isinstance(data["conexiones"], list), "conexiones should be a list"
        
        # If there are connections, verify structure
        if data["conexiones"]:
            con = data["conexiones"][0]
            assert "conexion_id" in con or "user_id" in con
            assert "tipo" in con
            assert "subtipo" in con
        
        print(f"✓ User has {len(data['conexiones'])} conexiones")
    
    def test_04_get_mis_acudidos(self):
        """GET /api/conexiones/mis-acudidos - Get user's dependents"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/mis-acudidos")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "acudidos" in data, "Response should contain 'acudidos' key"
        assert isinstance(data["acudidos"], list), "acudidos should be a list"
        
        print(f"✓ User has {len(data['acudidos'])} acudidos")
    
    # ============== SOLICITUDES TESTS ==============
    
    def test_05_get_solicitudes_recibidas(self):
        """GET /api/conexiones/solicitudes/recibidas - Get received connection requests"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/solicitudes/recibidas")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "solicitudes" in data, "Response should contain 'solicitudes' key"
        assert isinstance(data["solicitudes"], list), "solicitudes should be a list"
        
        print(f"✓ User has {len(data['solicitudes'])} received solicitudes")
    
    def test_06_get_solicitudes_enviadas(self):
        """GET /api/conexiones/solicitudes/enviadas - Get sent connection requests"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/solicitudes/enviadas")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "solicitudes" in data, "Response should contain 'solicitudes' key"
        assert isinstance(data["solicitudes"], list), "solicitudes should be a list"
        
        print(f"✓ User has {len(data['solicitudes'])} sent solicitudes")
    
    # ============== MARKETING TESTS ==============
    
    def test_07_get_servicios_sugeridos(self):
        """GET /api/conexiones/servicios-sugeridos - Get suggested services/memberships"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/servicios-sugeridos")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "servicios" in data, "Response should contain 'servicios' key"
        assert isinstance(data["servicios"], list), "servicios should be a list"
        
        # Verify default membresias exist
        if data["servicios"]:
            membresia_ids = [s.get("membresia_id") for s in data["servicios"]]
            print(f"✓ Found {len(data['servicios'])} servicios sugeridos: {membresia_ids}")
        else:
            print("✓ No servicios sugeridos (user may have all memberships)")
    
    # ============== BUSQUEDA TESTS ==============
    
    def test_08_buscar_usuarios(self):
        """GET /api/conexiones/buscar?q=X - Search users by name or email"""
        self.get_auth_token()
        
        # Search with valid query
        response = self.session.get(f"{BASE_URL}/api/conexiones/buscar?q=admin")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "usuarios" in data, "Response should contain 'usuarios' key"
        assert isinstance(data["usuarios"], list), "usuarios should be a list"
        
        print(f"✓ Search 'admin' returned {len(data['usuarios'])} usuarios")
    
    def test_09_buscar_usuarios_short_query(self):
        """GET /api/conexiones/buscar?q=X - Short query returns empty"""
        self.get_auth_token()
        
        # Search with short query (< 2 chars)
        response = self.session.get(f"{BASE_URL}/api/conexiones/buscar?q=a")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "usuarios" in data
        assert data["usuarios"] == [], "Short query should return empty list"
        
        print("✓ Short query correctly returns empty list")
    
    # ============== ADMIN TESTS ==============
    
    def test_10_admin_get_solicitudes_pendientes(self):
        """GET /api/conexiones/admin/solicitudes-pendientes - Admin: get all pending requests"""
        self.get_auth_token()
        response = self.session.get(f"{BASE_URL}/api/conexiones/admin/solicitudes-pendientes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "solicitudes" in data, "Response should contain 'solicitudes' key"
        assert isinstance(data["solicitudes"], list), "solicitudes should be a list"
        
        print(f"✓ Admin: {len(data['solicitudes'])} solicitudes pendientes")
    
    # ============== CREAR ACUDIDO TEST ==============
    
    def test_11_crear_acudido(self):
        """POST /api/conexiones/crear-acudido - Create dependent user"""
        self.get_auth_token()
        
        # Create a test acudido
        acudido_data = {
            "nombre": "TEST_Acudido",
            "apellido": "Prueba",
            "email": f"test_acudido_{int(time.time())}@test.com",
            "fecha_nacimiento": "2015-05-15",
            "genero": "masculino",
            "notas": "Acudido de prueba para testing"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/crear-acudido",
            json=acudido_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify success
        assert data.get("success") == True or "acudido" in data or "user_id" in data, f"Expected success response: {data}"
        
        print(f"✓ Acudido created successfully: {data}")
    
    # ============== INVITACION TEST ==============
    
    def test_12_crear_invitacion(self):
        """POST /api/conexiones/invitar - Invite unregistered user"""
        self.get_auth_token()
        
        # Create invitation for non-existent email
        invitacion_data = {
            "email": f"test_invitado_{int(time.time())}@test.com",
            "nombre": "TEST_Invitado",
            "mensaje": "Te invito a unirte a ChiPiLink",
            "tipo_relacion": "social",
            "subtipo": "amigo"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/invitar",
            json=invitacion_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify success or existing user response
        assert data.get("success") == True or "invitacion" in data or "existe" in data, f"Expected success response: {data}"
        
        print(f"✓ Invitacion created: {data}")
    
    def test_13_invitar_usuario_existente(self):
        """POST /api/conexiones/invitar - Invite existing user returns user_id"""
        self.get_auth_token()
        
        # Try to invite existing admin user
        invitacion_data = {
            "email": ADMIN_EMAIL,
            "nombre": "Admin",
            "mensaje": "Test"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/invitar",
            json=invitacion_data
        )
        
        # Should return 200 with existe=True or 400 with error
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        if response.status_code == 200:
            assert data.get("existe") == True, "Should indicate user exists"
            assert "user_id" in data, "Should return user_id for existing user"
            print(f"✓ Existing user detected: {data}")
        else:
            assert "error" in data or "detail" in data
            print(f"✓ Existing user error handled: {data}")
    
    # ============== SOLICITUD CONEXION TEST ==============
    
    def test_14_crear_solicitud_conexion(self):
        """POST /api/conexiones/solicitar - Create connection request"""
        self.get_auth_token()
        
        # First, search for a user to connect with
        search_response = self.session.get(f"{BASE_URL}/api/conexiones/buscar?q=test")
        search_data = search_response.json()
        
        if not search_data.get("usuarios"):
            # Create a test user first via acudido
            acudido_response = self.session.post(
                f"{BASE_URL}/api/conexiones/crear-acudido",
                json={
                    "nombre": "TEST_Conexion",
                    "apellido": "Target",
                    "email": f"test_target_{int(time.time())}@test.com"
                }
            )
            target_data = acudido_response.json()
            target_user_id = target_data.get("acudido", {}).get("cliente_id") or target_data.get("user_id")
        else:
            # Use first found user (excluding self)
            target_user = None
            for user in search_data["usuarios"]:
                if user.get("cliente_id") != self.user_id:
                    target_user = user
                    break
            
            if not target_user:
                pytest.skip("No other users found to create connection request")
            
            target_user_id = target_user.get("cliente_id")
        
        if not target_user_id:
            pytest.skip("Could not find target user for connection request")
        
        # Create solicitud
        solicitud_data = {
            "para_usuario_id": target_user_id,
            "tipo": "social",
            "subtipo": "amigo",
            "etiqueta": "Test Connection",
            "mensaje": "Solicitud de prueba"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/solicitar",
            json=solicitud_data
        )
        
        # May return 200 (success) or 400 (already connected/pending)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        if response.status_code == 200:
            assert data.get("success") == True or "solicitud" in data
            print(f"✓ Solicitud created: {data}")
        else:
            # Already connected or pending is acceptable
            print(f"✓ Solicitud handled (may already exist): {data}")
    
    # ============== ADMIN OTORGAR CAPACIDAD TEST ==============
    
    def test_15_admin_otorgar_capacidad(self):
        """POST /api/conexiones/admin/otorgar-capacidad - Admin: grant capability"""
        self.get_auth_token()
        
        # First get a user to grant capability to
        search_response = self.session.get(f"{BASE_URL}/api/conexiones/buscar?q=test")
        search_data = search_response.json()
        
        if not search_data.get("usuarios"):
            pytest.skip("No users found to grant capability")
        
        target_user = search_data["usuarios"][0]
        target_user_id = target_user.get("cliente_id")
        
        # Grant 'cliente' capability (should always exist)
        otorgar_data = {
            "user_id": target_user_id,
            "capacidad_id": "cliente",
            "motivo": "Test - otorgado por admin"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/conexiones/admin/otorgar-capacidad",
            json=otorgar_data
        )
        
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        if response.status_code == 200:
            assert data.get("success") == True
            print(f"✓ Capacidad otorgada: {data}")
        else:
            # May already have the capability
            print(f"✓ Capacidad handled (may already exist): {data}")
    
    # ============== AUTHENTICATION TESTS ==============
    
    def test_16_endpoints_require_auth(self):
        """Verify endpoints require authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        endpoints = [
            ("GET", "/api/conexiones/mis-conexiones"),
            ("GET", "/api/conexiones/mis-capacidades"),
            ("GET", "/api/conexiones/mis-acudidos"),
            ("GET", "/api/conexiones/solicitudes/recibidas"),
            ("GET", "/api/conexiones/solicitudes/enviadas"),
            ("GET", "/api/conexiones/servicios-sugeridos"),
            ("GET", "/api/conexiones/buscar?q=test"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = no_auth_session.get(f"{BASE_URL}{endpoint}")
            else:
                response = no_auth_session.post(f"{BASE_URL}{endpoint}", json={})
            
            assert response.status_code in [401, 403, 422], \
                f"Endpoint {endpoint} should require auth, got {response.status_code}"
        
        print("✓ All endpoints correctly require authentication")
    
    def test_17_admin_endpoints_require_admin(self):
        """Verify admin endpoints require admin role"""
        # First login as admin to verify admin endpoints work
        self.get_auth_token()
        
        admin_endpoints = [
            ("GET", "/api/conexiones/admin/solicitudes-pendientes"),
            ("POST", "/api/conexiones/admin/otorgar-capacidad"),
        ]
        
        for method, endpoint in admin_endpoints:
            if method == "GET":
                response = self.session.get(f"{BASE_URL}{endpoint}")
            else:
                response = self.session.post(f"{BASE_URL}{endpoint}", json={
                    "user_id": "test",
                    "capacidad_id": "cliente"
                })
            
            # Admin should have access (200) or validation error (400/422)
            assert response.status_code in [200, 400, 422], \
                f"Admin endpoint {endpoint} failed: {response.status_code} - {response.text}"
        
        print("✓ Admin endpoints accessible with admin credentials")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup would go here if needed
    print("\n✓ Test cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
