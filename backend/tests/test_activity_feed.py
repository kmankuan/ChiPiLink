"""
Backend tests for Activity Feed API
Tests GET /admin/activity-feed, GET /admin/activity-feed/settings, PUT /admin/activity-feed/settings
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@chipi.co", "password": "admin"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(admin_token):
    """Auth headers for requests"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestActivityFeedEndpoints:
    """Activity Feed API tests"""

    def test_get_activity_feed_default(self, auth_headers):
        """GET /admin/activity-feed returns events from multiple collections"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "events" in data, "Response should contain 'events' field"
        assert "total" in data, "Response should contain 'total' field"
        assert "date_from" in data, "Response should contain 'date_from' field"
        assert "date_to" in data, "Response should contain 'date_to' field"
        assert "event_type_meta" in data, "Response should contain 'event_type_meta' field"
        
        # Verify events structure
        if len(data["events"]) > 0:
            event = data["events"][0]
            assert "type" in event, "Event should have 'type' field"
            assert "timestamp" in event, "Event should have 'timestamp' field"
            assert "title" in event, "Event should have 'title' field"
        
        print(f"PASS: Activity feed returned {data['total']} events")

    def test_get_activity_feed_date_filter(self, auth_headers):
        """GET /admin/activity-feed?date_from=X filters events by date range"""
        # Filter to last 1 day
        date_from = (datetime.utcnow() - timedelta(days=1)).isoformat()
        
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            params={"date_from": date_from},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "events" in data
        assert "total" in data
        
        # Verify date filter was applied
        assert data["date_from"] == date_from or data["date_from"].startswith(date_from[:10])
        print(f"PASS: Date filter returned {data['total']} events for last 1 day")

    def test_get_activity_feed_event_type_filter(self, auth_headers):
        """GET /admin/activity-feed?event_types=order_submitted,user_registered filters by event type"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            params={"event_types": "order_submitted,user_registered"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "events" in data
        
        # Verify only filtered types are returned
        for event in data["events"]:
            assert event["type"] in ["order_submitted", "user_registered"], \
                f"Unexpected event type: {event['type']}"
        
        print(f"PASS: Event type filter returned {data['total']} events (order_submitted, user_registered)")

    def test_get_activity_feed_limit(self, auth_headers):
        """GET /admin/activity-feed?limit=10 limits results"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            params={"limit": 10},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["events"]) <= 10, f"Expected max 10 events, got {len(data['events'])}"
        print(f"PASS: Limit filter returned {len(data['events'])} events (max 10)")

    def test_get_activity_feed_settings(self, auth_headers):
        """GET /admin/activity-feed/settings returns default settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "enabled_types" in data, "Response should contain 'enabled_types' field"
        assert "auto_refresh_seconds" in data, "Response should contain 'auto_refresh_seconds' field"
        assert isinstance(data["enabled_types"], list), "enabled_types should be a list"
        assert isinstance(data["auto_refresh_seconds"], int), "auto_refresh_seconds should be int"
        
        print(f"PASS: Settings returned with {len(data['enabled_types'])} enabled types")

    def test_update_activity_feed_settings(self, auth_headers):
        """PUT /admin/activity-feed/settings updates settings"""
        # Get current settings first
        current_response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=auth_headers
        )
        original_settings = current_response.json()
        
        # Update to test settings
        test_settings = {
            "enabled_types": ["order_submitted", "user_registered"],
            "auto_refresh_seconds": 60
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            json=test_settings,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update was applied
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=auth_headers
        )
        updated_data = verify_response.json()
        assert updated_data["enabled_types"] == ["order_submitted", "user_registered"]
        assert updated_data["auto_refresh_seconds"] == 60
        
        # Restore original settings
        requests.put(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            json=original_settings,
            headers=auth_headers
        )
        
        print("PASS: Settings update and verification successful")

    def test_get_activity_feed_unauthorized(self):
        """GET /admin/activity-feed without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/activity-feed")
        assert response.status_code in [401, 403, 422], \
            f"Expected 401/403/422 for unauthorized, got {response.status_code}"
        print("PASS: Unauthorized request correctly rejected")

    def test_activity_feed_event_type_meta(self, auth_headers):
        """Verify event_type_meta contains correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        meta = data.get("event_type_meta", {})
        
        # Verify expected event types are in meta
        expected_types = [
            "order_submitted", "order_status_changed", "access_request",
            "user_registered", "wallet_topup", "wallet_transaction",
            "crm_message", "monday_sync"
        ]
        
        for event_type in expected_types:
            assert event_type in meta, f"Missing event type in meta: {event_type}"
            assert "icon" in meta[event_type], f"Missing 'icon' for {event_type}"
            assert "color" in meta[event_type], f"Missing 'color' for {event_type}"
            assert "label" in meta[event_type], f"Missing 'label' for {event_type}"
        
        print(f"PASS: event_type_meta contains {len(meta)} event types with proper structure")
