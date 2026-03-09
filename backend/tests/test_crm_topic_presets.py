"""
CRM Topic Presets & Cart Drawer Features Tests
Tests for:
1. GET /api/store/crm-chat/topic-presets (user endpoint - returns active labels only)
2. GET /api/store/crm-chat/admin/topic-presets (admin endpoint - returns full objects)
3. PUT /api/store/crm-chat/admin/topic-presets (save presets)
4. Draft order filtering on my-orders endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCrmTopicPresets:
    """Tests for CRM Topic Presets API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_token = login_resp.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        yield
    
    def test_get_user_topic_presets(self):
        """GET /api/store/crm-chat/topic-presets returns active presets as strings"""
        response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/topic-presets",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "presets" in data
        assert isinstance(data["presets"], list)
        
        # Verify presets are strings (labels only)
        for preset in data["presets"]:
            assert isinstance(preset, str), f"Expected string, got {type(preset)}"
        
        print(f"SUCCESS: User endpoint returns {len(data['presets'])} preset labels")
    
    def test_get_admin_topic_presets(self):
        """GET /api/store/crm-chat/admin/topic-presets returns full preset objects"""
        response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/admin/topic-presets",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "presets" in data
        assert isinstance(data["presets"], list)
        
        # Verify presets are objects with label, active, order
        for preset in data["presets"]:
            assert isinstance(preset, dict), f"Expected dict, got {type(preset)}"
            assert "label" in preset
            assert "active" in preset
            assert "order" in preset
        
        print(f"SUCCESS: Admin endpoint returns {len(data['presets'])} preset objects")
    
    def test_save_topic_presets(self):
        """PUT /api/store/crm-chat/admin/topic-presets saves presets to MongoDB"""
        # Save test presets
        test_presets = [
            {"label": "TEST_Preset_A", "active": True, "order": 0},
            {"label": "TEST_Preset_B", "active": False, "order": 1},  # Hidden
            {"label": "TEST_Preset_C", "active": True, "order": 2},
        ]
        
        save_response = requests.put(
            f"{BASE_URL}/api/store/crm-chat/admin/topic-presets",
            headers={**self.admin_headers, "Content-Type": "application/json"},
            json={"presets": test_presets}
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        assert save_response.json().get("success") == True
        assert save_response.json().get("count") == 3
        print("SUCCESS: Saved 3 test presets")
        
        # Verify admin endpoint shows all presets
        admin_response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/admin/topic-presets",
            headers=self.admin_headers
        )
        admin_data = admin_response.json()
        assert len(admin_data["presets"]) == 3
        
        # Verify user endpoint only shows active presets
        user_response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/topic-presets",
            headers=self.admin_headers
        )
        user_data = user_response.json()
        assert len(user_data["presets"]) == 2, "User endpoint should only show active presets"
        assert "TEST_Preset_A" in user_data["presets"]
        assert "TEST_Preset_B" not in user_data["presets"]  # Hidden preset
        assert "TEST_Preset_C" in user_data["presets"]
        
        print("SUCCESS: User endpoint filters out inactive presets")
    
    def test_restore_original_presets(self):
        """Restore original Spanish presets after tests"""
        original_presets = [
            {"label": "Pregunta sobre Pedido", "active": True, "order": 0},
            {"label": "Problema de Pago", "active": True, "order": 1},
            {"label": "Estado de Entrega", "active": True, "order": 2},
            {"label": "Solicitud de Devolución", "active": True, "order": 3},
            {"label": "Consulta General", "active": True, "order": 4},
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/store/crm-chat/admin/topic-presets",
            headers={**self.admin_headers, "Content-Type": "application/json"},
            json={"presets": original_presets}
        )
        assert response.status_code == 200
        assert response.json().get("count") == 5
        print("SUCCESS: Restored original 5 Spanish presets")


class TestDraftOrderFilter:
    """Tests for draft order filtering on user endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_my_orders_excludes_drafts(self):
        """GET /api/store/textbook-orders/my-orders should exclude draft orders"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check that no orders have status "draft"
        orders = data.get("orders", [])
        draft_orders = [o for o in orders if o.get("status") == "draft"]
        
        assert len(draft_orders) == 0, f"Found {len(draft_orders)} draft orders - should be filtered"
        print(f"SUCCESS: /my-orders returns {len(orders)} orders, 0 drafts")


class TestOrderChatMobileMargin:
    """Code verification test for OrderChat mb-16 class"""
    
    def test_orderchat_has_mb16_class(self):
        """Verify OrderChat.jsx has mb-16 sm:mb-0 class for mobile visibility"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "mb-16", "/app/frontend/src/components/chat/OrderChat.jsx"],
            capture_output=True, text=True
        )
        assert "mb-16" in result.stdout, "OrderChat.jsx missing mb-16 class"
        assert "sm:mb-0" in result.stdout, "OrderChat.jsx missing sm:mb-0 breakpoint"
        print(f"SUCCESS: OrderChat.jsx contains mb-16 sm:mb-0 at: {result.stdout.strip()}")
    
    def test_crmchat_has_mb16_class(self):
        """Verify CrmChat.jsx has mb-16 sm:mb-0 class for mobile visibility"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "mb-16", "/app/frontend/src/components/chat/CrmChat.jsx"],
            capture_output=True, text=True
        )
        assert "mb-16" in result.stdout, "CrmChat.jsx missing mb-16 class"
        assert "sm:mb-0" in result.stdout, "CrmChat.jsx missing sm:mb-0 breakpoint"
        print(f"SUCCESS: CrmChat.jsx contains mb-16 sm:mb-0 at: {result.stdout.strip()}")


class TestCartDrawerFeatures:
    """Code verification tests for Cart Drawer 'My Orders' buttons"""
    
    def test_cart_empty_state_has_my_orders_btn(self):
        """Verify CartDrawer.jsx has 'Ver mis pedidos' button in empty state"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "cart-my-orders-btn", "/app/frontend/src/components/cart/CartDrawer.jsx"],
            capture_output=True, text=True
        )
        assert "cart-my-orders-btn" in result.stdout, "Missing data-testid=cart-my-orders-btn"
        print(f"SUCCESS: CartDrawer has empty state my-orders button: {result.stdout.strip()}")
    
    def test_cart_footer_has_pedidos_btn(self):
        """Verify CartDrawer.jsx has 'Pedidos' button in footer when items present"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "cart-my-orders-footer-btn", "/app/frontend/src/components/cart/CartDrawer.jsx"],
            capture_output=True, text=True
        )
        assert "cart-my-orders-footer-btn" in result.stdout, "Missing data-testid=cart-my-orders-footer-btn"
        print(f"SUCCESS: CartDrawer has footer Pedidos button: {result.stdout.strip()}")
    
    def test_cart_uses_clipboard_list_icon(self):
        """Verify CartDrawer.jsx imports and uses ClipboardList icon"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "ClipboardList", "/app/frontend/src/components/cart/CartDrawer.jsx"],
            capture_output=True, text=True
        )
        assert "ClipboardList" in result.stdout, "Missing ClipboardList icon import/usage"
        print(f"SUCCESS: CartDrawer uses ClipboardList icon: {result.stdout.strip()}")
