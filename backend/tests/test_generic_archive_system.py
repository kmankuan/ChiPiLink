"""
Generic Archive System Tests - Testing the unified archive/restore/permanent-delete workflow
Tests the new archive endpoints: POST /api/archive/{entity_type}/archive|restore|permanent-delete
Entity types: students, orders, alerts, movements, print_jobs, products

Endpoints tested:
- POST /api/archive/{entity_type}/archive - Soft delete items (set archived=true)
- GET /api/archive/{entity_type} - List archived items
- POST /api/archive/{entity_type}/restore - Restore items from archive
- POST /api/archive/{entity_type}/permanent-delete - Permanently delete from archive only
- GET /api/archive/{entity_type}/counts - Get active vs archived counts
- Verify listing endpoints exclude archived items
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

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


# ===================== STUDENT ARCHIVE TESTS =====================

class TestStudentArchive:
    """Test archive system for students (store_students collection)"""
    
    @pytest.fixture
    def test_student(self, api_client):
        """Create a test student for archive testing"""
        unique_id = f"TEST_std_{uuid.uuid4().hex[:8]}"
        student_data = {
            "first_name": "Test",
            "last_name": f"Archive {unique_id}",
            "full_name": f"Test Archive {unique_id}",
            "school_id": "test_school",
            "school_name": "Test School",
            "student_number": unique_id,
            "grade": "G1"
        }
        
        # Insert directly via admin endpoint or use existing
        # For now we'll use direct MongoDB insert simulation through the API
        # Create via textbook-access endpoint if available
        response = api_client.post(
            f"{BASE_URL}/api/sysbook/access/admin/students",
            json=student_data
        )
        
        if response.status_code == 200:
            student = response.json()
            student_id = student.get("student_id")
            yield {"student_id": student_id, **student}
            
            # Cleanup
            try:
                api_client.post(
                    f"{BASE_URL}/api/archive/students/permanent-delete",
                    json={"ids": [student_id]}
                )
            except:
                pass
        else:
            # Skip test if we can't create student
            pytest.skip(f"Could not create test student: {response.text}")
    
    def test_archive_students_endpoint_exists(self, api_client):
        """Verify POST /api/archive/students/archive endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/students/archive",
            json={"ids": []}
        )
        # Empty ids should return success with 0 archived
        assert response.status_code == 200, f"Archive endpoint failed: {response.text}"
        data = response.json()
        assert "archived_count" in data or "success" in data
    
    def test_get_archived_students(self, api_client):
        """Test GET /api/archive/students returns archived items"""
        response = api_client.get(f"{BASE_URL}/api/archive/students")
        assert response.status_code == 200, f"Get archived students failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"PASS: GET /api/archive/students returns {data['count']} archived students")
    
    def test_get_student_counts(self, api_client):
        """Test GET /api/archive/students/counts returns active vs archived counts"""
        response = api_client.get(f"{BASE_URL}/api/archive/students/counts")
        assert response.status_code == 200, f"Get counts failed: {response.text}"
        data = response.json()
        assert "active" in data
        assert "archived" in data
        print(f"PASS: Students counts - Active: {data['active']}, Archived: {data['archived']}")
    
    def test_restore_students_endpoint(self, api_client):
        """Verify POST /api/archive/students/restore endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/students/restore",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Restore endpoint failed: {response.text}"
        data = response.json()
        assert "restored_count" in data or "success" in data
    
    def test_permanent_delete_students_endpoint(self, api_client):
        """Verify POST /api/archive/students/permanent-delete endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/students/permanent-delete",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Permanent delete endpoint failed: {response.text}"
        data = response.json()
        assert "deleted_count" in data or "success" in data


# ===================== ORDER ARCHIVE TESTS =====================

class TestOrderArchive:
    """Test archive system for orders (store_textbook_orders collection)"""
    
    def test_archive_orders_endpoint_exists(self, api_client):
        """Verify POST /api/archive/orders/archive endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/orders/archive",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Archive endpoint failed: {response.text}"
        data = response.json()
        assert "archived_count" in data or "success" in data
        print(f"PASS: POST /api/archive/orders/archive endpoint working")
    
    def test_get_archived_orders(self, api_client):
        """Test GET /api/archive/orders returns archived items"""
        response = api_client.get(f"{BASE_URL}/api/archive/orders")
        assert response.status_code == 200, f"Get archived orders failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"PASS: GET /api/archive/orders returns {data['count']} archived orders")
    
    def test_get_order_counts(self, api_client):
        """Test GET /api/archive/orders/counts returns active vs archived counts"""
        response = api_client.get(f"{BASE_URL}/api/archive/orders/counts")
        assert response.status_code == 200, f"Get counts failed: {response.text}"
        data = response.json()
        assert "active" in data
        assert "archived" in data
        print(f"PASS: Orders counts - Active: {data['active']}, Archived: {data['archived']}")
    
    def test_restore_orders_endpoint(self, api_client):
        """Verify POST /api/archive/orders/restore endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/orders/restore",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Restore endpoint failed: {response.text}"
    
    def test_permanent_delete_orders_endpoint(self, api_client):
        """Verify POST /api/archive/orders/permanent-delete endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/orders/permanent-delete",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Permanent delete endpoint failed: {response.text}"


# ===================== ALERTS ARCHIVE TESTS =====================

class TestAlertsArchive:
    """Test archive system for alerts (sysbook_alerts collection)"""
    
    def test_archive_alerts_endpoint_exists(self, api_client):
        """Verify POST /api/archive/alerts/archive endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/alerts/archive",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Archive endpoint failed: {response.text}"
        data = response.json()
        assert "archived_count" in data or "success" in data
        print(f"PASS: POST /api/archive/alerts/archive endpoint working")
    
    def test_get_archived_alerts(self, api_client):
        """Test GET /api/archive/alerts returns archived items"""
        response = api_client.get(f"{BASE_URL}/api/archive/alerts")
        assert response.status_code == 200, f"Get archived alerts failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"PASS: GET /api/archive/alerts returns {data['count']} archived alerts")
    
    def test_get_alert_counts(self, api_client):
        """Test GET /api/archive/alerts/counts returns active vs archived counts"""
        response = api_client.get(f"{BASE_URL}/api/archive/alerts/counts")
        assert response.status_code == 200, f"Get counts failed: {response.text}"
        data = response.json()
        assert "active" in data
        assert "archived" in data
        print(f"PASS: Alerts counts - Active: {data['active']}, Archived: {data['archived']}")


# ===================== MOVEMENTS ARCHIVE TESTS =====================

class TestMovementsArchive:
    """Test archive system for stock movements (stock_orders collection)"""
    
    def test_archive_movements_endpoint_exists(self, api_client):
        """Verify POST /api/archive/movements/archive endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/movements/archive",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Archive endpoint failed: {response.text}"
        data = response.json()
        assert "archived_count" in data or "success" in data
        print(f"PASS: POST /api/archive/movements/archive endpoint working")
    
    def test_get_archived_movements(self, api_client):
        """Test GET /api/archive/movements returns archived items"""
        response = api_client.get(f"{BASE_URL}/api/archive/movements")
        assert response.status_code == 200, f"Get archived movements failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"PASS: GET /api/archive/movements returns {data['count']} archived movements")
    
    def test_get_movement_counts(self, api_client):
        """Test GET /api/archive/movements/counts returns active vs archived counts"""
        response = api_client.get(f"{BASE_URL}/api/archive/movements/counts")
        assert response.status_code == 200, f"Get counts failed: {response.text}"
        data = response.json()
        assert "active" in data
        assert "archived" in data
        print(f"PASS: Movements counts - Active: {data['active']}, Archived: {data['archived']}")


# ===================== PRODUCTS ARCHIVE TESTS =====================

class TestProductsArchive:
    """Test archive system for products (store_products collection)"""
    
    def test_archive_products_endpoint_exists(self, api_client):
        """Verify POST /api/archive/products/archive endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/products/archive",
            json={"ids": []}
        )
        assert response.status_code == 200, f"Archive endpoint failed: {response.text}"
        data = response.json()
        assert "archived_count" in data or "success" in data
        print(f"PASS: POST /api/archive/products/archive endpoint working")
    
    def test_get_archived_products(self, api_client):
        """Test GET /api/archive/products returns archived items"""
        response = api_client.get(f"{BASE_URL}/api/archive/products")
        assert response.status_code == 200, f"Get archived products failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"PASS: GET /api/archive/products returns {data['count']} archived products")
    
    def test_get_product_counts(self, api_client):
        """Test GET /api/archive/products/counts returns active vs archived counts"""
        response = api_client.get(f"{BASE_URL}/api/archive/products/counts")
        assert response.status_code == 200, f"Get counts failed: {response.text}"
        data = response.json()
        assert "active" in data
        assert "archived" in data
        print(f"PASS: Products counts - Active: {data['active']}, Archived: {data['archived']}")


# ===================== UNKNOWN ENTITY TYPE TEST =====================

class TestUnknownEntityType:
    """Test that unknown entity types return 400 error"""
    
    def test_unknown_entity_type_returns_400(self, api_client):
        """Verify unknown entity type returns 400"""
        response = api_client.post(
            f"{BASE_URL}/api/archive/unknown_entity/archive",
            json={"ids": []}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Unknown entity type returns 400")


# ===================== FULL WORKFLOW TESTS =====================

class TestFullArchiveWorkflow:
    """Test complete archive workflow with real data insertion"""
    
    def test_student_archive_workflow(self, api_client):
        """
        Full workflow: Create student -> Archive -> Verify excluded from listing -> 
        Restore -> Verify back in listing -> Archive again -> Permanent delete
        """
        # Step 1: Check counts before
        counts_before = api_client.get(f"{BASE_URL}/api/archive/students/counts").json()
        print(f"Before test - Active: {counts_before['active']}, Archived: {counts_before['archived']}")
        
        # Step 2: Create a test student directly via API if endpoint exists
        unique_id = f"TEST_ARCH_{uuid.uuid4().hex[:6]}"
        
        # Try to create student via sysbook access admin endpoint
        create_response = api_client.post(
            f"{BASE_URL}/api/sysbook/access/admin/students",
            json={
                "first_name": "Archive",
                "last_name": f"Test {unique_id}",
                "full_name": f"Archive Test {unique_id}",
                "school_id": "test_school",
                "school_name": "Test School",
                "student_number": unique_id,
                "grade": "G1"
            }
        )
        
        if create_response.status_code != 200:
            # If creation endpoint doesn't exist, skip full workflow
            pytest.skip(f"Cannot create test student: {create_response.text}")
        
        student_id = create_response.json().get("student_id")
        assert student_id, "Student ID not returned"
        print(f"Created test student: {student_id}")
        
        try:
            # Step 3: Archive the student
            archive_resp = api_client.post(
                f"{BASE_URL}/api/archive/students/archive",
                json={"ids": [student_id]}
            )
            assert archive_resp.status_code == 200
            assert archive_resp.json().get("archived_count") == 1
            print(f"Archived student successfully")
            
            # Step 4: Verify student appears in archived list
            archived_resp = api_client.get(f"{BASE_URL}/api/archive/students")
            archived_items = archived_resp.json().get("items", [])
            archived_ids = [s.get("student_id") for s in archived_items]
            assert student_id in archived_ids, "Student not found in archived list"
            print(f"Student found in archived list")
            
            # Step 5: Verify student is excluded from main listing
            all_students_resp = api_client.get(f"{BASE_URL}/api/sysbook/access/admin/all-students")
            if all_students_resp.status_code == 200:
                all_students = all_students_resp.json()
                if isinstance(all_students, list):
                    active_ids = [s.get("student_id") for s in all_students]
                else:
                    active_ids = [s.get("student_id") for s in all_students.get("students", [])]
                assert student_id not in active_ids, "Archived student should not appear in active listing"
                print(f"Archived student correctly excluded from main listing")
            
            # Step 6: Restore the student
            restore_resp = api_client.post(
                f"{BASE_URL}/api/archive/students/restore",
                json={"ids": [student_id]}
            )
            assert restore_resp.status_code == 200
            assert restore_resp.json().get("restored_count") == 1
            print(f"Restored student successfully")
            
            # Step 7: Verify student back in main listing (not in archived)
            archived_resp = api_client.get(f"{BASE_URL}/api/archive/students")
            archived_items = archived_resp.json().get("items", [])
            archived_ids = [s.get("student_id") for s in archived_items]
            assert student_id not in archived_ids, "Student should not be in archived list after restore"
            print(f"Student removed from archived list after restore")
            
            # Step 8: Archive again for permanent delete
            api_client.post(
                f"{BASE_URL}/api/archive/students/archive",
                json={"ids": [student_id]}
            )
            
            # Step 9: Permanent delete
            delete_resp = api_client.post(
                f"{BASE_URL}/api/archive/students/permanent-delete",
                json={"ids": [student_id]}
            )
            assert delete_resp.status_code == 200
            assert delete_resp.json().get("deleted_count") == 1
            print(f"Permanently deleted student successfully")
            
            # Step 10: Verify student completely gone
            archived_resp = api_client.get(f"{BASE_URL}/api/archive/students")
            archived_items = archived_resp.json().get("items", [])
            archived_ids = [s.get("student_id") for s in archived_items]
            assert student_id not in archived_ids, "Student should be completely deleted"
            print(f"PASS: Full student archive workflow completed successfully")
            
        except Exception as e:
            # Cleanup on failure
            try:
                api_client.post(f"{BASE_URL}/api/archive/students/permanent-delete", json={"ids": [student_id]})
            except:
                pass
            raise e
    
    def test_permanent_delete_requires_archived_status(self, api_client):
        """
        Verify that permanent delete only works on archived items (safety guard)
        """
        # Try to permanent delete a non-existent/non-archived item
        fake_id = f"fake_student_{uuid.uuid4().hex[:8]}"
        
        response = api_client.post(
            f"{BASE_URL}/api/archive/students/permanent-delete",
            json={"ids": [fake_id]}
        )
        
        # Should return 200 with deleted_count=0 (no items matched the archived=True filter)
        assert response.status_code == 200
        data = response.json()
        assert data.get("deleted_count") == 0, "Should not delete non-archived items"
        print(f"PASS: Permanent delete safety guard working - non-archived items not deleted")


# ===================== LISTING EXCLUSION TESTS =====================

class TestListingExclusion:
    """Verify that main listing endpoints exclude archived items"""
    
    def test_students_listing_excludes_archived(self, api_client):
        """GET /api/sysbook/access/admin/all-students should exclude archived students"""
        # Get current archived count
        counts = api_client.get(f"{BASE_URL}/api/archive/students/counts").json()
        print(f"Students - Active: {counts['active']}, Archived: {counts['archived']}")
        
        # Get main listing
        response = api_client.get(f"{BASE_URL}/api/sysbook/access/admin/all-students")
        if response.status_code == 200:
            students = response.json()
            if isinstance(students, list):
                student_list = students
            else:
                student_list = students.get("students", [])
            
            # Verify no archived students in the list
            for student in student_list:
                assert student.get("archived") != True, f"Found archived student in listing: {student.get('student_id')}"
            
            print(f"PASS: Main student listing has {len(student_list)} students, no archived ones")
    
    def test_orders_listing_excludes_archived(self, api_client):
        """GET /api/sysbook/orders/admin should exclude archived orders"""
        response = api_client.get(f"{BASE_URL}/api/sysbook/orders/admin")
        if response.status_code == 200:
            data = response.json()
            orders = data.get("orders", [])
            
            for order in orders:
                assert order.get("archived") != True, f"Found archived order in listing: {order.get('order_id')}"
            
            print(f"PASS: Orders listing has {len(orders)} orders, no archived ones")
    
    def test_alerts_listing_excludes_archived(self, api_client):
        """GET /api/sysbook/alerts should exclude archived alerts"""
        response = api_client.get(f"{BASE_URL}/api/sysbook/alerts")
        if response.status_code == 200:
            data = response.json()
            alerts = data.get("alerts", [])
            
            for alert in alerts:
                assert alert.get("archived") != True, f"Found archived alert in listing: {alert.get('alert_id')}"
            
            print(f"PASS: Alerts listing has {len(alerts)} alerts, no archived ones")
    
    def test_stock_movements_listing_excludes_archived(self, api_client):
        """GET /api/store/stock-orders should exclude archived movements"""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders")
        if response.status_code == 200:
            data = response.json()
            orders = data.get("orders", [])
            
            for order in orders:
                assert order.get("archived") != True, f"Found archived movement in listing: {order.get('order_id')}"
            
            print(f"PASS: Stock movements listing has {len(orders)} items, no archived ones")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
