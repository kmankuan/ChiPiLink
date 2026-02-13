"""
Test suite for Monday.com Banner Webhook Management endpoints
- GET /api/admin/showcase/monday-banners/webhook/status
- POST /api/admin/showcase/monday-banners/webhook/register
- POST /api/admin/showcase/monday-banners/webhook/unregister
- POST /api/monday/webhooks/incoming (challenge verification)

Plus verification that existing endpoints still work:
- GET /api/admin/showcase/monday-banners/auto-sync
- PUT /api/admin/showcase/monday-banners/auto-sync
- GET /api/admin/showcase/monday-banners/sync-history
- Banner CRUD
- Manual sync
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


def retry_request(func, max_retries=3, delay=2):
    """Retry request function on 5xx errors (Cloudflare intermittent issues)."""
    for attempt in range(max_retries):
        try:
            response = func()
            if response.status_code < 500:
                return response
            if attempt < max_retries - 1:
                print(f"Got {response.status_code}, retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Request failed: {e}, retrying...")
                time.sleep(delay)
            else:
                raise
    return response


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestWebhookStatus:
    """Tests for GET /api/admin/showcase/monday-banners/webhook/status"""
    
    def test_webhook_status_endpoint_returns_200(self, api_client):
        """Webhook status endpoint should return 200."""
        response = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/status"))
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        print(f"Webhook status endpoint returned 200")
    
    def test_webhook_status_returns_registered_field(self, api_client):
        """Webhook status should include 'registered' boolean."""
        response = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/status"))
        assert response.status_code == 200
        data = response.json()
        assert "registered" in data, f"'registered' field missing. Got: {data}"
        assert isinstance(data["registered"], bool), f"'registered' should be boolean. Got: {type(data['registered'])}"
        print(f"Webhook status: registered={data['registered']}")
    
    def test_webhook_status_returns_webhook_id_field(self, api_client):
        """Webhook status should include 'webhook_id' field."""
        response = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/status"))
        assert response.status_code == 200
        data = response.json()
        assert "webhook_id" in data, f"'webhook_id' field missing. Got: {data}"
        print(f"Webhook status: webhook_id={data['webhook_id']}")


class TestWebhookRegister:
    """Tests for POST /api/admin/showcase/monday-banners/webhook/register"""
    
    def test_webhook_register_endpoint_returns_response(self, api_client):
        """Webhook register endpoint should respond (may error if no board configured)."""
        response = retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/register"))
        # Expect 200 with status=error or status=ok
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        data = response.json()
        assert "status" in data, f"Response should have 'status' field. Got: {data}"
        print(f"Webhook register response: {data}")
    
    def test_webhook_register_without_board_returns_error(self, api_client):
        """Webhook register without board_id configured should return error."""
        # First check current config to see if board_id is set
        config_resp = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config"))
        config = config_resp.json()
        
        if not config.get("board_id"):
            # No board configured - should get error
            response = retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/register"))
            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "error", f"Expected status=error when no board_id. Got: {data}"
            assert "message" in data, f"Error response should have message. Got: {data}"
            print(f"Correctly returned error when no board_id: {data['message']}")
        else:
            # Board is configured, register may succeed or fail based on Monday API
            response = retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/register"))
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            print(f"Register response with board configured: {data}")


class TestWebhookUnregister:
    """Tests for POST /api/admin/showcase/monday-banners/webhook/unregister"""
    
    def test_webhook_unregister_endpoint_returns_200(self, api_client):
        """Webhook unregister endpoint should return 200."""
        response = retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/unregister"))
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        print(f"Webhook unregister returned 200")
    
    def test_webhook_unregister_returns_ok_status(self, api_client):
        """Webhook unregister should return status=ok."""
        response = retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/unregister"))
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok", f"Expected status=ok. Got: {data}"
        print(f"Webhook unregister status: {data['status']}")
    
    def test_webhook_status_after_unregister_shows_not_registered(self, api_client):
        """After unregister, webhook status should show registered=False."""
        # First unregister
        retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/unregister"))
        
        # Then check status
        response = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/webhook/status"))
        assert response.status_code == 200
        data = response.json()
        assert data.get("registered") == False, f"Expected registered=False after unregister. Got: {data}"
        assert data.get("webhook_id") is None, f"Expected webhook_id=None after unregister. Got: {data}"
        print(f"Webhook status after unregister: registered={data['registered']}, webhook_id={data['webhook_id']}")


class TestWebhookIncomingChallenge:
    """Tests for POST /api/monday/webhooks/incoming - challenge verification"""
    
    def test_webhook_incoming_challenge_returns_challenge(self, api_client):
        """Webhook incoming endpoint should echo back challenge for verification."""
        challenge_value = "test_challenge_12345"
        response = api_client.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={"challenge": challenge_value}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "challenge" in data, f"Response should contain 'challenge'. Got: {data}"
        assert data["challenge"] == challenge_value, f"Challenge should be echoed back. Expected: {challenge_value}, Got: {data['challenge']}"
        print(f"Challenge verification working: sent '{challenge_value}', received '{data['challenge']}'")
    
    def test_webhook_incoming_no_event_returns_no_event(self, api_client):
        """Webhook incoming without event should return no_event status."""
        response = api_client.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={"some_field": "value"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "no_event", f"Expected status=no_event. Got: {data}"
        print(f"No event handled correctly: {data}")


class TestExistingAutoSyncEndpoints:
    """Verify existing auto-sync endpoints still work"""
    
    def test_get_auto_sync_config_still_works(self, api_client):
        """GET /api/admin/showcase/monday-banners/auto-sync should still work."""
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "interval_minutes" in data
        assert "scheduler" in data
        print(f"Auto-sync GET still works: enabled={data['enabled']}, interval={data['interval_minutes']}")
    
    def test_put_auto_sync_config_still_works(self, api_client):
        """PUT /api/admin/showcase/monday-banners/auto-sync should still work."""
        # Get current state
        get_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        original = get_resp.json()
        
        # Update
        response = api_client.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": False, "interval_minutes": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"Auto-sync PUT still works: {data}")


class TestExistingSyncHistoryEndpoint:
    """Verify existing sync-history endpoint still works"""
    
    def test_get_sync_history_still_works(self, api_client):
        """GET /api/admin/showcase/monday-banners/sync-history should still work."""
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        print(f"Sync history GET still works: {len(data['history'])} entries")


class TestExistingBannerCRUD:
    """Verify existing banner CRUD still works"""
    
    def test_get_banners_admin_still_works(self, api_client):
        """GET /api/admin/showcase/banners should still work."""
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/banners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin banners GET still works: {len(data)} banners")
    
    def test_banner_crud_flow(self, api_client):
        """Create, read, delete banner flow should work."""
        # Create
        create_resp = api_client.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            json={
                "type": "text",
                "text": "TEST_webhook_test_banner",
                "bg_color": "#3b82f6",
                "active": True
            }
        )
        assert create_resp.status_code == 200
        created = create_resp.json()
        banner_id = created.get("banner_id")
        assert banner_id is not None
        print(f"Created test banner: {banner_id}")
        
        # Read
        read_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/banners")
        assert read_resp.status_code == 200
        banners = read_resp.json()
        found = any(b.get("banner_id") == banner_id for b in banners)
        assert found, f"Created banner {banner_id} not found in list"
        print(f"Verified banner exists in list")
        
        # Delete (cleanup)
        delete_resp = api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")
        assert delete_resp.status_code == 200
        print(f"Deleted test banner: {banner_id}")


class TestManualSyncWithTrigger:
    """Test that manual sync still works and behavior based on config state"""
    
    def test_manual_sync_returns_response(self, api_client):
        """POST /api/admin/showcase/monday-banners/sync should return proper response."""
        # Trigger manual sync
        sync_resp = retry_request(lambda: api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/sync"))
        assert sync_resp.status_code == 200
        sync_data = sync_resp.json()
        assert "status" in sync_data, f"Response should have status. Got: {sync_data}"
        print(f"Manual sync response: {sync_data}")
        
        # If Monday config is not enabled, will return 'skipped' which is correct behavior
        # If enabled but no valid board, will return 'error' and log to history
        # If enabled with valid board, will return 'ok' and log to history
        if sync_data.get("status") == "skipped":
            print("Manual sync skipped - Monday.com banner sync not configured (expected when disabled)")
        elif sync_data.get("status") == "error":
            print(f"Manual sync error - {sync_data.get('message', 'Unknown error')}")
            # Verify history was logged
            history_resp = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history"))
            history = history_resp.json().get("history", [])
            if history:
                assert history[0].get("trigger") == "manual", "Latest history entry should have trigger='manual'"
                print(f"History entry created with trigger={history[0].get('trigger')}")
        elif sync_data.get("status") == "ok":
            print(f"Manual sync succeeded - synced {sync_data.get('synced', 0)} items")
            # Verify history was logged
            history_resp = retry_request(lambda: api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history"))
            history = history_resp.json().get("history", [])
            if history:
                assert history[0].get("trigger") == "manual", "Latest history entry should have trigger='manual'"


class TestWebhookRegisteredHandlers:
    """Test GET /api/monday/webhooks/registered endpoint"""
    
    def test_registered_handlers_endpoint(self, api_client):
        """GET /api/monday/webhooks/registered should return list of boards."""
        response = api_client.get(f"{BASE_URL}/api/monday/webhooks/registered")
        assert response.status_code == 200
        data = response.json()
        assert "boards" in data
        assert "has_default" in data
        print(f"Registered handlers: boards={data['boards']}, has_default={data['has_default']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
