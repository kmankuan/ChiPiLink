"""
Test Login Page Design Configuration
Tests for the new login page customization fields in site config:
- login_layout (split/centered/fullscreen)
- login_bg_image
- login_bg_overlay_color
- login_bg_overlay_opacity
- login_heading
- login_subtext
- login_logo_size (sm/md/lg)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestLoginPageDesignConfig:
    """Test Login Page Design configuration in site config API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            pytest.skip("Admin login failed")
    
    def test_public_site_config_returns_login_design_fields(self):
        """Test GET /api/public/site-config returns all login design fields"""
        response = requests.get(f"{BASE_URL}/api/public/site-config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all login design fields exist
        assert "login_bg_image" in data
        assert "login_bg_overlay_color" in data
        assert "login_bg_overlay_opacity" in data
        assert "login_heading" in data
        assert "login_subtext" in data
        assert "login_layout" in data
        assert "login_logo_size" in data
        
        # Verify default values
        assert data["login_layout"] in ["split", "centered", "fullscreen"]
        assert data["login_logo_size"] in ["sm", "md", "lg"]
        assert isinstance(data["login_bg_overlay_opacity"], (int, float))
    
    def test_admin_site_config_returns_login_design_fields(self):
        """Test GET /api/admin/site-config returns login design fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify login design fields exist
        assert "login_layout" in data
        assert "login_logo_size" in data
        assert "login_heading" in data
        assert "login_subtext" in data
    
    def test_admin_site_config_requires_auth(self):
        """Test GET /api/admin/site-config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/site-config")
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403]
    
    def test_update_login_layout_split(self):
        """Test updating login_layout to 'split'"""
        config = {
            "site_name": "Test Site",
            "login_layout": "split",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=config
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify via public endpoint
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        assert verify_response.json()["login_layout"] == "split"
    
    def test_update_login_layout_centered(self):
        """Test updating login_layout to 'centered'"""
        config = {
            "site_name": "Test Site",
            "login_layout": "centered",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=config
        )
        
        assert response.status_code == 200
        
        # Verify via public endpoint
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        assert verify_response.json()["login_layout"] == "centered"
    
    def test_update_login_layout_fullscreen(self):
        """Test updating login_layout to 'fullscreen'"""
        config = {
            "site_name": "Test Site",
            "login_layout": "fullscreen",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=config
        )
        
        assert response.status_code == 200
        
        # Verify via public endpoint
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        assert verify_response.json()["login_layout"] == "fullscreen"
    
    def test_update_login_logo_size(self):
        """Test updating login_logo_size through all options"""
        for size in ["sm", "md", "lg"]:
            config = {
                "site_name": "Test Site",
                "login_logo_size": size,
                "login_layout": "split"
            }
            
            response = requests.put(
                f"{BASE_URL}/api/admin/site-config",
                headers=self.headers,
                json=config
            )
            
            assert response.status_code == 200
            
            # Verify via public endpoint
            verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
            assert verify_response.json()["login_logo_size"] == size
    
    def test_update_login_heading_and_subtext(self):
        """Test updating custom heading and subtitle text"""
        config = {
            "site_name": "Test Site",
            "login_heading": "Custom Welcome Heading",
            "login_subtext": "Custom subtitle for login",
            "login_layout": "split",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=config
        )
        
        assert response.status_code == 200
        
        # Verify via public endpoint
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        data = verify_response.json()
        assert data["login_heading"] == "Custom Welcome Heading"
        assert data["login_subtext"] == "Custom subtitle for login"
    
    def test_update_login_bg_overlay_settings(self):
        """Test updating background overlay color and opacity"""
        config = {
            "site_name": "Test Site",
            "login_bg_overlay_color": "#ff5500",
            "login_bg_overlay_opacity": 0.5,
            "login_layout": "split",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=config
        )
        
        assert response.status_code == 200
        
        # Verify via public endpoint
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        data = verify_response.json()
        assert data["login_bg_overlay_color"] == "#ff5500"
        assert data["login_bg_overlay_opacity"] == 0.5
    
    def test_update_login_bg_image(self):
        """Test updating background image URL"""
        config = {
            "site_name": "Test Site",
            "login_bg_image": "https://images.unsplash.com/photo-1234",
            "login_layout": "split",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=config
        )
        
        assert response.status_code == 200
        
        # Verify via public endpoint
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        assert verify_response.json()["login_bg_image"] == "https://images.unsplash.com/photo-1234"
    
    def test_update_site_config_requires_auth(self):
        """Test PUT /api/admin/site-config requires authentication"""
        config = {
            "site_name": "Test Site",
            "login_layout": "split"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            json=config
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403]


class TestLoginPageDesignCleanup:
    """Reset site config to defaults after tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
    
    def test_reset_to_defaults(self):
        """Reset site config to default values"""
        default_config = {
            "site_name": "Mi Tienda",
            "descripcion": "Plataforma de comercio electronic",
            "logo_url": "",
            "favicon_url": "",
            "color_primario": "#16a34a",
            "color_secundario": "#0f766e",
            "email_contacto": "",
            "telefono_contacto": "",
            "direccion": "",
            "footer_texto": "© 2025 Todos los derechos reservados",
            "login_bg_image": "",
            "login_bg_overlay_color": "",
            "login_bg_overlay_opacity": 0.7,
            "login_heading": "",
            "login_subtext": "",
            "login_layout": "split",
            "login_logo_size": "md"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site-config",
            headers=self.headers,
            json=default_config
        )
        
        assert response.status_code == 200
        
        # Verify reset
        verify_response = requests.get(f"{BASE_URL}/api/public/site-config")
        data = verify_response.json()
        assert data["login_layout"] == "split"
        assert data["login_logo_size"] == "md"
        assert data["login_heading"] in ["", None]
