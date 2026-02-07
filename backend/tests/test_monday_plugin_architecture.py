"""
Monday.com Plugin/Adapter Architecture Tests
Tests for the refactored Monday.com integration:
- TXB Inventory Config (GET/PUT)
- Textbook Board Config (GET/PUT)
- Status Mapping with available_statuses (GET/PUT)
- Webhook Config (GET)
- Universal Webhook (/api/monday/webhooks/incoming)
- Store Webhook (/api/store/monday/webhooks/subitem-status)
- All-configs overview
- Sync-order for users
- Chat updates (GET/POST)
- Admin-only endpoint restrictions (403)
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

@pytest.fixture(scope="module")
def client_token():
    """Get client token (test@client.com)"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "test@client.com", "password": "password"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Client login failed: {response.status_code}")


# ========== TXB INVENTORY CONFIG (Admin only) ==========

class TestTxbInventoryConfig:
    """Tests for GET/PUT /api/store/monday/txb-inventory-config"""

    def test_get_txb_inventory_config_admin(self, admin_token):
        """Admin can get TXB inventory config with default structure"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify structure has required fields
        assert "board_id" in data
        assert "enabled" in data
        assert "column_mapping" in data
        # column_mapping should have keys for code, name, ordered_count, etc.
        if data["column_mapping"]:
            assert isinstance(data["column_mapping"], dict)

    def test_put_txb_inventory_config_admin(self, admin_token):
        """Admin can save TXB inventory config"""
        test_config = {
            "board_id": f"test_board_{uuid.uuid4().hex[:6]}",
            "enabled": True,
            "group_id": "test_group",
            "column_mapping": {
                "code": "text_code",
                "name": "text_name",
                "ordered_count": "numbers_count"
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json().get("success") == True

    def test_put_get_txb_inventory_config_round_trip(self, admin_token):
        """Verify PUT config is persisted and returned in GET"""
        unique_id = f"roundtrip_{uuid.uuid4().hex[:6]}"
        test_config = {
            "board_id": unique_id,
            "enabled": False,
            "column_mapping": {"code": "col_a", "ordered_count": "col_b"}
        }
        # PUT
        put_resp = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_resp.status_code == 200
        # GET
        get_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["board_id"] == unique_id
        assert data["enabled"] == False
        assert data["column_mapping"]["code"] == "col_a"

    def test_get_txb_inventory_config_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Non-admin should get 403, got {response.status_code}"

    def test_put_txb_inventory_config_non_admin(self, client_token):
        """Non-admin should get 403 on PUT"""
        response = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json={"enabled": True},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403


# ========== TEXTBOOK BOARD CONFIG (Admin only) ==========

class TestTextbookBoardConfig:
    """Tests for GET/PUT /api/store/monday/textbook-board-config"""

    def test_get_textbook_board_config_admin(self, admin_token):
        """Admin can get textbook board config"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/textbook-board-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify expected fields
        assert "board_id" in data
        assert "auto_sync" in data
        assert "column_mapping" in data
        assert "subitems_enabled" in data

    def test_put_textbook_board_config_admin(self, admin_token):
        """Admin can save textbook board config"""
        test_config = {
            "board_id": "textbook_test_board",
            "auto_sync": True,
            "subitems_enabled": True
        }
        response = requests.put(
            f"{BASE_URL}/api/store/monday/textbook-board-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.json().get("success") == True

    def test_get_textbook_board_config_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/textbook-board-config",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403


# ========== STATUS MAPPING (Admin only) ==========

class TestStatusMapping:
    """Tests for GET/PUT /api/store/monday/status-mapping"""

    def test_get_status_mapping_with_available_statuses(self, admin_token):
        """Status mapping response includes available_statuses array"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/status-mapping",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "mapping" in data, "Response must have 'mapping'"
        assert "available_statuses" in data, "Response must have 'available_statuses'"
        # Verify available_statuses is a non-empty list
        available = data["available_statuses"]
        assert isinstance(available, list)
        assert len(available) > 0
        # Check expected statuses are present
        expected_statuses = ["ordered", "processing", "ready_for_pickup", "delivered", "issue", "out_of_stock"]
        for status in expected_statuses:
            assert status in available, f"'{status}' should be in available_statuses"

    def test_put_status_mapping_saves_custom_mapping(self, admin_token):
        """Admin can save custom status mapping"""
        custom_mapping = {
            "mapping": {
                "Pendiente": "ordered",
                "Procesando": "processing",
                "Completado": "delivered",
                "Problema": "issue"
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/store/monday/status-mapping",
            json=custom_mapping,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.json().get("success") == True

    def test_get_status_mapping_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/status-mapping",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403


# ========== WEBHOOK CONFIG (Admin only) ==========

class TestWebhookConfig:
    """Tests for GET /api/store/monday/webhooks/config"""

    def test_get_webhook_config_admin(self, admin_token):
        """Admin can get webhook configuration"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/webhooks/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have webhook_id, webhook_url, registered_at
        assert "webhook_id" in data or "webhook_url" in data

    def test_get_webhook_config_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/webhooks/config",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403


# ========== WEBHOOK ENDPOINTS (Public) ==========

class TestWebhookEndpoints:
    """Tests for webhook challenge handling"""

    def test_store_webhook_challenge(self):
        """POST /api/store/monday/webhooks/subitem-status handles challenge"""
        challenge = f"challenge_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/store/monday/webhooks/subitem-status",
            json={"challenge": challenge}
        )
        assert response.status_code == 200
        assert response.json().get("challenge") == challenge

    def test_universal_webhook_challenge(self):
        """POST /api/monday/webhooks/incoming handles challenge (universal endpoint)"""
        challenge = f"universal_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={"challenge": challenge}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("challenge") == challenge

    def test_universal_webhook_no_event(self):
        """Universal webhook returns no_event for empty body"""
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        # Should indicate no event or just challenge not found
        assert data.get("status") == "no_event" or "challenge" not in data


# ========== ALL CONFIGS OVERVIEW (Admin only) ==========

class TestAllConfigsOverview:
    """Tests for GET /api/store/monday/all-configs"""

    def test_get_all_configs_admin(self, admin_token):
        """Admin gets store_configs and global_configs"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/all-configs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "store_configs" in data, "Response must have 'store_configs'"
        assert "global_configs" in data, "Response must have 'global_configs'"
        assert isinstance(data["store_configs"], list)
        assert isinstance(data["global_configs"], list)

    def test_get_all_configs_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/all-configs",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403


# ========== SYNC ORDER (Authenticated users) ==========

class TestSyncOrder:
    """Tests for POST /api/store/monday/sync-order/{order_id}"""

    def test_sync_order_works_for_user(self, client_token):
        """Regular user can trigger sync-order for their order"""
        order_id = "ord_2f069060c203"
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync-order/{order_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # For unlinked orders, should return synced=False with reason
        assert "synced" in data

    def test_sync_order_not_found(self, client_token):
        """Non-existent order returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync-order/ord_nonexistent_999",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404

    def test_sync_order_unauthorized(self):
        """Unauthenticated request returns 401"""
        response = requests.post(f"{BASE_URL}/api/store/monday/sync-order/ord_2f069060c203")
        assert response.status_code in [401, 403]


# ========== CHAT UPDATES (Authenticated users) ==========

class TestChatUpdates:
    """Tests for GET/POST /api/store/textbook-orders/{order_id}/updates"""

    def test_get_chat_updates(self, client_token):
        """User can get chat updates for their order"""
        order_id = "ord_2f069060c203"
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/{order_id}/updates",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "updates" in data
        assert "has_monday_item" in data
        assert isinstance(data["updates"], list)

    def test_post_chat_update(self, client_token):
        """User can post a chat message"""
        order_id = "ord_2f069060c203"
        test_msg = f"Test message {uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{order_id}/updates",
            json={"message": test_msg},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        # Verify author_name is set from auth_users
        msg_data = data.get("message", {})
        author_name = msg_data.get("author_name", "")
        assert author_name, "author_name should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
