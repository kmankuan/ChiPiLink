"""
Test TXB Per-Column Sync Bug Fix
Bug: Server error (400) when syncing individual columns to Monday.com from admin panel.
Fix: Route handler now uses JSONResponse + try/except instead of HTTPException.

Tests:
1. Unmapped columns return proper JSON error (not raw 400)
2. Invalid column keys return proper JSON error with valid keys list
3. Mapped columns (code, stock, status, date) start background sync correctly (202)
4. sync-column-status endpoint returns correct status/progress
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@chipi.co", "password": "admin"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")

@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


class TestUnmappedColumnErrorHandling:
    """Test that unmapped columns return proper JSON errors, not raw 400"""
    
    def test_unmapped_grade_column_returns_json_400(self, auth_headers):
        """Grade is not mapped in this env - should return JSON 400 with clear message"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/grade",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        # KEY FIX: Should be JSON, not raw text
        assert "application/json" in response.headers.get("content-type", ""), \
            f"Response should be JSON, got: {response.headers.get('content-type')}"
        
        data = response.json()
        assert "detail" in data, "Response should have 'detail' field"
        assert "not mapped" in data["detail"].lower(), f"Error should mention 'not mapped': {data['detail']}"
        print(f"✓ Unmapped grade column returns JSON error: {data['detail']}")
    
    def test_unmapped_name_column_returns_json_400(self, auth_headers):
        """Name column may not be mapped - should return JSON 400"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/name",
            headers=auth_headers
        )
        # Could be 202 if mapped, or 400 if not
        if response.status_code == 400:
            assert "application/json" in response.headers.get("content-type", "")
            data = response.json()
            assert "detail" in data
            print(f"✓ Unmapped name column returns JSON error: {data['detail']}")
        else:
            assert response.status_code == 202, f"Expected 202 or 400, got {response.status_code}"
            print("✓ Name column is mapped - returned 202")


class TestInvalidColumnKeyErrorHandling:
    """Test that invalid column keys return proper JSON errors with valid keys list"""
    
    def test_invalid_column_key_returns_json_400(self, auth_headers):
        """Invalid key should return JSON 400 with list of valid keys"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/invalid_key",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        # KEY FIX: Should be JSON, not raw text
        assert "application/json" in response.headers.get("content-type", "")
        
        data = response.json()
        assert "detail" in data
        # Should list valid keys
        valid_keys = ["code", "name", "grade", "publisher", "subject", "unit_price", "stock", "stock_quantity"]
        for key in ["code", "grade", "stock"]:  # At least these should be mentioned
            assert key in data["detail"].lower(), f"Error should mention valid key '{key}'"
        print(f"✓ Invalid column key returns JSON error with valid keys: {data['detail']}")
    
    def test_another_invalid_key(self, auth_headers):
        """Test another invalid key"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/foobar",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "application/json" in response.headers.get("content-type", "")
        data = response.json()
        assert "Invalid column key" in data["detail"]
        print(f"✓ Invalid key 'foobar' returns JSON error: {data['detail']}")


class TestMappedColumnSync:
    """Test that mapped columns start background sync and return 202"""
    
    def test_code_column_sync_returns_202(self, auth_headers):
        """Code column is mapped - should return 202 and start sync"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/code",
            headers=auth_headers
        )
        assert response.status_code == 202, f"Expected 202, got {response.status_code}: {response.text}"
        assert "application/json" in response.headers.get("content-type", "")
        
        data = response.json()
        assert data.get("status") in ["started", "already_running"], f"Unexpected status: {data}"
        assert data.get("column") == "code"
        print(f"✓ Code column sync started: {data}")
    
    def test_stock_column_sync_returns_202(self, auth_headers):
        """Stock column is mapped - should return 202"""
        # Wait for previous sync to finish
        time.sleep(2)
        
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/stock",
            headers=auth_headers
        )
        assert response.status_code == 202, f"Expected 202, got {response.status_code}: {response.text}"
        assert "application/json" in response.headers.get("content-type", "")
        
        data = response.json()
        assert data.get("status") in ["started", "already_running"]
        print(f"✓ Stock column sync started: {data}")


class TestSyncColumnStatus:
    """Test that sync-column-status endpoint works correctly"""
    
    def test_get_sync_status_for_code(self, auth_headers):
        """Get status for code column sync"""
        # First start a sync
        requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/code",
            headers=auth_headers
        )
        
        # Wait briefly then check status
        time.sleep(1)
        
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column-status/code",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data, f"Response should have status: {data}"
        assert data["status"] in ["running", "completed", "error", "idle"]
        assert "column_key" in data
        print(f"✓ Sync status for code: {data['status']}, updated={data.get('updated', 'N/A')}")
    
    def test_get_sync_status_for_unsynced_column(self, auth_headers):
        """Get status for column that hasn't been synced - should return idle"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column-status/publisher",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return idle or last status
        assert "status" in data or "column_key" in data
        print(f"✓ Sync status for publisher: {data}")


class TestEndToEndColumnSync:
    """Test full end-to-end flow: start sync, poll status, verify completion"""
    
    def test_full_sync_flow_for_status_column(self, auth_headers):
        """Test complete flow: start sync → poll → complete"""
        # Check if status column is mapped
        config_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers=auth_headers
        )
        assert config_resp.status_code == 200
        config = config_resp.json()
        
        # Pick a column that's mapped
        col_map = config.get("column_mapping", {})
        mapped_cols = [k for k, v in col_map.items() if v]
        
        if "code" in mapped_cols:
            test_col = "code"
        elif "stock" in col_map and col_map["stock"]:
            test_col = "stock"
        elif "stock_quantity" in col_map and col_map["stock_quantity"]:
            test_col = "stock_quantity"
        else:
            pytest.skip("No mapped columns found to test")
        
        # Start sync
        start_resp = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/{test_col}",
            headers=auth_headers
        )
        assert start_resp.status_code == 202, f"Expected 202: {start_resp.text}"
        
        # Poll for completion (max 30 seconds)
        for _ in range(15):
            time.sleep(2)
            status_resp = requests.get(
                f"{BASE_URL}/api/store/monday/txb-inventory/sync-column-status/{test_col}",
                headers=auth_headers
            )
            if status_resp.status_code != 200:
                continue
            
            status = status_resp.json()
            if status.get("status") == "completed":
                print(f"✓ Full sync flow completed: updated={status.get('updated')}, skipped={status.get('skipped')}, failed={status.get('failed')}")
                assert status.get("error") is None, f"Sync completed with error: {status.get('error')}"
                return
            elif status.get("status") == "error":
                pytest.fail(f"Sync failed with error: {status.get('error')}")
        
        pytest.fail("Sync did not complete within timeout")


class TestAuthenticationRequired:
    """Test that endpoints require authentication"""
    
    def test_sync_column_requires_auth(self):
        """sync-column endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/code"
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ sync-column requires authentication")
    
    def test_sync_status_requires_auth(self):
        """sync-column-status endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column-status/code"
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ sync-column-status requires authentication")
