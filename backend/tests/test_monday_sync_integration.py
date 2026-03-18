"""
Monday.com Sync Integration Tests
Tests: webhook challenge, webhook events, sync-order, inventory-config, status-mapping, webhooks/config
Also tests chat updates with has_monday_item flag and auth_users lookup fix
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ========== AUTH FIXTURES ==========

@pytest.fixture(scope="module")
def client_token():
    """Get client user token (test@client.com)"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "test@client.com", "password": "password"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Client login failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def admin_token():
    """Get admin user token (admin@libreria.com)"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@libreria.com", "password": "admin"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


# ========== WEBHOOK ENDPOINT TESTS (PUBLIC) ==========

class TestWebhookEndpoint:
    """Tests for POST /api/store/monday/webhooks/subitem-status"""

    def test_webhook_challenge_verification(self):
        """Monday.com sends challenge on first registration, app should echo it back"""
        challenge_value = f"test_challenge_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/store/monday/webhooks/subitem-status",
            json={"challenge": challenge_value}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "challenge" in data, f"Response should contain 'challenge' key: {data}"
        assert data["challenge"] == challenge_value, f"Challenge mismatch: expected {challenge_value}, got {data['challenge']}"

    def test_webhook_event_no_event_data(self):
        """Webhook with empty body returns no_event"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/webhooks/subitem-status",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "no_event" or "challenge" not in data

    def test_webhook_event_missing_pulse_id(self):
        """Webhook event without pulseId should not process"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/webhooks/subitem-status",
            json={"event": {"columnId": "status", "value": {"label": {"text": "Done"}}}}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("processed") == False or "reason" in data


# ========== SYNC ORDER TESTS (Authenticated) ==========

class TestSyncOrder:
    """Tests for POST /api/store/monday/sync-order/{order_id}"""

    def test_sync_order_not_linked(self, client_token):
        """Order without monday_item_ids should return synced:false"""
        # Using test order that has no Monday.com link
        order_id = "ord_2f069060c203"
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync-order/{order_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("synced") == False, f"Expected synced=False for unlinked order: {data}"
        assert "reason" in data or "not linked" in str(data).lower()

    def test_sync_order_not_found(self, client_token):
        """Non-existent order should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync-order/ord_nonexistent_123",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent order: {response.status_code}"

    def test_sync_order_unauthorized(self):
        """Sync order without token should return 401"""
        response = requests.post(f"{BASE_URL}/api/store/monday/sync-order/ord_2f069060c203")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated: {response.status_code}"


# ========== INVENTORY CONFIG TESTS (Admin only) ==========

class TestInventoryConfig:
    """Tests for GET/PUT /api/store/monday/inventory-config"""

    def test_get_inventory_config_admin(self, admin_token):
        """Admin can get inventory config"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should get 200: {response.status_code} - {response.text}"
        data = response.json()
        # Check default structure
        assert "board_id" in data or "enabled" in data or "column_mapping" in data

    def test_get_inventory_config_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/inventory-config",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code in [401, 403], f"Non-admin should get 403: {response.status_code}"

    def test_put_inventory_config_admin(self, admin_token):
        """Admin can save inventory config"""
        test_config = {
            "board_id": "test_board_123",
            "enabled": False,
            "column_mapping": {
                "code": "text_col_1",
                "name": "text_col_2",
                "ordered_count": "numbers_col_1"
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/store/monday/inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should save config: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True

    def test_put_inventory_config_non_admin(self, client_token):
        """Non-admin should get 403 on PUT"""
        response = requests.put(
            f"{BASE_URL}/api/store/monday/inventory-config",
            json={"enabled": True},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code in [401, 403]


# ========== STATUS MAPPING TESTS (Admin only) ==========

class TestStatusMapping:
    """Tests for GET/PUT /api/store/monday/status-mapping"""

    def test_get_status_mapping_admin(self, admin_token):
        """Admin can get status mapping with available_statuses"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/status-mapping",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should get 200: {response.status_code}"
        data = response.json()
        assert "mapping" in data, f"Response should have 'mapping': {data}"
        assert "available_statuses" in data, f"Response should have 'available_statuses': {data}"
        # Check available statuses list
        available = data.get("available_statuses", [])
        assert "ordered" in available or "processing" in available or "delivered" in available

    def test_get_status_mapping_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/status-mapping",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code in [401, 403]

    def test_put_status_mapping_admin(self, admin_token):
        """Admin can save status mapping"""
        test_mapping = {
            "mapping": {
                "Test Status": "processing",
                "Done": "delivered"
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/store/monday/status-mapping",
            json=test_mapping,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should save mapping: {response.status_code}"
        data = response.json()
        assert data.get("success") == True


# ========== WEBHOOK CONFIG TESTS (Admin only) ==========

class TestWebhookConfig:
    """Tests for GET /api/store/monday/webhooks/config"""

    def test_get_webhook_config_admin(self, admin_token):
        """Admin can get webhook config"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/webhooks/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should get 200: {response.status_code}"
        data = response.json()
        # Check default structure - should have webhook_id, webhook_url
        assert "webhook_id" in data or "webhook_url" in data or "registered_at" in data

    def test_get_webhook_config_non_admin(self, client_token):
        """Non-admin should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/webhooks/config",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code in [401, 403]


# ========== CHAT UPDATES TESTS (has_monday_item bug fix verification) ==========

class TestChatUpdates:
    """Tests for GET/POST /api/store/textbook-orders/{order_id}/updates"""

    def test_get_updates_has_monday_item_false(self, client_token):
        """Orders without monday_item_ids should return has_monday_item=false"""
        order_id = "ord_2f069060c203"  # Test order with no Monday link
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/{order_id}/updates",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Expected 200: {response.status_code}"
        data = response.json()
        assert "has_monday_item" in data, f"Response should have 'has_monday_item': {data}"
        assert data["has_monday_item"] == False, f"Expected has_monday_item=False: {data}"
        assert "updates" in data

    def test_post_update_correct_author_name(self, client_token):
        """Posted message should have author_name from auth_users collection"""
        order_id = "ord_2f069060c203"
        test_message = f"Test message from pytest {uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{order_id}/updates",
            json={"message": test_message},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Expected 200: {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("monday_posted") == False  # No Monday link
        
        # Verify author_name is set correctly (should be 'Test Client' not 'Client' or empty)
        message_data = data.get("message", {})
        author_name = message_data.get("author_name", "")
        assert author_name and author_name != "User" and author_name != "Client", f"author_name should be user's actual name, got: {author_name}"


# ========== END-TO-END FLOW TEST ==========

class TestEndToEndFlow:
    """Integration test: verify webhook -> sync -> updates flow"""

    def test_full_webhook_flow(self):
        """Test webhook challenge and event processing"""
        # 1. Test challenge response
        challenge = f"e2e_test_{uuid.uuid4().hex[:8]}"
        resp1 = requests.post(
            f"{BASE_URL}/api/store/monday/webhooks/subitem-status",
            json={"challenge": challenge}
        )
        assert resp1.status_code == 200
        assert resp1.json().get("challenge") == challenge
        
        # 2. Test event with unknown subitem (should return processed=False)
        resp2 = requests.post(
            f"{BASE_URL}/api/store/monday/webhooks/subitem-status",
            json={
                "event": {
                    "pulseId": "999999999",
                    "columnId": "status",
                    "value": {"label": {"text": "Done"}}
                }
            }
        )
        assert resp2.status_code == 200
        data = resp2.json()
        # Should not crash, just indicate not found or not processed
        assert "processed" in data or "status" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
