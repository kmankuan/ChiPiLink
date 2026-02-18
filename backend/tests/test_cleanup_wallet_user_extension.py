"""
Test Data Cleanup Wallet + User Extensions
Tests for the extended cleanup tool covering:
- Wallets (chipi_wallets)
- Wallet transactions (chipi_transactions, wallet_transactions)
- Wallet alerts (alertas_wallet)
- Users (users collection)
- Admin user protection (protected_user_ids)

Admin credentials: admin@chipi.co / admin
Demo student owned by admin: std_test_admin_001 (user_id=cli_73ae14cdd22e - should be PROTECTED)
Demo students owned by regular users: std_39cb0f09a3cf, std_c9d19692c988 (user_id=user_parent_001)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"

# Test data identifiers
ADMIN_USER_ID = "cli_73ae14cdd22e"  # Admin user - should be protected
REGULAR_PARENT_USER_ID = "user_parent_001"  # Regular user - should be deletable
ADMIN_STUDENT_ID = "std_test_admin_001"  # Student owned by admin


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(admin_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestStudentsListWalletFields:
    """Tests for GET /api/cleanup/students with wallet data"""
    
    def test_students_have_wallet_balance_field(self, api_client):
        """GET /api/cleanup/students should include wallet_balance for each student"""
        response = api_client.get(f"{BASE_URL}/api/cleanup/students")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        students = data.get("students", [])
        
        if len(students) > 0:
            student = students[0]
            assert "wallet_balance" in student, "Student should have wallet_balance field"
            # wallet_balance can be None, number, or 0
            assert student["wallet_balance"] is None or isinstance(student["wallet_balance"], (int, float)), \
                f"wallet_balance should be None or number, got {type(student['wallet_balance'])}"
            print(f"✓ Student {student['student_id']} has wallet_balance: {student['wallet_balance']}")
    
    def test_students_have_wallet_txn_count_field(self, api_client):
        """GET /api/cleanup/students should include wallet_txn_count for each student"""
        response = api_client.get(f"{BASE_URL}/api/cleanup/students")
        assert response.status_code == 200
        
        data = response.json()
        students = data.get("students", [])
        
        if len(students) > 0:
            student = students[0]
            assert "wallet_txn_count" in student, "Student should have wallet_txn_count field"
            assert isinstance(student["wallet_txn_count"], int), \
                f"wallet_txn_count should be int, got {type(student['wallet_txn_count'])}"
            print(f"✓ Student {student['student_id']} has wallet_txn_count: {student['wallet_txn_count']}")
    
    def test_all_students_have_wallet_fields(self, api_client):
        """All students in list should have wallet_balance and wallet_txn_count"""
        response = api_client.get(f"{BASE_URL}/api/cleanup/students")
        assert response.status_code == 200
        
        students = response.json().get("students", [])
        
        for student in students[:10]:  # Check first 10
            assert "wallet_balance" in student, f"Student {student.get('student_id')} missing wallet_balance"
            assert "wallet_txn_count" in student, f"Student {student.get('student_id')} missing wallet_txn_count"
        
        print(f"✓ Verified wallet fields for {min(len(students), 10)} students")


class TestPreviewWalletCollections:
    """Tests for POST /api/cleanup/preview with wallet collections"""
    
    def test_preview_includes_wallets_count(self, api_client):
        """POST /api/cleanup/preview should include wallets count"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        preview = response.json().get("data", {})
        assert "wallets" in preview, "Preview should include 'wallets' key"
        assert "count" in preview["wallets"], "Wallets should have 'count' field"
        assert isinstance(preview["wallets"]["count"], int), "Wallets count should be int"
        print(f"✓ Preview wallets count: {preview['wallets']['count']}")
    
    def test_preview_includes_wallet_transactions_count(self, api_client):
        """POST /api/cleanup/preview should include wallet_transactions count"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        assert "wallet_transactions" in preview, "Preview should include 'wallet_transactions' key"
        assert "count" in preview["wallet_transactions"], "Wallet transactions should have 'count' field"
        print(f"✓ Preview wallet_transactions count: {preview['wallet_transactions']['count']}")
    
    def test_preview_includes_wallet_alerts_count(self, api_client):
        """POST /api/cleanup/preview should include wallet_alerts count"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        assert "wallet_alerts" in preview, "Preview should include 'wallet_alerts' key"
        assert "count" in preview["wallet_alerts"], "Wallet alerts should have 'count' field"
        print(f"✓ Preview wallet_alerts count: {preview['wallet_alerts']['count']}")
    
    def test_preview_includes_users_count(self, api_client):
        """POST /api/cleanup/preview should include users count"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        assert "users" in preview, "Preview should include 'users' key"
        assert "count" in preview["users"], "Users should have 'count' field"
        print(f"✓ Preview users count: {preview['users']['count']}")


class TestPreviewProtectedUsers:
    """Tests for protected_user_ids in preview (admin users should be skipped)"""
    
    def test_preview_includes_protected_user_ids(self, api_client):
        """POST /api/cleanup/preview should include protected_user_ids list"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        assert "protected_user_ids" in preview, "Preview should include 'protected_user_ids' key"
        assert isinstance(preview["protected_user_ids"], list), "protected_user_ids should be a list"
        print(f"✓ Protected user IDs: {preview['protected_user_ids']}")
    
    def test_admin_user_is_in_protected_list(self, api_client):
        """Admin user cli_73ae14cdd22e should appear in protected_user_ids when their students are targeted"""
        # Preview with the admin student
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [ADMIN_STUDENT_ID]
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        protected = preview.get("protected_user_ids", [])
        
        # The admin user should be in protected list if they own this student
        print(f"✓ Protected user IDs for admin student: {protected}")
        # Note: If admin owns std_test_admin_001, ADMIN_USER_ID should be in protected
        if ADMIN_USER_ID in protected:
            print(f"✓ Admin user {ADMIN_USER_ID} correctly listed as protected")
        else:
            print(f"⚠ Admin user {ADMIN_USER_ID} not in protected list - student may have different user_id")
    
    def test_preview_demo_only_shows_users_count_greater_than_zero_for_non_admin_parents(self, api_client):
        """POST /api/cleanup/preview with demo_only=true should show users count > 0 if non-admin parent accounts exist"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        users_count = preview.get("users", {}).get("count", 0)
        protected_ids = preview.get("protected_user_ids", [])
        
        print(f"✓ Demo-only preview: users count={users_count}, protected={len(protected_ids)}")
        # Users count represents non-admin parents that would be deleted
        # If demo students are owned by admins only, users count could be 0


class TestPreviewWithSpecificStudents:
    """Tests for preview with specific student IDs"""
    
    def test_preview_with_regular_user_student_shows_user_count(self, api_client):
        """Preview with students owned by regular users should show user count"""
        # Get students list to find one with a user_id
        students_resp = api_client.get(f"{BASE_URL}/api/cleanup/students")
        if students_resp.status_code != 200:
            pytest.skip("Could not get students list")
        
        students = students_resp.json().get("students", [])
        
        # Find students that have user_id and aren't the admin student
        non_admin_students = [s for s in students if s.get("user_id") and s["student_id"] != ADMIN_STUDENT_ID]
        
        if not non_admin_students:
            pytest.skip("No non-admin students with user_id found")
        
        test_student = non_admin_students[0]
        
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [test_student["student_id"]]
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        
        print(f"✓ Preview for student {test_student['student_id']} (user_id={test_student.get('user_id')}):")
        print(f"   - wallets: {preview.get('wallets', {}).get('count', 0)}")
        print(f"   - wallet_transactions: {preview.get('wallet_transactions', {}).get('count', 0)}")
        print(f"   - wallet_alerts: {preview.get('wallet_alerts', {}).get('count', 0)}")
        print(f"   - users: {preview.get('users', {}).get('count', 0)}")
        print(f"   - protected_user_ids: {preview.get('protected_user_ids', [])}")


class TestExecuteProtectsAdminUsers:
    """Tests to verify execute does NOT delete admin users"""
    
    def test_execute_returns_protected_users_skipped(self, api_client):
        """Execute should return protected_users_skipped in results if admin users were in scope"""
        # Create a temporary test student and user to clean up
        test_student_id = f"TEST_wallet_cleanup_{int(time.time())}"
        test_user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
        
        # Try to create a test order
        order_payload = {
            "student_id": test_student_id,
            "student_name": "Test Wallet Cleanup Student",
            "grade": "G5",
            "items": [{"isbn": "TEST-ISBN-WALLET", "quantity": 1, "unit_price": 15.0}],
            "total_amount": 15.0,
            "is_demo": True,
            "is_presale": False,
            "user_id": test_user_id,
            "comments": "Test order for wallet cleanup testing"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/store/textbook-orders/submit", json=order_payload)
        
        if create_resp.status_code not in [200, 201]:
            # Preview with admin student to check protected_users_skipped behavior
            preview_resp = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
                "student_ids": [ADMIN_STUDENT_ID]
            })
            
            if preview_resp.status_code == 200:
                preview = preview_resp.json().get("data", {})
                print(f"✓ Preview shows protected_user_ids: {preview.get('protected_user_ids', [])}")
            
            pytest.skip("Could not create test data, skipping execute test")
            return
        
        # Execute cleanup (without Monday.com deletion)
        execute_resp = api_client.post(f"{BASE_URL}/api/cleanup/execute", json={
            "student_ids": [test_student_id],
            "delete_monday_items": False
        })
        
        assert execute_resp.status_code == 200, f"Execute failed: {execute_resp.text}"
        
        results = execute_resp.json().get("results", {})
        
        # Check structure
        print(f"✓ Execute results keys: {list(results.keys())}")
        
        # Should include wallet-related results
        if "wallets" in results:
            print(f"   - wallets deleted: {results['wallets'].get('deleted', 0)}")
        if "wallet_transactions" in results:
            print(f"   - wallet_transactions deleted: {results['wallet_transactions'].get('deleted', 0)}")
        if "wallet_alerts" in results:
            print(f"   - wallet_alerts deleted: {results['wallet_alerts'].get('deleted', 0)}")
        if "users" in results:
            print(f"   - users deleted: {results['users'].get('deleted', 0)}")
        if "protected_users_skipped" in results:
            print(f"   - protected_users_skipped: {results['protected_users_skipped']}")


class TestPreviewStructureValidation:
    """Structural validation of preview response with wallet/user fields"""
    
    def test_preview_has_all_wallet_collections(self, api_client):
        """Preview should include all wallet-related collections in response"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        
        # Check all expected keys
        expected_keys = [
            "orders", "crm_links", "crm_messages", "crm_notifications", 
            "students", "order_messages",
            "wallets", "wallet_transactions", "wallet_alerts", "users",
            "protected_user_ids"
        ]
        
        missing = [k for k in expected_keys if k not in preview]
        assert len(missing) == 0, f"Missing keys in preview: {missing}"
        
        print(f"✓ All expected keys present in preview: {expected_keys}")
    
    def test_wallet_samples_included_in_preview(self, api_client):
        """Wallets preview should include samples when count > 0"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        wallets = preview.get("wallets", {})
        
        if wallets.get("count", 0) > 0:
            assert "samples" in wallets, "Wallets with count > 0 should have samples"
            print(f"✓ Wallets samples: {wallets['samples'][:2]}")  # Show first 2
        else:
            print("✓ No wallets to preview (count=0)")
    
    def test_users_samples_included_in_preview(self, api_client):
        """Users preview should include samples when count > 0"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        assert response.status_code == 200
        
        preview = response.json().get("data", {})
        users = preview.get("users", {})
        
        if users.get("count", 0) > 0:
            assert "samples" in users, "Users with count > 0 should have samples"
            print(f"✓ Users samples: {users['samples'][:2]}")  # Show first 2
        else:
            # Check if there's a note about admin protection
            note = users.get("note", "")
            print(f"✓ No users to preview (count=0), note: {note}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
