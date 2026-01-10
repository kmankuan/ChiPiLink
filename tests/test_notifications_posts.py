"""
Test suite for Push Notifications and Posts API
Tests notification categories, user preferences, provider config, and posts CRUD
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"


class TestSetup:
    """Setup fixtures for tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }


# ============== NOTIFICATION CATEGORIES TESTS ==============

class TestNotificationCategories(TestSetup):
    """Tests for notification categories endpoints"""
    
    def test_get_categories_public(self):
        """GET /api/notifications/categories - Get public categories"""
        response = requests.get(f"{BASE_URL}/api/notifications/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "categories" in data
        assert "count" in data
        assert isinstance(data["categories"], list)
        print(f"Found {data['count']} notification categories")
    
    def test_get_categories_with_inactive(self, admin_headers):
        """GET /api/notifications/categories?active_only=false - Include inactive"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/categories?active_only=false",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        print(f"Total categories (including inactive): {data['count']}")
    
    def test_create_category_admin(self, admin_headers):
        """POST /api/notifications/admin/categories - Create new category"""
        unique_id = uuid.uuid4().hex[:6]
        category_data = {
            "name": {
                "es": f"TEST_Categoría_{unique_id}",
                "en": f"TEST_Category_{unique_id}",
                "zh": f"TEST_类别_{unique_id}"
            },
            "description": {
                "es": "Descripción de prueba",
                "en": "Test description",
                "zh": "测试描述"
            },
            "icon": "🧪",
            "color": "#FF5733",
            "default_enabled": True,
            "default_provider": "auto",
            "priority": "normal",
            "module": "testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/categories",
            json=category_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "category" in data
        
        category = data["category"]
        assert "category_id" in category
        assert category["name"]["es"] == category_data["name"]["es"]
        assert category["icon"] == "🧪"
        assert category["color"] == "#FF5733"
        
        # Store for later tests
        TestNotificationCategories.created_category_id = category["category_id"]
        print(f"Created category: {category['category_id']}")
    
    def test_get_single_category(self, admin_headers):
        """GET /api/notifications/categories/{id} - Get specific category"""
        category_id = getattr(TestNotificationCategories, 'created_category_id', 'cat_announcements')
        
        response = requests.get(
            f"{BASE_URL}/api/notifications/categories/{category_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "category" in data
        assert data["category"]["category_id"] == category_id
        print(f"Retrieved category: {category_id}")
    
    def test_update_category_admin(self, admin_headers):
        """PUT /api/notifications/admin/categories/{id} - Update category"""
        category_id = getattr(TestNotificationCategories, 'created_category_id', None)
        if not category_id:
            pytest.skip("No test category created")
        
        updates = {
            "description": {
                "es": "Descripción actualizada",
                "en": "Updated description",
                "zh": "更新的描述"
            },
            "priority": "high"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/categories/{category_id}",
            json=updates,
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["category"]["priority"] == "high"
        print(f"Updated category: {category_id}")
    
    def test_get_category_not_found(self, admin_headers):
        """GET /api/notifications/categories/{id} - Non-existent category"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/categories/cat_nonexistent_xyz",
            headers=admin_headers
        )
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent category")


# ============== USER PREFERENCES TESTS ==============

class TestUserPreferences(TestSetup):
    """Tests for user notification preferences"""
    
    def test_get_preferences_requires_auth(self):
        """GET /api/notifications/preferences - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code == 401
        print("Correctly requires authentication")
    
    def test_get_preferences(self, admin_headers):
        """GET /api/notifications/preferences - Get user preferences"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "preferences" in data
        
        prefs = data["preferences"]
        assert "push_enabled" in prefs
        assert "email_enabled" in prefs
        assert "quiet_hours" in prefs
        assert "categories" in prefs
        print(f"User preferences: push={prefs['push_enabled']}, email={prefs['email_enabled']}")
    
    def test_update_preferences_push(self, admin_headers):
        """PUT /api/notifications/preferences - Update push setting"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json={"push_enabled": True},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["preferences"]["push_enabled"] is True
        print("Updated push_enabled preference")
    
    def test_update_preferences_email(self, admin_headers):
        """PUT /api/notifications/preferences - Update email setting"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json={"email_enabled": False},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["preferences"]["email_enabled"] is False
        print("Updated email_enabled preference")
    
    def test_update_preferences_quiet_hours(self, admin_headers):
        """PUT /api/notifications/preferences - Update quiet hours"""
        quiet_hours = {
            "enabled": True,
            "start": "23:00",
            "end": "07:00"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json={"quiet_hours": quiet_hours},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["preferences"]["quiet_hours"]["enabled"] is True
        print("Updated quiet hours preference")
    
    def test_update_preferences_no_data(self, admin_headers):
        """PUT /api/notifications/preferences - No updates provided"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json={},
            headers=admin_headers
        )
        assert response.status_code == 400
        print("Correctly rejected empty update")
    
    def test_update_category_preference(self, admin_headers):
        """PUT /api/notifications/preferences/category/{id} - Update category pref"""
        # Use a default category
        category_id = "cat_announcements"
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences/category/{category_id}",
            json={"enabled": True, "push": True, "email": False},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        print(f"Updated preference for category: {category_id}")


# ============== PROVIDER CONFIG TESTS (ADMIN) ==============

class TestProviderConfig(TestSetup):
    """Tests for provider configuration (admin only)"""
    
    def test_get_config_requires_admin(self):
        """GET /api/notifications/admin/config - Requires admin"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/config")
        assert response.status_code == 401
        print("Correctly requires admin authentication")
    
    def test_get_config(self, admin_headers):
        """GET /api/notifications/admin/config - Get provider config"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/config",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "config" in data
        
        config = data["config"]
        # Should have FCM and OneSignal configs
        assert "fcm" in config or "onesignal" in config or "config_id" in config
        print(f"Provider config retrieved: {list(config.keys())}")
    
    def test_update_fcm_config(self, admin_headers):
        """PUT /api/notifications/admin/config/fcm - Update FCM config"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/config/fcm",
            json={"enabled": False, "weight": 50},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        print("Updated FCM config")
    
    def test_update_onesignal_config(self, admin_headers):
        """PUT /api/notifications/admin/config/onesignal - Update OneSignal config"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/config/onesignal",
            json={"enabled": False, "weight": 50},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        print("Updated OneSignal config")
    
    def test_update_invalid_provider(self, admin_headers):
        """PUT /api/notifications/admin/config/{invalid} - Invalid provider"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/config/invalid_provider",
            json={"enabled": True},
            headers=admin_headers
        )
        assert response.status_code == 400
        print("Correctly rejected invalid provider")
    
    def test_update_config_no_data(self, admin_headers):
        """PUT /api/notifications/admin/config/fcm - No updates provided"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/admin/config/fcm",
            json={},
            headers=admin_headers
        )
        assert response.status_code == 400
        print("Correctly rejected empty update")


# ============== SEND NOTIFICATION TESTS (ADMIN) ==============

class TestSendNotification(TestSetup):
    """Tests for sending notifications (admin only)"""
    
    def test_send_notification_requires_admin(self):
        """POST /api/notifications/admin/send - Requires admin"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            json={"user_id": "test", "category_id": "test", "title": "Test", "body": "Test"}
        )
        assert response.status_code == 401
        print("Correctly requires admin authentication")
    
    def test_send_notification_no_devices(self, admin_headers):
        """POST /api/notifications/admin/send - User with no devices"""
        # Use admin user ID (no devices registered in test env)
        response = requests.post(
            f"{BASE_URL}/api/notifications/admin/send",
            json={
                "user_id": "62157036-6aae-41bc-96fc-f4c37aef94e9",
                "category_id": "cat_announcements",
                "title": "Test Notification",
                "body": "This is a test notification"
            },
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return success=False with reason "No devices registered"
        assert data.get("success") is False or data.get("reason") == "No devices registered"
        print(f"Send notification result: {data.get('reason', 'sent')}")


# ============== POSTS TESTS ==============

class TestPosts(TestSetup):
    """Tests for posts/announcements endpoints"""
    
    def test_get_public_posts(self):
        """GET /api/posts/ - Get published posts"""
        response = requests.get(f"{BASE_URL}/api/posts/")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "posts" in data
        assert "count" in data
        print(f"Found {data['count']} published posts")
    
    def test_get_admin_all_posts(self, admin_headers):
        """GET /api/posts/admin/all - Get all posts (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/posts/admin/all",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "posts" in data
        print(f"Admin view: {data['count']} total posts")
    
    def test_create_post_admin(self, admin_headers):
        """POST /api/posts/admin/create - Create new post with content blocks"""
        unique_id = uuid.uuid4().hex[:6]
        post_data = {
            "title": {
                "es": f"TEST_Post de Prueba {unique_id}",
                "en": f"TEST_Test Post {unique_id}",
                "zh": f"TEST_测试帖子 {unique_id}"
            },
            "summary": {
                "es": "Resumen del post de prueba",
                "en": "Test post summary",
                "zh": "测试帖子摘要"
            },
            "content_blocks": [
                {
                    "type": "heading_1",
                    "content": "Título Principal"
                },
                {
                    "type": "paragraph",
                    "content": "Este es un párrafo de prueba con contenido de ejemplo."
                },
                {
                    "type": "bullet_list",
                    "items": ["Elemento 1", "Elemento 2", "Elemento 3"]
                },
                {
                    "type": "callout",
                    "content": "Este es un callout informativo",
                    "icon": "💡",
                    "style": {"type": "info"}
                },
                {
                    "type": "divider"
                },
                {
                    "type": "quote",
                    "content": "Esta es una cita de ejemplo",
                    "author": "Autor de Prueba"
                }
            ],
            "category_id": "cat_announcements",
            "tags": ["test", "automated"],
            "target_audience": "all",
            "send_notification": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/posts/admin/create",
            json=post_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "post" in data
        
        post = data["post"]
        assert "post_id" in post
        assert post["title"]["es"] == post_data["title"]["es"]
        assert len(post["content_blocks"]) == 6
        assert post["status"] == "draft"
        
        # Store for later tests
        TestPosts.created_post_id = post["post_id"]
        print(f"Created post: {post['post_id']} with {len(post['content_blocks'])} blocks")
    
    def test_get_single_post(self, admin_headers):
        """GET /api/posts/{id} - Get specific post"""
        post_id = getattr(TestPosts, 'created_post_id', None)
        if not post_id:
            pytest.skip("No test post created")
        
        response = requests.get(
            f"{BASE_URL}/api/posts/{post_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["post"]["post_id"] == post_id
        print(f"Retrieved post: {post_id}")
    
    def test_update_post_admin(self, admin_headers):
        """PUT /api/posts/admin/{id} - Update post"""
        post_id = getattr(TestPosts, 'created_post_id', None)
        if not post_id:
            pytest.skip("No test post created")
        
        updates = {
            "summary": {
                "es": "Resumen actualizado",
                "en": "Updated summary",
                "zh": "更新的摘要"
            },
            "tags": ["test", "automated", "updated"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/posts/admin/{post_id}",
            json=updates,
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "updated" in data["post"]["tags"]
        print(f"Updated post: {post_id}")
    
    def test_publish_post_admin(self, admin_headers):
        """POST /api/posts/admin/{id}/publish - Publish post"""
        post_id = getattr(TestPosts, 'created_post_id', None)
        if not post_id:
            pytest.skip("No test post created")
        
        response = requests.post(
            f"{BASE_URL}/api/posts/admin/{post_id}/publish?send_notification=false",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data["post"]["status"] == "published"
        print(f"Published post: {post_id}")
    
    def test_get_post_not_found(self, admin_headers):
        """GET /api/posts/{id} - Non-existent post"""
        response = requests.get(
            f"{BASE_URL}/api/posts/post_nonexistent_xyz",
            headers=admin_headers
        )
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent post")
    
    def test_like_post(self, admin_headers):
        """POST /api/posts/{id}/like - Like a post"""
        post_id = getattr(TestPosts, 'created_post_id', None)
        if not post_id:
            pytest.skip("No test post created")
        
        response = requests.post(
            f"{BASE_URL}/api/posts/{post_id}/like",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "likes" in data
        print(f"Liked post: {post_id}, total likes: {data['likes']}")
    
    def test_get_scheduled_posts(self, admin_headers):
        """GET /api/posts/admin/scheduled - Get scheduled posts"""
        response = requests.get(
            f"{BASE_URL}/api/posts/admin/scheduled",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "posts" in data
        print(f"Found {data['count']} scheduled posts")
    
    def test_get_media_library(self, admin_headers):
        """GET /api/posts/admin/media - Get media library"""
        response = requests.get(
            f"{BASE_URL}/api/posts/admin/media",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "media" in data
        print(f"Media library: {data['count']} items")


# ============== DEVICE MANAGEMENT TESTS ==============

class TestDeviceManagement(TestSetup):
    """Tests for device registration and management"""
    
    def test_get_devices_requires_auth(self):
        """GET /api/notifications/devices - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/devices")
        assert response.status_code == 401
        print("Correctly requires authentication")
    
    def test_get_my_devices(self, admin_headers):
        """GET /api/notifications/devices - Get user's devices"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/devices",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "devices" in data
        assert "count" in data
        print(f"User has {data['count']} registered devices")
    
    def test_register_device(self, admin_headers):
        """POST /api/notifications/devices/register - Register device"""
        device_data = {
            "device_token": f"test_token_{uuid.uuid4().hex[:8]}",
            "provider": "fcm",
            "device_info": {
                "platform": "test",
                "model": "pytest"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/devices/register",
            json=device_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "device" in data
        
        # Store for cleanup
        TestDeviceManagement.test_device_token = device_data["device_token"]
        print(f"Registered device: {data['device']['device_id']}")
    
    def test_remove_device(self, admin_headers):
        """DELETE /api/notifications/devices/{token} - Remove device"""
        token = getattr(TestDeviceManagement, 'test_device_token', None)
        if not token:
            pytest.skip("No test device registered")
        
        response = requests.delete(
            f"{BASE_URL}/api/notifications/devices/{token}",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        print(f"Removed device: {token}")


# ============== NOTIFICATION HISTORY TESTS ==============

class TestNotificationHistory(TestSetup):
    """Tests for notification history"""
    
    def test_get_history_requires_auth(self):
        """GET /api/notifications/history - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/history")
        assert response.status_code == 401
        print("Correctly requires authentication")
    
    def test_get_my_history(self, admin_headers):
        """GET /api/notifications/history - Get notification history"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/history",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "notifications" in data
        print(f"Notification history: {data['count']} items")
    
    def test_get_admin_logs(self, admin_headers):
        """GET /api/notifications/admin/logs - Get admin logs"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/logs",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "logs" in data
        print(f"Admin notification logs: {data['count']} items")


# ============== TEMPLATES TESTS ==============

class TestTemplates(TestSetup):
    """Tests for notification templates"""
    
    def test_get_templates(self, admin_headers):
        """GET /api/notifications/admin/templates - Get templates"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/templates",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert "templates" in data
        print(f"Found {data['count']} notification templates")


# ============== CLEANUP ==============

class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_delete_test_category(self, admin_headers):
        """DELETE /api/notifications/admin/categories/{id} - Delete test category"""
        category_id = getattr(TestNotificationCategories, 'created_category_id', None)
        if not category_id:
            pytest.skip("No test category to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/notifications/admin/categories/{category_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        print(f"Deleted test category: {category_id}")
    
    def test_delete_test_post(self, admin_headers):
        """DELETE /api/posts/admin/{id} - Delete test post"""
        post_id = getattr(TestPosts, 'created_post_id', None)
        if not post_id:
            pytest.skip("No test post to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/posts/admin/{post_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        print(f"Deleted test post: {post_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
