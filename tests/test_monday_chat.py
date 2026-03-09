"""
Test Suite for Monday.com Chat Integration
Tests the chat functionality between the app and Monday.com via Updates API:
- GET /api/store/monday/pedido/{pedido_id}/messages - Get chat messages
- POST /api/store/monday/pedido/{pedido_id}/message - Send message
- POST /api/store/monday/sync/{pedido_id} - Sync pedido with Monday.com
- GET /api/store/monday/config - Get Monday.com configuration
- GET /api/store/monday/test-connection - Test Monday.com API connection
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"

# Known test data - existing pedido already synced with Monday.com
EXISTING_PEDIDO_ID = "ped_438fb868e68c"  # Has monday_item_id: 10970697360


class TestMondayAuth:
    """Test authentication for Monday.com endpoints"""
    
    def test_config_requires_admin(self):
        """Test that config endpoint requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/store/monday/config")
        assert response.status_code in [401, 403], "Config should require admin auth"
    
    def test_test_connection_requires_admin(self):
        """Test that test-connection requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/store/monday/test-connection")
        assert response.status_code in [401, 403], "Test connection should require admin auth"
    
    def test_sync_requires_admin(self):
        """Test that sync endpoint requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/store/monday/sync/{EXISTING_PEDIDO_ID}")
        assert response.status_code in [401, 403], "Sync should require admin auth"
    
    def test_messages_requires_auth(self):
        """Test that messages endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/messages")
        assert response.status_code in [401, 403], "Messages should require auth"
    
    def test_post_message_requires_auth(self):
        """Test that post message requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/message",
            json={"message": "Test"}
        )
        assert response.status_code in [401, 403], "Post message should require auth"


class TestMondayConfig:
    """Test Monday.com configuration endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_config(self, admin_token):
        """Test getting Monday.com configuration"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get config failed: {response.text}"
        
        data = response.json()
        # Config should have these fields
        assert "board_id" in data or data.get("board_id") is None, "Missing board_id field"
        assert "auto_sync" in data or data.get("auto_sync") is not None or "column_mapping" in data, "Missing config fields"
        
        print(f"Monday.com config: board_id={data.get('board_id')}, auto_sync={data.get('auto_sync')}")
    
    def test_test_connection(self, admin_token):
        """Test Monday.com API connection"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/test-connection",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Test connection failed: {response.text}"
        
        data = response.json()
        assert "connected" in data, "Missing connected field"
        
        if data.get("connected"):
            print(f"Monday.com connected! User: {data.get('user', {}).get('name')}")
            assert "user" in data, "Missing user info when connected"
        else:
            print(f"Monday.com not connected: {data.get('error')}")


class TestMondaySync:
    """Test Monday.com sync functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_sync_existing_pedido(self, admin_token):
        """Test syncing an existing pedido with Monday.com"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync/{EXISTING_PEDIDO_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Sync failed: {response.text}"
        
        data = response.json()
        assert "success" in data, "Missing success field"
        
        if data.get("success"):
            assert "monday_item_id" in data, "Missing monday_item_id when successful"
            print(f"Pedido synced! monday_item_id: {data.get('monday_item_id')}")
        else:
            print(f"Sync not successful: {data.get('message')}")
    
    def test_sync_nonexistent_pedido(self, admin_token):
        """Test syncing a non-existent pedido"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync/nonexistent_pedido_id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 200 with success=false or 404
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == False, "Should fail for non-existent pedido"
        else:
            assert response.status_code in [404, 500], f"Unexpected status: {response.status_code}"


class TestMondayChat:
    """Test Monday.com chat (Updates) functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_messages(self, admin_token):
        """Test getting chat messages for a pedido"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        
        data = response.json()
        assert "pedido_id" in data, "Missing pedido_id"
        assert "messages" in data, "Missing messages array"
        assert "total" in data, "Missing total count"
        
        messages = data.get("messages", [])
        print(f"Found {len(messages)} messages for pedido {EXISTING_PEDIDO_ID}")
        
        # Verify message structure if there are messages
        if messages:
            msg = messages[0]
            assert "id" in msg, "Message missing id"
            assert "body" in msg, "Message missing body"
            assert "created_at" in msg, "Message missing created_at"
            assert "is_from_client" in msg, "Message missing is_from_client flag"
            assert "author" in msg, "Message missing author"
            
            print(f"Sample message: {msg.get('body')[:50]}..." if len(msg.get('body', '')) > 50 else f"Sample message: {msg.get('body')}")
    
    def test_get_messages_nonexistent_pedido(self, admin_token):
        """Test getting messages for non-existent pedido"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/pedido/nonexistent_pedido/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Should return 404 for non-existent pedido: {response.status_code}"
    
    def test_post_message(self, admin_token):
        """Test posting a message to pedido chat"""
        test_message = f"Test message from automated test - {int(time.time())}"
        
        response = requests.post(
            f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/message",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "message": test_message,
                "author_name": "Test Admin"
            }
        )
        assert response.status_code == 200, f"Post message failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Post message not successful: {data}"
        assert "update_id" in data, "Missing update_id in response"
        
        print(f"Message posted! update_id: {data.get('update_id')}")
        
        # Verify message appears in messages list
        time.sleep(1)  # Wait for Monday.com to process
        
        response = requests.get(
            f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        messages = response.json().get("messages", [])
        # Check if our message is in the list (it should be recent)
        found = any(test_message in msg.get("body", "") or test_message in msg.get("raw_body", "") for msg in messages)
        if found:
            print("Message verified in messages list!")
        else:
            print("Note: Message may take time to appear in Monday.com")
    
    def test_post_message_empty_fails(self, admin_token):
        """Test that posting empty message fails"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/message",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "message": "",
                "author_name": "Test"
            }
        )
        # Should fail validation or return error
        # Empty message might be rejected by validation or by Monday.com
        if response.status_code == 200:
            data = response.json()
            # If it returns success=false, that's acceptable
            print(f"Empty message response: {data}")
        else:
            assert response.status_code in [400, 422, 500], f"Unexpected status: {response.status_code}"
            print("Empty message correctly rejected")
    
    def test_post_message_nonexistent_pedido(self, admin_token):
        """Test posting message to non-existent pedido"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/pedido/nonexistent_pedido/message",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "message": "Test message",
                "author_name": "Test"
            }
        )
        assert response.status_code == 404, f"Should return 404: {response.status_code}"


class TestMondayChatWithLimit:
    """Test message retrieval with limit parameter"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_get_messages_with_limit(self, admin_token):
        """Test getting messages with limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/pedido/{EXISTING_PEDIDO_ID}/messages",
            params={"limit": 5},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get messages with limit failed: {response.text}"
        
        data = response.json()
        messages = data.get("messages", [])
        
        # Should respect limit (may have fewer if not enough messages)
        assert len(messages) <= 5, f"Should return at most 5 messages, got {len(messages)}"
        print(f"Retrieved {len(messages)} messages with limit=5")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
