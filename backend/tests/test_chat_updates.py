"""
Chat/Updates Feature Tests for Textbook Orders
Tests the Monday.com chat integration endpoints:
- GET /api/store/textbook-orders/{order_id}/updates - Get messages
- POST /api/store/textbook-orders/{order_id}/updates - Post a message

Key features:
1. has_monday_item should be false for orders without monday_item_ids
2. Messages stored locally regardless of Monday.com link
3. Author name should show real user name (Test Client) not 'Client'
4. Messages appear in chronological order
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test data
TEST_EMAIL = "test@client.com"
TEST_PASSWORD = "password"
TEST_ORDER_ID_BETA = "ord_2f069060c203"  # Test Student Beta
TEST_ORDER_ID_ALPHA = "ord_a3480a98d56d"  # Test Student Alpha


class TestChatFeature:
    """Tests for chat/updates feature on textbook orders"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        self.user_name = data.get("user", {}).get("name", "")
        
        if not self.token:
            pytest.skip("No token received from login")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"Logged in as {TEST_EMAIL}, user_name: {self.user_name}")

    def test_login_returns_user_name(self):
        """Test that login returns the correct user name 'Test Client'"""
        # Re-login to check name
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # User info should contain name
        user = data.get("user", {})
        assert user.get("name") == "Test Client", f"Expected 'Test Client', got '{user.get('name')}'"
        print(f"Login returns correct user name: {user.get('name')}")

    def test_get_updates_without_monday_item(self):
        """Test GET /api/store/textbook-orders/{order_id}/updates returns has_monday_item=false"""
        response = self.session.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have has_monday_item field that is FALSE (no monday_item_ids)
        assert "has_monday_item" in data, "Response should contain 'has_monday_item' field"
        assert data["has_monday_item"] is False, f"Expected has_monday_item=False, got {data['has_monday_item']}"
        
        # Should have updates array (may be empty)
        assert "updates" in data, "Response should contain 'updates' field"
        assert isinstance(data["updates"], list), "updates should be a list"
        
        print(f"GET updates for {TEST_ORDER_ID_BETA}: has_monday_item={data['has_monday_item']}, updates_count={len(data['updates'])}")

    def test_get_updates_second_order(self):
        """Test GET updates for second order (Alpha) also returns has_monday_item=false"""
        response = self.session.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_ALPHA}/updates"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should also have has_monday_item=false
        assert data["has_monday_item"] is False, f"Expected has_monday_item=False, got {data['has_monday_item']}"
        print(f"GET updates for {TEST_ORDER_ID_ALPHA}: has_monday_item={data['has_monday_item']}")

    def test_post_message_stores_locally_and_returns_author_name(self):
        """Test POST message stores locally with correct author_name 'Test Client'"""
        test_message = f"Test message from pytest {uuid.uuid4().hex[:8]}"
        
        response = self.session.post(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates",
            json={"message": test_message}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check response structure
        assert data.get("success") is True, "Response should have success=True"
        assert "message" in data, "Response should contain 'message' object"
        
        # Verify the stored message
        message_obj = data["message"]
        assert message_obj.get("message") == test_message, f"Message text mismatch"
        assert message_obj.get("author_name") == "Test Client", f"Expected author_name='Test Client', got '{message_obj.get('author_name')}'"
        assert "message_id" in message_obj, "Message should have message_id"
        assert "created_at" in message_obj, "Message should have created_at timestamp"
        
        # monday_posted should be false (no monday_item_ids)
        assert message_obj.get("monday_posted") is False, f"Expected monday_posted=False (no monday link)"
        
        print(f"POST message success: author_name={message_obj['author_name']}, monday_posted={message_obj['monday_posted']}")

    def test_posted_message_appears_in_get_updates(self):
        """Test that posted message appears when fetching updates"""
        unique_text = f"Verifiable message {uuid.uuid4().hex[:8]}"
        
        # Post a message
        post_response = self.session.post(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates",
            json={"message": unique_text}
        )
        assert post_response.status_code == 200
        
        # Fetch updates
        get_response = self.session.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates"
        )
        assert get_response.status_code == 200
        
        data = get_response.json()
        updates = data.get("updates", [])
        
        # Find our message in updates
        found_message = None
        for update in updates:
            if update.get("body") == unique_text:
                found_message = update
                break
        
        assert found_message is not None, f"Posted message '{unique_text}' not found in updates"
        assert found_message.get("author") == "Test Client", f"Expected author='Test Client', got '{found_message.get('author')}'"
        assert found_message.get("is_staff") is False, "User messages should have is_staff=False"
        
        print(f"Message found in updates: body={found_message['body']}, author={found_message['author']}")

    def test_messages_chronological_order(self):
        """Test that messages are returned in chronological order"""
        # Post multiple messages quickly
        messages = []
        for i in range(3):
            msg_text = f"Chrono test {i} - {uuid.uuid4().hex[:6]}"
            messages.append(msg_text)
            response = self.session.post(
                f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates",
                json={"message": msg_text}
            )
            assert response.status_code == 200

        # Fetch updates
        get_response = self.session.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates"
        )
        assert get_response.status_code == 200
        
        data = get_response.json()
        updates = data.get("updates", [])
        
        # Find our messages and verify order
        found_indices = []
        for update in updates:
            for i, msg in enumerate(messages):
                if update.get("body") == msg:
                    found_indices.append(i)
        
        # Verify chronological order (indices should be in ascending order)
        assert found_indices == sorted(found_indices), f"Messages not in chronological order: {found_indices}"
        print(f"Messages appear in chronological order: {found_indices}")

    def test_empty_message_rejected(self):
        """Test that empty messages are rejected with 400"""
        response = self.session.post(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates",
            json={"message": ""}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        print("Empty message correctly rejected with 400")

    def test_whitespace_only_message_rejected(self):
        """Test that whitespace-only messages are rejected"""
        response = self.session.post(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates",
            json={"message": "   "}
        )
        
        assert response.status_code == 400, f"Expected 400 for whitespace message, got {response.status_code}"
        print("Whitespace-only message correctly rejected with 400")

    def test_unauthorized_access_denied(self):
        """Test that requests without token are denied"""
        # Create a new session without auth
        unauth_session = requests.Session()
        
        response = unauth_session.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ID_BETA}/updates"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"Unauthorized access correctly denied: {response.status_code}")

    def test_nonexistent_order_returns_404(self):
        """Test that non-existent order returns 404"""
        fake_order_id = "ord_nonexistent_12345"
        
        response = self.session.get(
            f"{BASE_URL}/api/store/textbook-orders/{fake_order_id}/updates"
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        print("Non-existent order correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
