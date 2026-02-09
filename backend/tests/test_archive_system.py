"""
Archive System Tests - Testing Archive/Restore/Permanent Delete functionality
Iteration 70 - Tests the new archive system for private catalog products

Endpoints tested:
- POST /api/store/private-catalog/admin/products/{id}/archive
- POST /api/store/private-catalog/admin/products/{id}/restore
- DELETE /api/store/private-catalog/admin/products/{id}/permanent
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
LOGIN_EMAIL = "teck@koh.one"
LOGIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture
def test_product(api_client):
    """Create a test product for archive testing, cleanup after test"""
    unique_code = f"TEST_ARCHIVE_{uuid.uuid4().hex[:8]}"
    product_data = {
        "name": f"Test Archive Product {unique_code}",
        "code": unique_code,
        "grade": "G1",
        "price": 10.00,
        "active": True,
        "is_private_catalog": True
    }
    
    response = api_client.post(
        f"{BASE_URL}/api/store/private-catalog/admin/products",
        json=product_data
    )
    assert response.status_code == 200, f"Failed to create test product: {response.text}"
    product = response.json().get("product", response.json())
    book_id = product.get("book_id")
    
    yield {"book_id": book_id, **product}
    
    # Cleanup - try permanent delete (if archived) or regular delete
    try:
        api_client.delete(f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/permanent")
    except:
        pass
    try:
        api_client.delete(f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}?hard_delete=true")
    except:
        pass


class TestArchiveAPI:
    """Test Archive endpoint"""
    
    def test_archive_product_success(self, api_client, test_product):
        """Test archiving a product"""
        book_id = test_product["book_id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/archive"
        )
        
        assert response.status_code == 200, f"Archive failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        # Verify product is now archived by fetching it
        get_response = api_client.get(
            f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500"
        )
        assert get_response.status_code == 200
        products = get_response.json().get("products", [])
        archived_product = next((p for p in products if p.get("book_id") == book_id), None)
        
        # Product should exist and have archived=True
        assert archived_product is not None, "Product not found after archiving"
        assert archived_product.get("archived") == True, "Product archived flag not set"
        assert archived_product.get("archived_at") is not None, "archived_at timestamp not set"
    
    def test_archive_nonexistent_product(self, api_client):
        """Test archiving a non-existent product returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/nonexistent_book_id_12345/archive"
        )
        assert response.status_code == 404


class TestRestoreAPI:
    """Test Restore endpoint"""
    
    def test_restore_product_success(self, api_client, test_product):
        """Test restoring an archived product"""
        book_id = test_product["book_id"]
        
        # First archive the product
        archive_response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/archive"
        )
        assert archive_response.status_code == 200
        
        # Now restore it
        restore_response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/restore"
        )
        
        assert restore_response.status_code == 200, f"Restore failed: {restore_response.text}"
        data = restore_response.json()
        assert data.get("success") == True
        
        # Verify product is no longer archived
        get_response = api_client.get(
            f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500"
        )
        assert get_response.status_code == 200
        products = get_response.json().get("products", [])
        restored_product = next((p for p in products if p.get("book_id") == book_id), None)
        
        assert restored_product is not None, "Product not found after restoring"
        assert restored_product.get("archived") == False, "Product still shows as archived"
        assert restored_product.get("archived_at") is None, "archived_at should be removed"
    
    def test_restore_nonexistent_product(self, api_client):
        """Test restoring a non-existent product returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/nonexistent_book_id_12345/restore"
        )
        assert response.status_code == 404


class TestPermanentDeleteAPI:
    """Test Permanent Delete endpoint"""
    
    def test_permanent_delete_archived_product_success(self, api_client, test_product):
        """Test permanently deleting an archived product"""
        book_id = test_product["book_id"]
        
        # First archive the product (required before permanent delete)
        archive_response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/archive"
        )
        assert archive_response.status_code == 200
        
        # Now permanently delete it
        delete_response = api_client.delete(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/permanent"
        )
        
        assert delete_response.status_code == 200, f"Permanent delete failed: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True
        
        # Verify product no longer exists
        get_response = api_client.get(
            f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500"
        )
        assert get_response.status_code == 200
        products = get_response.json().get("products", [])
        deleted_product = next((p for p in products if p.get("book_id") == book_id), None)
        
        assert deleted_product is None, "Product still exists after permanent delete"
    
    def test_permanent_delete_non_archived_product_fails(self, api_client, test_product):
        """Test permanently deleting a non-archived product should fail"""
        book_id = test_product["book_id"]
        
        # Try to permanently delete without archiving first
        delete_response = api_client.delete(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/permanent"
        )
        
        # Should return 404 (product not found or not archived)
        assert delete_response.status_code == 404, \
            f"Expected 404 for non-archived product, got {delete_response.status_code}"
    
    def test_permanent_delete_nonexistent_product(self, api_client):
        """Test permanently deleting a non-existent product returns 404"""
        response = api_client.delete(
            f"{BASE_URL}/api/store/private-catalog/admin/products/nonexistent_book_id_12345/permanent"
        )
        assert response.status_code == 404


class TestArchiveWorkflow:
    """Test complete archive workflow: Archive -> Restore -> Archive -> Permanent Delete"""
    
    def test_full_archive_workflow(self, api_client):
        """Test complete archive lifecycle"""
        # Create a product
        unique_code = f"TEST_WORKFLOW_{uuid.uuid4().hex[:8]}"
        product_data = {
            "name": f"Workflow Test Product {unique_code}",
            "code": unique_code,
            "grade": "G2",
            "price": 15.00,
            "active": True,
            "is_private_catalog": True
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products",
            json=product_data
        )
        assert create_response.status_code == 200
        book_id = create_response.json().get("product", {}).get("book_id")
        assert book_id is not None
        
        try:
            # Step 1: Archive
            archive_resp = api_client.post(
                f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/archive"
            )
            assert archive_resp.status_code == 200
            assert archive_resp.json().get("success") == True
            
            # Verify archived
            get_resp = api_client.get(f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500")
            product = next((p for p in get_resp.json().get("products", []) if p.get("book_id") == book_id), None)
            assert product.get("archived") == True
            
            # Step 2: Restore
            restore_resp = api_client.post(
                f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/restore"
            )
            assert restore_resp.status_code == 200
            assert restore_resp.json().get("success") == True
            
            # Verify restored
            get_resp = api_client.get(f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500")
            product = next((p for p in get_resp.json().get("products", []) if p.get("book_id") == book_id), None)
            assert product.get("archived") == False
            
            # Step 3: Archive again
            archive_resp = api_client.post(
                f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/archive"
            )
            assert archive_resp.status_code == 200
            
            # Step 4: Permanent delete
            delete_resp = api_client.delete(
                f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/permanent"
            )
            assert delete_resp.status_code == 200
            assert delete_resp.json().get("success") == True
            
            # Verify deleted
            get_resp = api_client.get(f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500")
            product = next((p for p in get_resp.json().get("products", []) if p.get("book_id") == book_id), None)
            assert product is None, "Product should be completely deleted"
            
        except Exception as e:
            # Cleanup on failure
            try:
                api_client.delete(f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/permanent")
            except:
                pass
            try:
                api_client.delete(f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}?hard_delete=true")
            except:
                pass
            raise e


class TestArchivedProductsVisibility:
    """Test that archived products are hidden from regular views"""
    
    def test_archived_products_hidden_from_user_catalog(self, api_client, test_product):
        """Test that archived products are not shown in user-facing catalog"""
        book_id = test_product["book_id"]
        
        # Archive the product
        api_client.post(
            f"{BASE_URL}/api/store/private-catalog/admin/products/{book_id}/archive"
        )
        
        # Note: User catalog endpoint requires PCA student access
        # For admin, we verify through the admin endpoint but checking archived flag
        get_response = api_client.get(
            f"{BASE_URL}/api/store/private-catalog/admin/products?limit=500"
        )
        products = get_response.json().get("products", [])
        product = next((p for p in products if p.get("book_id") == book_id), None)
        
        # Product is returned but with archived=True - frontend should filter this
        assert product is not None
        assert product.get("archived") == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
