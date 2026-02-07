"""
Test P2: User Notifications - Unread count tracking and mark-as-read functionality
Tests:
- GET /api/store/textbook-orders/notifications/unread - returns total_unread and per_order counts
- POST /api/store/textbook-orders/{order_id}/updates/mark-read - marks messages as read
- POST /api/store/textbook-orders/{order_id}/updates - new message auto-includes sender in read_by
- 401 on notification endpoints without auth
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
CLIENT_EMAIL = "test@client.com"
CLIENT_PASSWORD = "password"

# Test orders (from seed data)
ORDER_WITH_UNREAD = "ord_a3480a98d56d"  # Has 1 unread message
ORDER_ALREADY_READ = "ord_2f069060c203"  # Already marked read


class TestNotificationsAuth:
    """Test authentication requirements for notification endpoints"""
    
    def test_unread_endpoint_requires_auth(self):
        """GET /notifications/unread should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/notifications/unread")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /notifications/unread returns 401 without auth")
    
    def test_mark_read_endpoint_requires_auth(self):
        """POST /mark-read should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_WITH_UNREAD}/updates/mark-read"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /mark-read returns 401 without auth")


class TestNotificationsUnreadCounts:
    """Test unread count retrieval"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for client user"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if not token:
            pytest.skip("No token in login response")
        return token
    
    def test_get_unread_counts_structure(self, auth_token):
        """GET /notifications/unread returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/notifications/unread",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_unread" in data, "Response should have 'total_unread' field"
        assert "per_order" in data, "Response should have 'per_order' field"
        assert isinstance(data["total_unread"], int), "total_unread should be integer"
        assert isinstance(data["per_order"], dict), "per_order should be dict"
        
        print(f"PASS: /notifications/unread returns structure with total_unread={data['total_unread']}, per_order keys={list(data['per_order'].keys())}")
    
    def test_unread_count_matches_per_order_sum(self, auth_token):
        """Total unread should equal sum of per-order counts"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/notifications/unread",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        expected_total = sum(data["per_order"].values())
        assert data["total_unread"] == expected_total, f"Total {data['total_unread']} should equal per_order sum {expected_total}"
        print(f"PASS: total_unread ({data['total_unread']}) equals sum of per_order ({expected_total})")


class TestMarkMessagesRead:
    """Test mark-as-read functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for client user"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if not token:
            pytest.skip("No token in login response")
        return token
    
    def test_mark_read_success(self, auth_token):
        """POST /mark-read should return success response"""
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_WITH_UNREAD}/updates/mark-read",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "marked_read" in data, "Response should have 'marked_read' field"
        print(f"PASS: /mark-read returns success with marked_read={data['marked_read']}")
    
    def test_mark_read_reduces_unread_count(self, auth_token):
        """After marking read, unread count for that order should be 0"""
        # First, check current unread counts
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/notifications/unread",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        initial_data = response.json()
        initial_count = initial_data["per_order"].get(ORDER_WITH_UNREAD, 0)
        
        # Mark as read
        mark_response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_WITH_UNREAD}/updates/mark-read",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert mark_response.status_code == 200
        
        # Check unread counts again
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/notifications/unread",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        final_data = response.json()
        final_count = final_data["per_order"].get(ORDER_WITH_UNREAD, 0)
        
        assert final_count == 0, f"After mark-read, order {ORDER_WITH_UNREAD} should have 0 unread, got {final_count}"
        print(f"PASS: After mark-read, order unread count went from {initial_count} to {final_count}")


class TestNewMessageAutoRead:
    """Test that new messages auto-include sender in read_by"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for client user"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if not token:
            pytest.skip("No token in login response")
        return token
    
    def test_post_message_includes_sender_in_read_by(self, auth_token):
        """POST /updates should auto-include sender in read_by"""
        # Post a new message
        test_message = "Test notification message for read_by check"
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ALREADY_READ}/updates",
            json={"message": test_message},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # The message doc should have read_by containing the sender
        message = data.get("message", {})
        read_by = message.get("read_by", [])
        assert len(read_by) > 0, "New message should have sender in read_by array"
        print(f"PASS: New message auto-includes sender in read_by: {read_by}")
    
    def test_sent_message_does_not_add_to_senders_unread(self, auth_token):
        """Messages sent by user should not increase their own unread count"""
        # Get initial unread
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/notifications/unread",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        initial_total = response.json()["total_unread"]
        
        # Send a message
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ALREADY_READ}/updates",
            json={"message": "Test message should not increase my unread"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Check unread again
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/notifications/unread",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        final_total = response.json()["total_unread"]
        
        assert final_total == initial_total, f"Sending own message should not increase unread: was {initial_total}, now {final_total}"
        print(f"PASS: Sending message did not increase own unread count (stayed at {initial_total})")


class TestInvalidOrderAccess:
    """Test access control for notification endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for client user"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if not token:
            pytest.skip("No token in login response")
        return token
    
    def test_mark_read_invalid_order(self, auth_token):
        """POST /mark-read with invalid order_id should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/invalid_order_123/updates/mark-read",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404 for invalid order, got {response.status_code}"
        print("PASS: /mark-read returns 404 for invalid order_id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
