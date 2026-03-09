"""
Test suite for Print Templates CRUD and Help Guide Editor APIs.
Features tested:
1. Print Templates: GET list, POST create, POST create with clone, PUT update, DELETE, POST activate
2. Help Guide: GET (admin), PUT (save), GET (public content)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============== PRINT TEMPLATES API TESTS ==============

class TestPrintTemplates:
    """Print template CRUD endpoints"""
    
    created_template_id = None
    
    def test_get_templates_list(self, auth_headers):
        """GET /api/print/templates - Should return list of templates"""
        response = requests.get(f"{BASE_URL}/api/print/templates", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "templates" in data, "Response should contain 'templates' key"
        assert isinstance(data["templates"], list), "templates should be a list"
        
        # Should have at least default template
        if len(data["templates"]) > 0:
            template = data["templates"][0]
            assert "id" in template, "Template should have 'id'"
            assert "name" in template, "Template should have 'name'"
            assert "format_config" in template, "Template should have 'format_config'"
        print(f"PASS: GET /api/print/templates returned {len(data['templates'])} templates")
    
    def test_create_template_from_scratch(self, auth_headers):
        """POST /api/print/templates - Create new template from scratch"""
        payload = {
            "name": "TEST_NewTemplate",
            "description": "Test template created for testing",
        }
        response = requests.post(f"{BASE_URL}/api/print/templates", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["name"] == "TEST_NewTemplate", "Name should match"
        assert "format_config" in data, "Should have default format_config"
        assert data["is_active"] == False, "New template should not be active"
        
        TestPrintTemplates.created_template_id = data["id"]
        print(f"PASS: Created template with id={data['id']}")
    
    def test_create_template_with_clone(self, auth_headers):
        """POST /api/print/templates - Clone from existing template"""
        # First get existing templates to clone from
        list_response = requests.get(f"{BASE_URL}/api/print/templates", headers=auth_headers)
        templates = list_response.json().get("templates", [])
        
        if len(templates) == 0:
            pytest.skip("No templates to clone from")
        
        source_id = templates[0]["id"]
        
        payload = {
            "name": "TEST_ClonedTemplate",
            "description": "Cloned from existing",
            "clone_from": source_id
        }
        response = requests.post(f"{BASE_URL}/api/print/templates", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_ClonedTemplate", "Name should match"
        # Cloned template should have format_config from source
        assert "format_config" in data, "Should have cloned format_config"
        print(f"PASS: Cloned template created with id={data['id']}")
        
        # Store for cleanup - will be deleted via cleanup
        return data["id"]
    
    def test_update_template(self, auth_headers):
        """PUT /api/print/templates/{id} - Update template config"""
        if not TestPrintTemplates.created_template_id:
            pytest.skip("No template created to update")
        
        template_id = TestPrintTemplates.created_template_id
        payload = {
            "name": "TEST_UpdatedTemplate",
            "format_config": {
                "paper_size": "80mm",
                "style": {
                    "font_family": "Arial, Helvetica, sans-serif",
                    "font_size": "14px"
                },
                "header": {"title": "Updated Title", "show_date": True, "show_order_id": True},
                "body": {"show_checkboxes": True, "show_item_code": True},
                "footer": {"show_total": True}
            }
        }
        response = requests.put(f"{BASE_URL}/api/print/templates/{template_id}", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Update should return success"
        print(f"PASS: Updated template {template_id}")
    
    def test_update_template_font_size(self, auth_headers):
        """PUT /api/print/templates/{id} - Verify font changes are saved"""
        if not TestPrintTemplates.created_template_id:
            pytest.skip("No template created")
        
        template_id = TestPrintTemplates.created_template_id
        
        # Update with specific font settings
        payload = {
            "format_config": {
                "style": {
                    "font_family": "Tahoma, Geneva, sans-serif",
                    "font_size": "10px"
                },
                "header": {"title": "Font Test"},
                "body": {},
                "footer": {}
            }
        }
        response = requests.put(f"{BASE_URL}/api/print/templates/{template_id}", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        # GET to verify saved
        get_response = requests.get(f"{BASE_URL}/api/print/templates", headers=auth_headers)
        templates = get_response.json().get("templates", [])
        updated_tpl = next((t for t in templates if t["id"] == template_id), None)
        
        assert updated_tpl is not None, "Updated template should exist"
        assert updated_tpl["format_config"]["style"]["font_family"] == "Tahoma, Geneva, sans-serif", "Font family should be saved"
        assert updated_tpl["format_config"]["style"]["font_size"] == "10px", "Font size should be saved"
        print(f"PASS: Font changes saved and verified")
    
    def test_activate_template(self, auth_headers):
        """POST /api/print/templates/{id}/activate - Activate a template"""
        if not TestPrintTemplates.created_template_id:
            pytest.skip("No template created to activate")
        
        template_id = TestPrintTemplates.created_template_id
        response = requests.post(f"{BASE_URL}/api/print/templates/{template_id}/activate", json={}, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Activation should return success"
        assert "applied_config" in data, "Should return applied config"
        print(f"PASS: Activated template {template_id}")
    
    def test_delete_active_template_should_fail(self, auth_headers):
        """DELETE /api/print/templates/{id} - Cannot delete active template"""
        if not TestPrintTemplates.created_template_id:
            pytest.skip("No template created")
        
        template_id = TestPrintTemplates.created_template_id
        response = requests.delete(f"{BASE_URL}/api/print/templates/{template_id}", headers=auth_headers)
        # Should fail with 400 because it's active
        assert response.status_code == 400, f"Expected 400 for active template delete, got {response.status_code}"
        print(f"PASS: Cannot delete active template (expected behavior)")
    
    def test_delete_template(self, auth_headers):
        """DELETE /api/print/templates/{id} - Delete inactive template"""
        # First activate another template so we can delete ours
        list_response = requests.get(f"{BASE_URL}/api/print/templates", headers=auth_headers)
        templates = list_response.json().get("templates", [])
        
        # Find a different template to activate
        other_template = next((t for t in templates if t["id"] != TestPrintTemplates.created_template_id), None)
        if other_template:
            requests.post(f"{BASE_URL}/api/print/templates/{other_template['id']}/activate", json={}, headers=auth_headers)
        
        # Now delete our test template
        if TestPrintTemplates.created_template_id:
            response = requests.delete(f"{BASE_URL}/api/print/templates/{TestPrintTemplates.created_template_id}", headers=auth_headers)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            print(f"PASS: Deleted template {TestPrintTemplates.created_template_id}")
    
    def test_delete_nonexistent_template(self, auth_headers):
        """DELETE /api/print/templates/{id} - 404 for non-existent"""
        response = requests.delete(f"{BASE_URL}/api/print/templates/nonexistent-id-12345", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: 404 returned for non-existent template")


# ============== HELP GUIDE API TESTS ==============

class TestHelpGuideAPI:
    """Help Guide Editor API endpoints"""
    
    def test_get_help_guide_admin(self, auth_headers):
        """GET /api/dev-control/help-guide - Admin endpoint"""
        response = requests.get(f"{BASE_URL}/api/dev-control/help-guide", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "guide" in data, "Response should contain 'guide'"
        assert "source" in data, "Response should indicate source"
        
        guide = data["guide"]
        assert "title" in guide, "Guide should have title"
        assert "intro" in guide, "Guide should have intro"
        assert "sections" in guide, "Guide should have sections"
        assert isinstance(guide["sections"], list), "sections should be a list"
        
        print(f"PASS: GET help-guide returned guide with {len(guide['sections'])} sections, source: {data['source']}")
    
    def test_update_help_guide(self, auth_headers):
        """PUT /api/dev-control/help-guide - Save help guide"""
        # First get current guide
        get_response = requests.get(f"{BASE_URL}/api/dev-control/help-guide", headers=auth_headers)
        current_guide = get_response.json()["guide"]
        
        # Modify title and save
        test_title = "TEST_Modified Guide Title"
        current_guide["title"] = test_title
        
        payload = {"guide": current_guide}
        response = requests.put(f"{BASE_URL}/api/dev-control/help-guide", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Update should return success"
        assert "updated_at" in data, "Should return updated_at timestamp"
        print(f"PASS: Updated help guide")
    
    def test_help_guide_persists(self, auth_headers):
        """Verify help guide changes persist to database"""
        response = requests.get(f"{BASE_URL}/api/dev-control/help-guide", headers=auth_headers)
        data = response.json()
        
        # After update, source should be 'database'
        assert data["source"] == "database", f"Source should be 'database', got {data['source']}"
        print(f"PASS: Help guide persisted to database")
    
    def test_help_guide_add_section(self, auth_headers):
        """PUT /api/dev-control/help-guide - Add new section"""
        get_response = requests.get(f"{BASE_URL}/api/dev-control/help-guide", headers=auth_headers)
        guide = get_response.json()["guide"]
        
        new_section = {
            "id": "test-section-123",
            "title": "TEST_New Section",
            "type": "text",
            "content": "This is test content for the new section.",
            "image_url": "",
            "order": len(guide["sections"])
        }
        guide["sections"].append(new_section)
        
        response = requests.put(f"{BASE_URL}/api/dev-control/help-guide", json={"guide": guide}, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify section was added
        verify_response = requests.get(f"{BASE_URL}/api/dev-control/help-guide", headers=auth_headers)
        saved_guide = verify_response.json()["guide"]
        saved_section = next((s for s in saved_guide["sections"] if s["id"] == "test-section-123"), None)
        
        assert saved_section is not None, "New section should be saved"
        assert saved_section["title"] == "TEST_New Section", "Section title should match"
        print(f"PASS: Added new section to help guide")
    
    def test_public_help_guide_content(self):
        """GET /api/help-guide/content - Public endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/help-guide/content")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "guide" in data, "Response should contain 'guide'"
        
        guide = data["guide"]
        assert "title" in guide, "Guide should have title"
        assert "sections" in guide, "Guide should have sections"
        print(f"PASS: Public help guide content returned successfully")
    
    def test_public_help_guide_reflects_admin_changes(self, auth_headers):
        """Verify public endpoint reflects admin changes"""
        # First update via admin
        get_response = requests.get(f"{BASE_URL}/api/dev-control/help-guide", headers=auth_headers)
        guide = get_response.json()["guide"]
        
        unique_intro = f"TEST_UNIQUE_INTRO_{os.urandom(4).hex()}"
        guide["intro"] = unique_intro
        
        requests.put(f"{BASE_URL}/api/dev-control/help-guide", json={"guide": guide}, headers=auth_headers)
        
        # Now check public endpoint
        public_response = requests.get(f"{BASE_URL}/api/help-guide/content")
        public_guide = public_response.json()["guide"]
        
        assert public_guide["intro"] == unique_intro, "Public endpoint should reflect admin changes"
        print(f"PASS: Public endpoint reflects admin edits")
    
    def test_help_guide_invalid_payload(self, auth_headers):
        """PUT /api/dev-control/help-guide - Fail on invalid payload"""
        response = requests.put(f"{BASE_URL}/api/dev-control/help-guide", json={}, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for missing guide, got {response.status_code}"
        print(f"PASS: Properly rejects invalid payload")


# ============== CLEANUP ==============

@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    """Cleanup test data after all tests"""
    yield
    # Delete any TEST_ templates
    try:
        list_response = requests.get(f"{BASE_URL}/api/print/templates", headers=auth_headers)
        templates = list_response.json().get("templates", [])
        for t in templates:
            if t["name"].startswith("TEST_") and not t.get("is_active"):
                requests.delete(f"{BASE_URL}/api/print/templates/{t['id']}", headers=auth_headers)
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
