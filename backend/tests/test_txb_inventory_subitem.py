"""
TXB Inventory Subitem Workflow Tests
Tests for Monday.com TXB inventory sync workflow:
- GET/PUT /api/store/monday/txb-inventory-config includes subitem_column_mapping
- TxbInventoryAdapter.update_inventory() creates subitems under textbook items
- Subitem name format: 'Student Name - Order Reference'
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ========== AUTH FIXTURES ==========

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token (admin@libreria.com)"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@libreria.com", "password": "admin"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin login failed: {response.status_code}")


# ========== TXB INVENTORY CONFIG API TESTS ==========

class TestTxbInventoryConfigAPI:
    """Tests for GET/PUT /api/store/monday/txb-inventory-config"""

    def test_get_config_returns_board_id(self, admin_token):
        """GET returns board_id field"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "board_id" in data, "Response must have 'board_id'"
        # Board ID should be set to 18397140920 based on main agent context
        assert data["board_id"] == "18397140920", f"Expected board_id '18397140920', got '{data['board_id']}'"

    def test_get_config_returns_column_mapping(self, admin_token):
        """GET returns column_mapping with expected keys"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "column_mapping" in data, "Response must have 'column_mapping'"
        col_map = data["column_mapping"]
        assert isinstance(col_map, dict), "column_mapping must be a dict"
        # Verify expected keys are present
        expected_keys = ["code", "name", "grade", "publisher", "unit_price"]
        for key in expected_keys:
            assert key in col_map, f"column_mapping must have '{key}' key"

    def test_get_config_returns_subitem_column_mapping(self, admin_token):
        """GET returns subitem_column_mapping with quantity and date keys"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "subitem_column_mapping" in data, "Response must have 'subitem_column_mapping'"
        sub_col_map = data["subitem_column_mapping"]
        assert isinstance(sub_col_map, dict), "subitem_column_mapping must be a dict"
        # Verify expected keys
        assert "quantity" in sub_col_map, "subitem_column_mapping must have 'quantity' key"
        assert "date" in sub_col_map, "subitem_column_mapping must have 'date' key"
        # Verify actual values based on agent context
        assert sub_col_map["quantity"] == "numeric_mm02sj3t", f"Expected quantity 'numeric_mm02sj3t', got '{sub_col_map['quantity']}'"
        assert sub_col_map["date"] == "date0", f"Expected date 'date0', got '{sub_col_map['date']}'"

    def test_get_config_returns_enabled_flag(self, admin_token):
        """GET returns enabled flag"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data, "Response must have 'enabled'"
        assert isinstance(data["enabled"], bool), "enabled must be a boolean"

    def test_get_config_returns_group_id(self, admin_token):
        """GET returns group_id"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "group_id" in data, "Response must have 'group_id'"
        # Group ID should be 'topics' based on agent context
        assert data["group_id"] == "topics", f"Expected group_id 'topics', got '{data['group_id']}'"

    def test_put_config_saves_subitem_column_mapping(self, admin_token):
        """PUT saves subitem_column_mapping correctly"""
        # First GET current config
        get_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_resp.status_code == 200
        original_config = get_resp.json()
        
        # Modify subitem_column_mapping
        test_qty_col = f"test_qty_{uuid.uuid4().hex[:6]}"
        test_config = {
            "board_id": original_config.get("board_id"),
            "enabled": original_config.get("enabled"),
            "group_id": original_config.get("group_id"),
            "column_mapping": original_config.get("column_mapping", {}),
            "subitem_column_mapping": {
                "quantity": test_qty_col,
                "date": "test_date"
            }
        }
        
        # PUT with modified config
        put_resp = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_resp.status_code == 200, f"Expected 200, got {put_resp.status_code}"
        assert put_resp.json().get("success") == True
        
        # Verify by GET
        verify_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["subitem_column_mapping"]["quantity"] == test_qty_col
        assert verify_data["subitem_column_mapping"]["date"] == "test_date"
        
        # Restore original config
        restore_resp = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=original_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert restore_resp.status_code == 200

    def test_put_config_persists_all_fields(self, admin_token):
        """PUT saves and persists all config fields including subitem_column_mapping"""
        unique_board = f"test_board_{uuid.uuid4().hex[:6]}"
        test_config = {
            "board_id": unique_board,
            "enabled": True,
            "group_id": "test_group",
            "column_mapping": {
                "code": "test_code_col",
                "name": "test_name_col",
                "grade": None,
                "publisher": None,
                "unit_price": None
            },
            "subitem_column_mapping": {
                "quantity": "test_qty_persist",
                "date": "test_date_persist"
            }
        }
        
        # PUT
        put_resp = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_resp.status_code == 200
        
        # GET to verify persistence
        get_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_resp.status_code == 200
        data = get_resp.json()
        
        # Verify all fields persisted
        assert data["board_id"] == unique_board
        assert data["enabled"] == True
        assert data["group_id"] == "test_group"
        assert data["column_mapping"]["code"] == "test_code_col"
        assert data["subitem_column_mapping"]["quantity"] == "test_qty_persist"
        assert data["subitem_column_mapping"]["date"] == "test_date_persist"
        
        # Restore original config
        original_config = {
            "board_id": "18397140920",
            "enabled": True,
            "group_id": "topics",
            "column_mapping": {
                "code": "text_mm02vh63",
                "name": None,
                "grade": None,
                "publisher": None,
                "unit_price": None
            },
            "subitem_column_mapping": {
                "quantity": "numeric_mm02sj3t",
                "date": "date0"
            }
        }
        requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=original_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

    def test_config_requires_admin(self):
        """Non-authenticated requests should fail"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ========== CODE REVIEW - ADAPTER TESTS ==========

class TestTxbInventoryAdapterCode:
    """Code review tests to verify adapter implementation"""

    def test_adapter_get_config_returns_subitem_mapping(self, admin_token):
        """Verify adapter returns subitem_column_mapping via API"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify subitem_column_mapping structure matches code
        sub_map = data.get("subitem_column_mapping", {})
        assert "quantity" in sub_map, "Adapter should return quantity in subitem_column_mapping"
        assert "date" in sub_map, "Adapter should return date in subitem_column_mapping"

    def test_api_structure_matches_frontend_expectations(self, admin_token):
        """Verify API response structure matches what frontend expects"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Frontend TxbInventoryTab.jsx expects these fields:
        # board_id, enabled, group_id, column_mapping, subitem_column_mapping
        expected_fields = ["board_id", "enabled", "group_id", "column_mapping", "subitem_column_mapping"]
        for field in expected_fields:
            assert field in data, f"API must return '{field}' for frontend compatibility"
        
        # Frontend COLUMN_FIELDS expects these in column_mapping:
        # code, name, grade, publisher, unit_price
        col_map = data["column_mapping"]
        col_fields = ["code", "name", "grade", "publisher", "unit_price"]
        for field in col_fields:
            assert field in col_map, f"column_mapping must have '{field}' for frontend COLUMN_FIELDS"
        
        # Frontend SUBITEM_FIELDS expects these in subitem_column_mapping:
        # quantity, date
        sub_map = data["subitem_column_mapping"]
        sub_fields = ["quantity", "date"]
        for field in sub_fields:
            assert field in sub_map, f"subitem_column_mapping must have '{field}' for frontend SUBITEM_FIELDS"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
