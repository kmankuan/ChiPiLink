"""
Dropdown Options Auto-Translate Tests
Testing the translation dictionary and Forms Manager dropdown option auto-translation feature.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "admin@libreria.com",
        "password": "admin"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def auth_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


# === Translation Dictionary Tests ===

class TestTranslationDictionary:
    """Tests for GET /api/translations/dictionary"""
    
    def test_dictionary_returns_entries(self, api_client):
        """Dictionary endpoint returns entries array"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "entries" in data, "Response should contain 'entries' key"
        assert "count" in data, "Response should contain 'count' key"
        assert data["count"] >= 100, f"Expected 100+ entries, got {data['count']}"
    
    def test_dictionary_has_options_category(self, api_client):
        """Dictionary has entries with category 'options'"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200
        
        data = response.json()
        options_entries = [e for e in data["entries"] if e.get("category") == "options"]
        assert len(options_entries) >= 30, f"Expected 30+ options entries, got {len(options_entries)}"
    
    def test_cash_translation_exists(self, api_client):
        """Cash translation exists: EN=Cash, ES=Efectivo, ZH=现金"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200
        
        data = response.json()
        cash_entry = next((e for e in data["entries"] if e.get("en", "").lower() == "cash"), None)
        assert cash_entry is not None, "Cash entry not found in dictionary"
        assert cash_entry.get("es") == "Efectivo", f"Expected ES='Efectivo', got '{cash_entry.get('es')}'"
        assert cash_entry.get("zh") == "现金", f"Expected ZH='现金', got '{cash_entry.get('zh')}'"
    
    def test_gender_translation_exists(self, api_client):
        """Gender translation exists: EN=Gender, ES=Género, ZH=性别"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200
        
        data = response.json()
        gender_entry = next((e for e in data["entries"] if e.get("en", "").lower() == "gender"), None)
        assert gender_entry is not None, "Gender entry not found in dictionary"
        assert gender_entry.get("es") == "Género", f"Expected ES='Género', got '{gender_entry.get('es')}'"
        assert gender_entry.get("zh") == "性别", f"Expected ZH='性别', got '{gender_entry.get('zh')}'"
    
    def test_male_female_translations_exist(self, api_client):
        """Male/Female dropdown option translations exist"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200
        
        data = response.json()
        entries_by_en = {e.get("en", "").lower(): e for e in data["entries"]}
        
        # Male
        male = entries_by_en.get("male")
        assert male is not None, "Male entry not found"
        assert male.get("es") == "Masculino", f"Male ES: expected 'Masculino', got '{male.get('es')}'"
        assert male.get("zh") == "男", f"Male ZH: expected '男', got '{male.get('zh')}'"
        
        # Female
        female = entries_by_en.get("female")
        assert female is not None, "Female entry not found"
        assert female.get("es") == "Femenino", f"Female ES: expected 'Femenino', got '{female.get('es')}'"
        assert female.get("zh") == "女", f"Female ZH: expected '女', got '{female.get('zh')}'"
    
    def test_yes_no_pending_translations_exist(self, api_client):
        """Yes/No/Pending dropdown option translations exist"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200
        
        data = response.json()
        entries_by_en = {e.get("en", "").lower(): e for e in data["entries"]}
        
        # Yes
        yes = entries_by_en.get("yes")
        assert yes is not None, "Yes entry not found"
        assert yes.get("es") == "Sí", f"Yes ES: expected 'Sí', got '{yes.get('es')}'"
        assert yes.get("zh") == "是", f"Yes ZH: expected '是', got '{yes.get('zh')}'"
        
        # No
        no = entries_by_en.get("no")
        assert no is not None, "No entry not found"
        assert no.get("es") == "No", f"No ES: expected 'No', got '{no.get('es')}'"
        assert no.get("zh") == "否", f"No ZH: expected '否', got '{no.get('zh')}'"
        
        # Pending
        pending = entries_by_en.get("pending")
        assert pending is not None, "Pending entry not found"
        assert pending.get("es") == "Pendiente", f"Pending ES: expected 'Pendiente', got '{pending.get('es')}'"
        assert pending.get("zh") == "待处理", f"Pending ZH: expected '待处理', got '{pending.get('zh')}'"
    
    def test_bank_transfer_translation_exists(self, api_client):
        """Bank Transfer translation exists"""
        response = api_client.get(f"{BASE_URL}/api/translations/dictionary")
        assert response.status_code == 200
        
        data = response.json()
        entry = next((e for e in data["entries"] if e.get("en", "").lower() == "bank transfer"), None)
        assert entry is not None, "Bank Transfer entry not found"
        assert entry.get("es") == "Transferencia Bancaria", f"Bank Transfer ES incorrect: {entry.get('es')}"
        assert entry.get("zh") == "银行转账", f"Bank Transfer ZH incorrect: {entry.get('zh')}"


# === Form Config Tests ===

class TestFormConfigOrderForm:
    """Tests for Order Form with Payment Method dropdown"""
    
    def test_get_order_form_fields(self, auth_client):
        """GET /api/store/form-config/admin/order_form returns fields"""
        response = auth_client.get(f"{BASE_URL}/api/store/form-config/admin/order_form?include_inactive=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "fields" in data, "Response should contain 'fields' key"
        assert len(data["fields"]) >= 4, f"Expected 4+ fields, got {len(data['fields'])}"
    
    def test_payment_method_field_exists(self, auth_client):
        """Payment Method field exists with type 'select'"""
        response = auth_client.get(f"{BASE_URL}/api/store/form-config/admin/order_form?include_inactive=true")
        assert response.status_code == 200
        
        data = response.json()
        pm_field = next((f for f in data["fields"] if f.get("field_key") == "payment_method"), None)
        assert pm_field is not None, "payment_method field not found"
        assert pm_field.get("field_type") == "select", f"Expected field_type='select', got '{pm_field.get('field_type')}'"
    
    def test_payment_method_has_4_options(self, auth_client):
        """Payment Method has 4 options: Bank Transfer, Yappy, Cash, Other"""
        response = auth_client.get(f"{BASE_URL}/api/store/form-config/admin/order_form?include_inactive=true")
        assert response.status_code == 200
        
        data = response.json()
        pm_field = next((f for f in data["fields"] if f.get("field_key") == "payment_method"), None)
        assert pm_field is not None, "payment_method field not found"
        
        options = pm_field.get("options", [])
        assert len(options) == 4, f"Expected 4 options, got {len(options)}"
        
        values = [opt.get("value") for opt in options]
        assert "bank_transfer" in values, "bank_transfer option not found"
        assert "yappy" in values, "yappy option not found"
        assert "cash" in values, "cash option not found"
        assert "other" in values, "other option not found"
    
    def test_payment_method_options_have_translations(self, auth_client):
        """Payment Method options have EN, ES, ZH labels"""
        response = auth_client.get(f"{BASE_URL}/api/store/form-config/admin/order_form?include_inactive=true")
        assert response.status_code == 200
        
        data = response.json()
        pm_field = next((f for f in data["fields"] if f.get("field_key") == "payment_method"), None)
        assert pm_field is not None, "payment_method field not found"
        
        options = pm_field.get("options", [])
        
        # Cash option should have translations
        cash_opt = next((opt for opt in options if opt.get("value") == "cash"), None)
        assert cash_opt is not None, "cash option not found"
        assert cash_opt.get("label_en") == "Cash", f"Cash EN incorrect: {cash_opt.get('label_en')}"
        assert cash_opt.get("label_es") == "Efectivo", f"Cash ES incorrect: {cash_opt.get('label_es')}"
        assert cash_opt.get("label_zh") == "现金", f"Cash ZH incorrect: {cash_opt.get('label_zh')}"
        
        # Bank Transfer option should have translations
        bt_opt = next((opt for opt in options if opt.get("value") == "bank_transfer"), None)
        assert bt_opt is not None, "bank_transfer option not found"
        assert bt_opt.get("label_en") == "Bank Transfer", f"Bank Transfer EN incorrect: {bt_opt.get('label_en')}"
        assert bt_opt.get("label_es") == "Transferencia Bancaria", f"Bank Transfer ES incorrect: {bt_opt.get('label_es')}"
        assert bt_opt.get("label_zh") == "银行转账", f"Bank Transfer ZH incorrect: {bt_opt.get('label_zh')}"


# === Form Types List Tests ===

class TestFormTypesList:
    """Tests for form types list API"""
    
    def test_get_form_types_list(self, auth_client):
        """GET /api/store/form-config/admin/form-types/list returns form types"""
        response = auth_client.get(f"{BASE_URL}/api/store/form-config/admin/form-types/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "form_types" in data, "Response should contain 'form_types' key"
        assert len(data["form_types"]) >= 1, "Expected at least 1 form type"
    
    def test_order_form_in_form_types_list(self, auth_client):
        """order_form exists in form types list"""
        response = auth_client.get(f"{BASE_URL}/api/store/form-config/admin/form-types/list")
        assert response.status_code == 200
        
        data = response.json()
        form_types = [ft.get("form_type") for ft in data.get("form_types", [])]
        assert "order_form" in form_types, f"order_form not in form types: {form_types}"


# === Field CRUD Tests ===

class TestFieldCRUD:
    """Tests for creating/updating fields with dropdown options"""
    
    def test_create_dropdown_field_with_options(self, auth_client):
        """Create a dropdown field with options containing EN/ES/ZH labels"""
        # Create field with options
        payload = {
            "field_key": "TEST_gender_test",
            "field_type": "select",
            "is_required": True,
            "label_en": "Gender",
            "label_es": "Género",
            "label_zh": "性别",
            "options": [
                {"value": "male", "label_en": "Male", "label_es": "Masculino", "label_zh": "男"},
                {"value": "female", "label_en": "Female", "label_es": "Femenino", "label_zh": "女"}
            ]
        }
        
        response = auth_client.post(
            f"{BASE_URL}/api/store/form-config/admin/order_form/fields",
            json=payload
        )
        
        assert response.status_code == 200, f"Create failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("field_id") is not None, "field_id not returned"
        assert data.get("field_key") == "TEST_gender_test", "field_key mismatch"
        assert len(data.get("options", [])) == 2, "options not saved"
        
        # Cleanup - delete the test field
        field_id = data.get("field_id")
        if field_id:
            auth_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
