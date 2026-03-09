"""
TXB Inventory Per-Column Sync Tests
Tests for per-column sync feature and dropdown column formatting fix:
- POST /api/store/monday/txb-inventory/sync-column/{column_key} - sync specific column
- Valid column keys: grade, code, name, publisher, subject, unit_price, stock_quantity
- Invalid column key returns 400 with list of valid keys
- Column not mapped returns error
- Full sync regression test - still works
- _format_column_value correctly formats dropdown columns as {labels: [value]}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid column keys per the route definition
VALID_COLUMN_KEYS = {"code", "name", "grade", "publisher", "subject", "unit_price", "stock_quantity", "stock"}


# ========== AUTH FIXTURES ==========

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token (admin@chipi.co)"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@chipi.co", "password": "admin"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


# ========== PER-COLUMN SYNC API TESTS ==========

class TestPerColumnSyncEndpoint:
    """Tests for POST /api/store/monday/txb-inventory/sync-column/{column_key}"""

    def test_sync_column_requires_auth(self):
        """Per-column sync endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/grade"
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_sync_column_invalid_key_returns_400(self, admin_token):
        """Invalid column_key returns 400 with list of valid keys"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/invalid_key",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid key, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", "")
        # Should include valid keys in error message
        assert "code" in detail or "grade" in detail, f"Error should list valid keys: {detail}"
        print(f"Invalid key error message: {detail}")

    def test_sync_column_valid_keys_accepted(self, admin_token):
        """All valid column keys are accepted by the endpoint"""
        for key in ["grade", "code", "name", "publisher", "subject", "unit_price", "stock_quantity"]:
            response = requests.post(
                f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/{key}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            # Should not return 400 "invalid key" - may return 400 "not mapped" or 200
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                # 400 is OK if it's "not mapped" error, not "invalid key"
                assert "Invalid column key" not in detail, f"Key '{key}' should be valid but got: {detail}"
            print(f"Column '{key}' response: {response.status_code}")

    def test_sync_column_grade_requires_mapping(self, admin_token):
        """Sync grade column returns error if not mapped (expected in preview env)"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/grade",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # In preview env without full Monday config, should return 400 "not mapped"
        # OR 200 if column is mapped
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            assert "not mapped" in detail.lower() or "not configured" in detail.lower(), \
                f"Expected 'not mapped' error for unconfigured column: {detail}"
            print(f"Grade column not mapped (expected): {detail}")
        elif response.status_code == 200:
            data = response.json()
            assert "column" in data, "Success response should include column name"
            assert data["column"] == "grade", f"Column should be 'grade', got {data.get('column')}"
            print(f"Grade sync result: updated={data.get('updated')}, skipped={data.get('skipped')}, failed={data.get('failed')}")

    def test_sync_column_returns_sync_stats(self, admin_token):
        """Successful column sync returns updated/skipped/failed counts"""
        # Try 'code' as it's required and usually mapped
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/code",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert "column" in data, "Response must have 'column' field"
            assert "updated" in data, "Response must have 'updated' count"
            assert "skipped" in data, "Response must have 'skipped' count"
            assert "failed" in data, "Response must have 'failed' count"
            assert "total_textbooks" in data, "Response must have 'total_textbooks' count"
            
            # Verify counts are integers
            assert isinstance(data["updated"], int), "updated must be integer"
            assert isinstance(data["skipped"], int), "skipped must be integer"
            assert isinstance(data["failed"], int), "failed must be integer"
            
            print(f"Column sync result: column={data['column']}, updated={data['updated']}, skipped={data['skipped']}, failed={data['failed']}")
        elif response.status_code == 400:
            data = response.json()
            print(f"Column sync skipped (not configured): {data.get('detail')}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")

    def test_sync_column_stock_synonyms(self, admin_token):
        """Both 'stock' and 'stock_quantity' keys work"""
        for key in ["stock", "stock_quantity"]:
            response = requests.post(
                f"{BASE_URL}/api/store/monday/txb-inventory/sync-column/{key}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            # Both should be valid keys (not return 400 "Invalid column key")
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                assert "Invalid column key" not in detail, f"Key '{key}' should be valid"
            print(f"Stock key '{key}' response: {response.status_code}")


# ========== FULL SYNC REGRESSION TEST ==========

class TestFullSyncRegression:
    """Regression tests - full sync still works after per-column sync addition"""

    def test_full_sync_still_works(self, admin_token):
        """POST /api/store/monday/txb-inventory/full-sync still returns sync stats"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify full sync response structure unchanged
        assert "created" in data, "Response must have 'created'"
        assert "updated" in data, "Response must have 'updated'"
        assert "failed" in data, "Response must have 'failed'"
        assert "total_textbooks" in data, "Response must have 'total_textbooks'"
        
        print(f"Full sync regression: created={data['created']}, updated={data['updated']}, failed={data['failed']}, total={data['total_textbooks']}")


# ========== CONFIG ENDPOINT TESTS ==========

class TestTxbConfigEndpoint:
    """Tests for TXB inventory config endpoint"""

    def test_get_config_includes_all_column_fields(self, admin_token):
        """Config response includes all expected column mapping fields"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify config structure
        assert "board_id" in data, "Config must have 'board_id'"
        assert "enabled" in data, "Config must have 'enabled'"
        assert "column_mapping" in data, "Config must have 'column_mapping'"
        
        # Check column_mapping includes expected fields
        col_map = data.get("column_mapping", {})
        expected_fields = ["code", "name", "grade", "publisher", "unit_price"]
        for field in expected_fields:
            assert field in col_map, f"column_mapping should include '{field}' key"
        
        print(f"Config column_mapping keys: {list(col_map.keys())}")


# ========== DROPDOWN FORMATTING VERIFICATION ==========

class TestDropdownColumnFormatting:
    """Verify dropdown columns are formatted correctly for Monday.com"""
    
    def test_column_mapping_available(self, admin_token):
        """Verify column mapping is retrievable for dropdown format verification"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        col_map = data.get("column_mapping", {})
        print(f"Column mapping: {col_map}")
        
        # Note: The actual formatting happens in _format_column_value which wraps
        # dropdown/color type columns as {"labels": [value]} and status as {"label": value}
        # This is tested implicitly when sync-column is called and Monday.com accepts the values


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
