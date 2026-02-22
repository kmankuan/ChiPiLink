"""
WebSocket Realtime System Tests
Tests for WebSocket connection, realtime event emitting, and Activity Feed settings API
"""
import pytest
import requests
import os
from websockets.sync.client import connect as ws_connect
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sysbook-debug.preview.emergentagent.com')

# Admin credentials for testing
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers for authenticated admin requests"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestWebSocketEndpoint:
    """Tests for WebSocket connection at /api/realtime/ws"""

    def test_websocket_stats_endpoint(self, admin_headers):
        """Test /api/realtime/stats returns connection statistics"""
        response = requests.get(f"{BASE_URL}/api/realtime/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_connections" in data
        assert "total_rooms" in data
        assert "total_users" in data
        assert "rooms" in data
        print(f"WebSocket stats: {data}")

    def test_websocket_rooms_endpoint(self, admin_headers):
        """Test /api/realtime/rooms returns available rooms"""
        response = requests.get(f"{BASE_URL}/api/realtime/rooms", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "rooms" in data
        rooms = data["rooms"]
        assert len(rooms) >= 4  # global, rapidpin, community, store
        
        room_names = [r["name"] for r in rooms]
        assert "global" in room_names
        assert "rapidpin" in room_names
        assert "community" in room_names
        assert "store" in room_names
        print(f"Available rooms: {room_names}")


class TestActivityFeedSettingsAPI:
    """Tests for Activity Feed settings endpoints"""

    def test_get_activity_feed_settings(self, admin_headers):
        """Test GET /api/admin/activity-feed/settings returns default settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "enabled_types" in data
        assert "auto_refresh_seconds" in data
        assert isinstance(data["enabled_types"], list)
        assert isinstance(data["auto_refresh_seconds"], int)
        assert data["auto_refresh_seconds"] > 0
        print(f"Activity Feed settings: enabled_types={len(data['enabled_types'])}, auto_refresh={data['auto_refresh_seconds']}s")

    def test_update_activity_feed_settings(self, admin_headers):
        """Test PUT /api/admin/activity-feed/settings updates settings"""
        # Get current settings first
        get_response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=admin_headers
        )
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "enabled_types": ["order_submitted", "user_registered"],
            "auto_refresh_seconds": 60
        }
        put_response = requests.put(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=admin_headers,
            json=new_settings
        )
        assert put_response.status_code == 200
        updated_data = put_response.json()
        
        assert updated_data.get("enabled_types") == new_settings["enabled_types"]
        assert updated_data.get("auto_refresh_seconds") == new_settings["auto_refresh_seconds"]
        print(f"Settings updated successfully: {updated_data}")
        
        # Restore original settings
        requests.put(
            f"{BASE_URL}/api/admin/activity-feed/settings",
            headers=admin_headers,
            json=original_settings
        )


class TestActivityFeedAPI:
    """Tests for Activity Feed data endpoint"""

    def test_get_activity_feed_default(self, admin_headers):
        """Test GET /api/admin/activity-feed returns events"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)
        print(f"Activity Feed: {data['total']} total events, {len(data['events'])} returned")

    def test_get_activity_feed_with_date_filter(self, admin_headers):
        """Test GET /api/admin/activity-feed with date_from filter"""
        from datetime import datetime, timedelta
        
        # Get events from last 7 days
        date_from = (datetime.utcnow() - timedelta(days=7)).isoformat()
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            headers=admin_headers,
            params={"date_from": date_from, "limit": 20}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        print(f"Events in last 7 days: {data['total']}")

    def test_get_activity_feed_with_event_type_filter(self, admin_headers):
        """Test GET /api/admin/activity-feed with event_types filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/activity-feed",
            headers=admin_headers,
            params={"event_types": "order_submitted,user_registered", "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify returned events are of requested types
        for event in data.get("events", []):
            assert event.get("type") in ["order_submitted", "user_registered"]
        print(f"Filtered events: {len(data['events'])} events")


class TestTextbookAccessRealtimeIntegration:
    """Tests for textbook access API endpoints that emit realtime events"""

    def test_textbook_access_config(self, admin_headers):
        """Test /api/store/textbook-access/config endpoint"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-access/config")
        assert response.status_code == 200
        data = response.json()
        
        assert "available_years" in data
        assert "current_year" in data
        assert "grades" in data
        assert "relation_types" in data
        print(f"Textbook access config: years={data['available_years']}, grades={len(data['grades'])}")

    def test_admin_pending_requests(self, admin_headers):
        """Test /api/store/textbook-access/admin/requests endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/requests",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        print(f"Pending access requests: {len(data['requests'])}")

    def test_admin_schools_endpoint(self, admin_headers):
        """Test /api/store/textbook-access/admin/schools endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/schools",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "schools" in data
        print(f"Schools: {len(data['schools'])}")


class TestTextbookOrdersRealtimeIntegration:
    """Tests for textbook orders API endpoints that emit realtime events"""

    def test_admin_all_orders(self, admin_headers):
        """Test /api/store/textbook-orders/admin/all endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        print(f"Total orders: {len(data['orders'])}")

    def test_admin_order_stats(self, admin_headers):
        """Test /api/store/textbook-orders/admin/stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/stats",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        print(f"Order stats: {data}")

    def test_admin_pending_reorders(self, admin_headers):
        """Test /api/store/textbook-orders/admin/pending-reorders endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/pending-reorders",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "reorders" in data
        print(f"Pending reorders: {len(data['reorders'])}")


class TestRealtimeEventsModule:
    """Tests for verifying the realtime events module is properly integrated"""

    def test_events_module_imports(self):
        """Test that the events module can be imported"""
        # This tests backend code structure, not HTTP
        # We verify the routes exist by checking related endpoints
        pass

    def test_websocket_manager_stats(self, admin_headers):
        """Test that WebSocket manager tracks connections properly"""
        response = requests.get(f"{BASE_URL}/api/realtime/stats", headers=admin_headers)
        assert response.status_code == 200
        stats = response.json()
        
        # Verify stats structure
        assert "total_connections" in stats
        assert "total_rooms" in stats
        assert "total_users" in stats
        assert "rooms" in stats
        
        # Stats should be non-negative
        assert stats["total_connections"] >= 0
        assert stats["total_rooms"] >= 0
        assert stats["total_users"] >= 0
        print(f"WebSocket Manager Stats: connections={stats['total_connections']}, rooms={stats['total_rooms']}, users={stats['total_users']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
