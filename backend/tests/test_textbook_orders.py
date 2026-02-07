"""
Test Textbook Orders API
Tests for school textbooks ordering feature including authentication,
private catalog access, and textbook retrieval by grade.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://textbook-chat-crm.preview.emergentagent.com')

# Test credentials
TEST_CLIENT = {
    "email": "test@client.com",
    "password": "password"
}

SUPER_ADMIN = {
    "email": "teck@koh.one",
    "password": "Acdb##0897"
}


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_client_login_success(self):
        """Test client login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=TEST_CLIENT
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_CLIENT["email"]
        assert data["user"]["is_admin"] == False
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=SUPER_ADMIN
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == SUPER_ADMIN["email"]
        assert data["user"]["is_admin"] == True
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401


class TestPrivateCatalogAccess:
    """Test private catalog access endpoints"""
    
    @pytest.fixture
    def client_token(self):
        """Get authenticated token for test client"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=TEST_CLIENT
        )
        return response.json()["token"]
    
    def test_private_catalog_access(self, client_token):
        """Test private catalog access returns linked students"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate access granted
        assert data["has_access"] == True
        assert "students" in data
        assert len(data["students"]) == 2
        
        # Validate student data
        student_names = [s["name"] for s in data["students"]]
        assert "Test Student Alpha" in student_names
        assert "Test Student Beta" in student_names
        
        # Validate grades
        assert "grades" in data
        assert "3" in data["grades"]
        assert "5" in data["grades"]
    
    def test_private_catalog_requires_auth(self):
        """Test private catalog access requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access"
        )
        assert response.status_code == 401


class TestTextbooksByGrade:
    """Test textbook retrieval by grade"""
    
    @pytest.fixture
    def client_token(self):
        """Get authenticated token for test client"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=TEST_CLIENT
        )
        return response.json()["token"]
    
    def test_get_textbooks_grade_3(self, client_token):
        """Test getting textbooks for grade 3"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/by-grade/3",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert data["grade"] == "3"
        assert "products" in data
        assert data["total"] >= 1
        
        # Validate textbook for grade 3
        products = data["products"]
        assert len(products) >= 1
        
        # Check for English Grammar Workbook
        book_names = [p["name"] for p in products]
        assert "English Grammar Workbook 3rd Grade" in book_names
    
    def test_get_textbooks_grade_5(self, client_token):
        """Test getting textbooks for grade 5"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/by-grade/5",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert data["grade"] == "5"
        assert "products" in data
        assert data["total"] >= 1
        
        # Validate textbook for grade 5
        products = data["products"]
        assert len(products) >= 1
        
        # Check for Mathematics textbook
        book_names = [p["name"] for p in products]
        assert "Mathematics 5th Grade - Pearson" in book_names
    
    def test_textbooks_by_grade_requires_auth(self):
        """Test textbooks by grade requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/by-grade/3"
        )
        assert response.status_code == 401


class TestStoreEndpoints:
    """Test public store endpoints"""
    
    def test_store_products_endpoint(self):
        """Test public store products endpoint"""
        response = requests.get(f"{BASE_URL}/api/store/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data or isinstance(data, list)
    
    def test_store_categories_endpoint(self):
        """Test store categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/store/categories")
        assert response.status_code == 200


class TestAdminEndpoints:
    """Test admin endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get authenticated token for admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=SUPER_ADMIN
        )
        return response.json()["token"]
    
    def test_admin_sidebar_visibility(self, admin_token):
        """Test admin can access admin-related endpoints"""
        # Test admin diagnostic endpoint
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test admin stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
