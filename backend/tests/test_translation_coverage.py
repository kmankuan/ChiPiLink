"""
Test Translation Coverage API and Admin Features
Tests the GET /api/translations/admin/coverage endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestTranslationCoverageAPI:
    """Tests for Translation Coverage Admin API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_coverage_endpoint_exists(self, admin_token):
        """Test that coverage API endpoint returns valid response"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/coverage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: Coverage API endpoint returns 200")
    
    def test_coverage_response_structure(self, admin_token):
        """Test coverage API returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/coverage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required top-level keys
        assert "reference_lang" in data, "Missing 'reference_lang' in response"
        assert "total_reference_keys" in data, "Missing 'total_reference_keys' in response"
        assert "languages" in data, "Missing 'languages' in response"
        assert "categories" in data, "Missing 'categories' in response"
        
        print(f"SUCCESS: Response structure is correct")
        print(f"  - Reference language: {data['reference_lang']}")
        print(f"  - Total reference keys: {data['total_reference_keys']}")
    
    def test_coverage_languages(self, admin_token):
        """Test that all 3 languages (EN, ES, ZH) are present"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/coverage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        languages = data.get("languages", {})
        
        # Verify all 3 languages are present
        assert "en" in languages, "Missing English (en) in languages"
        assert "es" in languages, "Missing Spanish (es) in languages"
        assert "zh" in languages, "Missing Chinese (zh) in languages"
        
        # Verify language structure
        for lang in ["en", "es", "zh"]:
            lang_data = languages[lang]
            assert "total_keys" in lang_data, f"Missing 'total_keys' for {lang}"
            assert "translated" in lang_data, f"Missing 'translated' for {lang}"
            assert "missing_count" in lang_data, f"Missing 'missing_count' for {lang}"
            assert "missing_keys" in lang_data, f"Missing 'missing_keys' for {lang}"
            assert "coverage_pct" in lang_data, f"Missing 'coverage_pct' for {lang}"
            
            print(f"  {lang.upper()}: {lang_data['coverage_pct']}% coverage, {lang_data['missing_count']} missing")
        
        print("SUCCESS: All 3 languages present with correct structure")
    
    def test_coverage_percentages_valid(self, admin_token):
        """Test that coverage percentages are valid (0-100)"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/coverage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        languages = data.get("languages", {})
        
        for lang, lang_data in languages.items():
            pct = lang_data.get("coverage_pct", 0)
            assert 0 <= pct <= 100, f"Invalid coverage percentage {pct} for {lang}"
        
        # English should be 100% (reference language)
        en_coverage = languages.get("en", {}).get("coverage_pct", 0)
        assert en_coverage == 100.0, f"English should be 100% (reference), got {en_coverage}%"
        
        print("SUCCESS: Coverage percentages are valid")
    
    def test_categories_breakdown(self, admin_token):
        """Test that categories are correctly grouped"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/coverage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        categories = data.get("categories", {})
        
        assert len(categories) > 0, "No categories found"
        
        # Check some expected categories
        expected_categories = ["nav", "auth", "common"]
        for cat in expected_categories:
            if cat in categories:
                cat_data = categories[cat]
                assert "total" in cat_data, f"Missing 'total' in category {cat}"
                assert "en" in cat_data, f"Missing 'en' count in category {cat}"
                assert "es" in cat_data, f"Missing 'es' count in category {cat}"
                assert "zh" in cat_data, f"Missing 'zh' count in category {cat}"
                print(f"  Category '{cat}': {cat_data['total']} keys")
        
        print(f"SUCCESS: Found {len(categories)} categories")
    
    def test_missing_keys_for_zh(self, admin_token):
        """Test that missing keys are returned for Chinese (has <100% coverage)"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/coverage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        zh_data = data.get("languages", {}).get("zh", {})
        
        missing_count = zh_data.get("missing_count", 0)
        missing_keys = zh_data.get("missing_keys", [])
        
        # If there are missing keys, verify the list is returned
        if missing_count > 0:
            assert len(missing_keys) > 0, "Missing keys list should not be empty when missing_count > 0"
            assert isinstance(missing_keys, list), "Missing keys should be a list"
            print(f"SUCCESS: ZH has {missing_count} missing keys, returned {len(missing_keys)} in response")
        else:
            print("INFO: ZH has 100% coverage, no missing keys")


class TestTranslationAdminEndpoints:
    """Tests for other translation admin endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_translation_list_endpoint(self, admin_token):
        """Test GET /api/translations/admin/list"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data, "Missing 'items' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        
        print(f"SUCCESS: Translation list returns {data['total']} total items")
    
    def test_translation_export_endpoint(self, admin_token):
        """Test GET /api/translations/admin/export"""
        response = requests.get(
            f"{BASE_URL}/api/translations/admin/export?lang=en",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return nested translation structure
        assert isinstance(data, dict), "Export should return a dictionary"
        print(f"SUCCESS: Export endpoint returns translation data")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
