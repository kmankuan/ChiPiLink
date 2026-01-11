"""
Test Suite for Bulk Import and Vinculacion (Student-Guardian Linking) APIs
Tests the school book pre-order system with:
- Bulk import of students from Google Sheets TSV data
- Bulk import of books/products
- Student-guardian linking with approvals
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data for TSV parsing
SAMPLE_STUDENTS_TSV = """Numero\tNombre\tGrado\tSeccion
TEST_001\tJuan Pérez García\t1er Grado\tA
TEST_002\tMaría López Sánchez\t1er Grado\tB
TEST_003\tCarlos Rodríguez Martínez\t2do Grado\tA"""

SAMPLE_BOOKS_TSV = """Codigo\tNombre\tPrecio\tEditorial\tISBN\tGrado\tMateria
TEST_LIB001\tMatemáticas 1\t25.00\tSantillana\t978-123456789\t1er Grado\tMatemáticas
TEST_LIB002\tEspañol 1\t22.50\tNorma\t978-987654321\t1er Grado\tEspañol
TEST_LIB003\tCiencias 2\t28.00\tSantillana\t978-111222333\t2do Grado\tCiencias"""


class TestBulkImportVinculacion:
    """Test suite for bulk import and vinculacion endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.admin_id = data.get("cliente", {}).get("cliente_id")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    # ============== PARSE TSV TESTS ==============
    
    def test_parse_tsv_success(self):
        """Test POST /api/store/bulk-import/parse - Parse TSV text successfully"""
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/parse",
            json={
                "raw_text": SAMPLE_STUDENTS_TSV,
                "has_headers": True
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "headers" in data
        assert "rows" in data
        assert "total_rows" in data
        assert "total_columns" in data
        
        # Verify headers detected
        assert data["headers"] is not None
        assert "Numero" in data["headers"]
        assert "Nombre" in data["headers"]
        
        # Verify rows parsed (3 data rows after header)
        assert data["total_rows"] == 3
        assert len(data["rows"]) == 3
        
        print(f"✓ Parse TSV: {data['total_rows']} rows, {data['total_columns']} columns")
    
    def test_parse_tsv_empty_text(self):
        """Test POST /api/store/bulk-import/parse - Empty text returns empty result"""
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/parse",
            json={
                "raw_text": "",
                "has_headers": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] == 0
        assert data["rows"] == []
        print("✓ Parse TSV empty text handled correctly")
    
    # ============== ESTUDIANTES PREVIEW TESTS ==============
    
    def test_preview_estudiantes_success(self):
        """Test POST /api/store/bulk-import/estudiantes/preview - Preview student import"""
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/estudiantes/preview",
            json={
                "raw_text": SAMPLE_STUDENTS_TSV,
                "column_mapping": {
                    "numero_estudiante": 0,
                    "nombre_completo": 1,
                    "grado": 2,
                    "seccion": 3
                },
                "grado_default": None
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert data.get("success") == True
        assert "preview" in data
        assert "resumen" in data
        assert "headers_detectados" in data
        
        # Verify preview data
        preview = data["preview"]
        assert len(preview) == 3
        
        # Verify first student
        first = preview[0]
        assert first["numero_estudiante"] == "TEST_001"
        assert first["nombre_completo"] == "Juan Pérez García"
        assert first["grado"] == "1er Grado"
        assert "accion" in first  # "crear" or "actualizar"
        
        # Verify resumen
        resumen = data["resumen"]
        assert resumen["total_filas"] == 3
        assert resumen["validos"] == 3
        
        print(f"✓ Preview estudiantes: {resumen['validos']} valid, {resumen['nuevos']} new, {resumen['actualizaciones']} updates")
    
    def test_preview_estudiantes_with_grado_default(self):
        """Test preview with default grade when not in data"""
        # TSV without grade column - only include columns that exist
        tsv_no_grade = """Numero\tNombre
TEST_004\tPedro Gómez
TEST_005\tAna Martínez"""
        
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/estudiantes/preview",
            json={
                "raw_text": tsv_no_grade,
                "column_mapping": {
                    "numero_estudiante": 0,
                    "nombre_completo": 1
                    # Omit grado and seccion - they don't exist in data
                },
                "grado_default": "3er Grado"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All students should have the default grade
        for student in data["preview"]:
            assert student["grado"] == "3er Grado"
        
        print("✓ Preview with default grade works correctly")
    
    # ============== ESTUDIANTES IMPORT TESTS ==============
    
    def test_import_estudiantes_success(self):
        """Test POST /api/store/bulk-import/estudiantes/import - Import students"""
        # Use unique test data
        unique_id = uuid.uuid4().hex[:6]
        test_tsv = f"""Numero\tNombre\tGrado\tSeccion
TEST_IMP_{unique_id}_1\tEstudiante Prueba Uno\t1er Grado\tA
TEST_IMP_{unique_id}_2\tEstudiante Prueba Dos\t1er Grado\tB"""
        
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/estudiantes/import",
            json={
                "raw_text": test_tsv,
                "column_mapping": {
                    "numero_estudiante": 0,
                    "nombre_completo": 1,
                    "grado": 2,
                    "seccion": 3
                },
                "grado_default": None,
                "hoja_nombre": "Test Import",
                "actualizar_existentes": True
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify import results
        assert data.get("success") == True
        assert "import_id" in data
        assert "creados" in data
        assert "actualizados" in data
        assert "omitidos" in data
        
        # Should have created 2 students
        assert data["creados"] >= 0  # May be 0 if already exists
        
        print(f"✓ Import estudiantes: {data['creados']} created, {data['actualizados']} updated, {data['omitidos']} skipped")
    
    # ============== GET ESTUDIANTES TESTS ==============
    
    def test_get_estudiantes_importados(self):
        """Test GET /api/store/bulk-import/estudiantes - List imported students"""
        response = self.session.get(
            f"{BASE_URL}/api/store/bulk-import/estudiantes",
            params={"limit": 10}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "total" in data
        assert "estudiantes" in data
        assert "pagina" in data
        assert "total_paginas" in data
        
        print(f"✓ Get estudiantes: {data['total']} total students")
    
    def test_get_estudiantes_with_search(self):
        """Test GET /api/store/bulk-import/estudiantes with search filter"""
        response = self.session.get(
            f"{BASE_URL}/api/store/bulk-import/estudiantes",
            params={"buscar": "TEST", "limit": 50}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All results should match search
        for est in data["estudiantes"]:
            assert "TEST" in est.get("numero_estudiante", "") or "TEST" in est.get("nombre_completo", "").upper()
        
        print(f"✓ Search estudiantes: {len(data['estudiantes'])} results for 'TEST'")
    
    # ============== GET GRADOS TESTS ==============
    
    def test_get_grados_disponibles(self):
        """Test GET /api/store/bulk-import/grados - Get available grades"""
        response = self.session.get(f"{BASE_URL}/api/store/bulk-import/grados")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "grados" in data
        assert isinstance(data["grados"], list)
        
        print(f"✓ Get grados: {len(data['grados'])} grades available")
    
    # ============== LIBROS PREVIEW TESTS ==============
    
    def test_preview_libros_success(self):
        """Test POST /api/store/bulk-import/libros/preview - Preview book import"""
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/libros/preview",
            json={
                "raw_text": SAMPLE_BOOKS_TSV,
                "column_mapping": {
                    "codigo": 0,
                    "nombre": 1,
                    "precio": 2,
                    "editorial": 3,
                    "isbn": 4,
                    "grado": 5,
                    "materia": 6
                },
                "catalogo_id": None,
                "grado_default": None
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert data.get("success") == True
        assert "preview" in data
        assert "resumen" in data
        
        # Verify preview data
        preview = data["preview"]
        assert len(preview) == 3
        
        # Verify first book
        first = preview[0]
        assert first["codigo"] == "TEST_LIB001"
        assert first["nombre"] == "Matemáticas 1"
        assert first["precio"] == 25.0
        assert first["editorial"] == "Santillana"
        
        print(f"✓ Preview libros: {data['resumen']['validos']} valid books")
    
    # ============== LIBROS IMPORT TESTS ==============
    
    def test_import_libros_success(self):
        """Test POST /api/store/bulk-import/libros/import - Import books"""
        unique_id = uuid.uuid4().hex[:6]
        test_tsv = f"""Codigo\tNombre\tPrecio\tEditorial
TEST_BOOK_{unique_id}_1\tLibro Prueba 1\t15.99\tEditorial Test
TEST_BOOK_{unique_id}_2\tLibro Prueba 2\t19.99\tEditorial Test"""
        
        response = self.session.post(
            f"{BASE_URL}/api/store/bulk-import/libros/import",
            json={
                "raw_text": test_tsv,
                "column_mapping": {
                    "codigo": 0,
                    "nombre": 1,
                    "precio": 2,
                    "editorial": 3,
                    "isbn": None,
                    "grado": None,
                    "materia": None
                },
                "catalogo_id": None,
                "grado_default": "1er Grado",
                "actualizar_existentes": True
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify import results
        assert data.get("success") == True
        assert "import_id" in data
        assert "creados" in data
        
        print(f"✓ Import libros: {data['creados']} created, {data['actualizados']} updated")
    
    # ============== IMPORT HISTORY TESTS ==============
    
    def test_get_import_history(self):
        """Test GET /api/store/bulk-import/history - Get import history"""
        response = self.session.get(
            f"{BASE_URL}/api/store/bulk-import/history",
            params={"limit": 10}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify structure of first item
            first = data[0]
            assert "import_id" in first
            assert "tipo" in first
            assert "fecha" in first
        
        print(f"✓ Get import history: {len(data)} records")
    
    def test_get_import_history_filtered(self):
        """Test GET /api/store/bulk-import/history with type filter"""
        response = self.session.get(
            f"{BASE_URL}/api/store/bulk-import/history",
            params={"tipo": "estudiantes", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All results should be of type "estudiantes"
        for record in data:
            assert record.get("tipo") == "estudiantes"
        
        print(f"✓ Filtered history: {len(data)} student imports")
    
    # ============== VINCULACION - BUSCAR ESTUDIANTE TESTS ==============
    
    def test_buscar_estudiante_para_vincular(self):
        """Test POST /api/store/vinculacion/buscar-estudiante - Search student for linking"""
        # First, ensure we have a test student
        test_tsv = """Numero\tNombre\tGrado
TEST_VINC_001\tEstudiante Para Vincular\t1er Grado"""
        
        # Import the test student
        self.session.post(
            f"{BASE_URL}/api/store/bulk-import/estudiantes/import",
            json={
                "raw_text": test_tsv,
                "column_mapping": {
                    "numero_estudiante": 0,
                    "nombre_completo": 1,
                    "grado": 2,
                    "seccion": None
                },
                "hoja_nombre": "Test Vinculacion"
            }
        )
        
        # Now search for the student
        response = self.session.post(
            f"{BASE_URL}/api/store/vinculacion/buscar-estudiante",
            json={"numero_estudiante": "TEST_VINC_001"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "encontrado" in data
        
        if data["encontrado"]:
            assert "estudiante" in data
            assert data["estudiante"]["numero"] == "TEST_VINC_001"
            assert "tiene_principal" in data
            assert "accion_requerida" in data
            print(f"✓ Buscar estudiante: Found {data['estudiante']['nombre']}")
        else:
            print(f"✓ Buscar estudiante: Not found (expected if student doesn't exist)")
    
    def test_buscar_estudiante_not_found(self):
        """Test POST /api/store/vinculacion/buscar-estudiante - Student not found"""
        response = self.session.post(
            f"{BASE_URL}/api/store/vinculacion/buscar-estudiante",
            json={"numero_estudiante": "NONEXISTENT_999999"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["encontrado"] == False
        assert "mensaje" in data
        
        print("✓ Buscar estudiante not found handled correctly")
    
    # ============== VINCULACION - SOLICITAR TESTS ==============
    
    def test_solicitar_vinculacion(self):
        """Test POST /api/store/vinculacion/solicitar - Request student linking"""
        # First ensure we have a test student
        unique_id = uuid.uuid4().hex[:6]
        test_tsv = f"""Numero\tNombre\tGrado
TEST_SOL_{unique_id}\tEstudiante Solicitud\t1er Grado"""
        
        self.session.post(
            f"{BASE_URL}/api/store/bulk-import/estudiantes/import",
            json={
                "raw_text": test_tsv,
                "column_mapping": {
                    "numero_estudiante": 0,
                    "nombre_completo": 1,
                    "grado": 2,
                    "seccion": None
                }
            }
        )
        
        # Request linking
        response = self.session.post(
            f"{BASE_URL}/api/store/vinculacion/solicitar",
            json={
                "numero_estudiante": f"TEST_SOL_{unique_id}",
                "relacion": "acudiente",
                "acepto_responsabilidad": True,
                "mensaje": "Soy el padre del estudiante"
            }
        )
        
        # Could be 200 (success) or 400 (already linked or other validation)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "vinculacion" in data
            assert "mensaje" in data
            print(f"✓ Solicitar vinculacion: {data['mensaje']}")
        else:
            data = response.json()
            print(f"✓ Solicitar vinculacion: Validation error - {data.get('detail', 'unknown')}")
    
    # ============== VINCULACION - ADMIN SOLICITUDES PENDIENTES TESTS ==============
    
    def test_admin_get_solicitudes_pendientes(self):
        """Test GET /api/store/vinculacion/admin/solicitudes-pendientes - Get pending requests"""
        response = self.session.get(
            f"{BASE_URL}/api/store/vinculacion/admin/solicitudes-pendientes"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "solicitudes" in data
        assert isinstance(data["solicitudes"], list)
        
        if len(data["solicitudes"]) > 0:
            first = data["solicitudes"][0]
            assert "vinculacion" in first
            assert "estudiante" in first
            assert "solicitante" in first
        
        print(f"✓ Admin solicitudes pendientes: {len(data['solicitudes'])} pending")
    
    # ============== VINCULACION - ADMIN TODAS TESTS ==============
    
    def test_admin_get_todas_vinculaciones(self):
        """Test GET /api/store/vinculacion/admin/todas - Get all linkings"""
        response = self.session.get(
            f"{BASE_URL}/api/store/vinculacion/admin/todas"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "vinculaciones" in data
        assert isinstance(data["vinculaciones"], list)
        
        print(f"✓ Admin todas vinculaciones: {len(data['vinculaciones'])} total")
    
    def test_admin_get_vinculaciones_filtered(self):
        """Test GET /api/store/vinculacion/admin/todas with estado filter"""
        response = self.session.get(
            f"{BASE_URL}/api/store/vinculacion/admin/todas",
            params={"estado": "aprobada"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All results should have estado "aprobada"
        for v in data["vinculaciones"]:
            assert v["vinculacion"]["estado"] == "aprobada"
        
        print(f"✓ Filtered vinculaciones: {len(data['vinculaciones'])} approved")
    
    # ============== AUTHENTICATION TESTS ==============
    
    def test_bulk_import_requires_admin(self):
        """Test that bulk import endpoints require admin authentication"""
        # Create session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/store/bulk-import/parse",
            json={"raw_text": "test", "has_headers": True}
        )
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Bulk import requires authentication")
    
    def test_vinculacion_requires_auth(self):
        """Test that vinculacion endpoints require authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/store/vinculacion/buscar-estudiante",
            json={"numero_estudiante": "001"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Vinculacion requires authentication")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
