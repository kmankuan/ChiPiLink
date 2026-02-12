"""
Test Dev Control Module - Architecture, Endpoints, Modules, Principles, Roadmap, Annotations CRUD
Admin-only endpoints for Development Control panel
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login and get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "teck@koh.one",
        "password": "admin"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    assert data.get("user", {}).get("is_admin") == True, "User should be admin"
    return data["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============== ARCHITECTURE ENDPOINT ==============
class TestArchitectureEndpoint:
    """Test GET /api/dev-control/architecture"""
    
    def test_architecture_requires_auth(self):
        """Architecture endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/architecture")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_architecture_returns_file_tree(self, headers):
        """Architecture returns backend and frontend file trees"""
        response = requests.get(f"{BASE_URL}/api/dev-control/architecture", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "backend" in data, "Response should contain 'backend' key"
        assert "frontend" in data, "Response should contain 'frontend' key"
        
        # Check backend tree structure
        assert isinstance(data["backend"], list), "Backend should be a list"
        assert len(data["backend"]) > 0, "Backend tree should not be empty"
        
        # Verify tree nodes have expected structure
        backend_node = data["backend"][0]
        assert "name" in backend_node, "Tree node should have 'name'"
        assert "path" in backend_node, "Tree node should have 'path'"
        assert "type" in backend_node, "Tree node should have 'type'"
        
        # Check frontend tree
        assert isinstance(data["frontend"], list), "Frontend should be a list"
        assert len(data["frontend"]) > 0, "Frontend tree should not be empty"


# ============== ENDPOINTS DISCOVERY ==============
class TestEndpointsDiscovery:
    """Test GET /api/dev-control/endpoints"""
    
    def test_endpoints_requires_auth(self):
        """Endpoints endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/endpoints")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_endpoints_returns_grouped_routes(self, headers):
        """Endpoints returns all API routes grouped by tag"""
        response = requests.get(f"{BASE_URL}/api/dev-control/endpoints", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "groups" in data, "Response should contain 'groups' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # Verify total count (mentioned 773+ endpoints)
        assert data["total"] > 50, f"Expected many endpoints, got {data['total']}"
        
        # Verify groups structure
        groups = data["groups"]
        assert isinstance(groups, dict), "Groups should be a dictionary"
        assert len(groups) > 0, "Should have at least one group"
        
        # Check a group's endpoint structure
        for tag, endpoints in groups.items():
            assert isinstance(endpoints, list), f"Endpoints for {tag} should be a list"
            if len(endpoints) > 0:
                ep = endpoints[0]
                assert "method" in ep, "Endpoint should have 'method'"
                assert "path" in ep, "Endpoint should have 'path'"
                assert ep["method"] in ["GET", "POST", "PUT", "DELETE", "PATCH"], f"Invalid method: {ep['method']}"
                break


# ============== MODULES INFO ==============
class TestModulesEndpoint:
    """Test GET /api/dev-control/modules"""
    
    def test_modules_requires_auth(self):
        """Modules endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/modules")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_modules_returns_module_list(self, headers):
        """Modules returns structured module info"""
        response = requests.get(f"{BASE_URL}/api/dev-control/modules", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "modules" in data, "Response should contain 'modules' key"
        
        modules = data["modules"]
        assert isinstance(modules, list), "Modules should be a list"
        assert len(modules) > 5, f"Expected multiple modules, got {len(modules)}"
        
        # Verify module structure
        module = modules[0]
        assert "id" in module, "Module should have 'id'"
        assert "name" in module, "Module should have 'name'"
        assert "status" in module, "Module should have 'status'"
        assert "description" in module, "Module should have 'description'"
        assert "path" in module, "Module should have 'path'"
        
        # Check for dev_control module itself
        dev_control_module = next((m for m in modules if m["id"] == "dev_control"), None)
        assert dev_control_module is not None, "dev_control module should be listed"


# ============== PRINCIPLES ==============
class TestPrinciplesEndpoint:
    """Test GET /api/dev-control/principles"""
    
    def test_principles_requires_auth(self):
        """Principles endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/principles")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_principles_returns_categorized_principles(self, headers):
        """Principles returns categorized dev guidelines"""
        response = requests.get(f"{BASE_URL}/api/dev-control/principles", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "principles" in data, "Response should contain 'principles' key"
        
        principles = data["principles"]
        assert isinstance(principles, list), "Principles should be a list"
        assert len(principles) >= 4, f"Expected multiple categories, got {len(principles)}"
        
        # Verify structure
        category = principles[0]
        assert "category" in category, "Should have 'category'"
        assert "items" in category, "Should have 'items'"
        assert isinstance(category["items"], list), "Items should be a list"
        
        # Verify item structure
        item = category["items"][0]
        assert "title" in item, "Item should have 'title'"
        assert "detail" in item, "Item should have 'detail'"
        
        # Check expected categories
        categories = [p["category"] for p in principles]
        assert "Backend" in categories, "Should have Backend category"
        assert "Frontend" in categories, "Should have Frontend category"


# ============== ROADMAP ==============
class TestRoadmapEndpoint:
    """Test GET /api/dev-control/roadmap and PUT update"""
    
    def test_roadmap_requires_auth(self):
        """Roadmap endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/roadmap")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_roadmap_returns_items(self, headers):
        """Roadmap returns P0-P3 items with status"""
        response = requests.get(f"{BASE_URL}/api/dev-control/roadmap", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items' key"
        
        items = data["items"]
        assert isinstance(items, list), "Items should be a list"
        assert len(items) > 0, "Should have roadmap items"
        
        # Verify item structure
        item = items[0]
        assert "id" in item, "Item should have 'id'"
        assert "priority" in item, "Item should have 'priority'"
        assert "title" in item, "Item should have 'title'"
        assert "status" in item, "Item should have 'status'"
        
        # Check priorities
        priorities = set(i["priority"] for i in items)
        assert "P0" in priorities or "P1" in priorities, "Should have P0 or P1 items"
    
    def test_roadmap_update_status(self, headers):
        """Can update roadmap item status"""
        # First get items
        response = requests.get(f"{BASE_URL}/api/dev-control/roadmap", headers=headers)
        assert response.status_code == 200
        items = response.json()["items"]
        
        # Get first item
        item = items[0]
        item_id = item["id"]
        original_status = item["status"]
        new_status = "in_progress" if original_status != "in_progress" else "planned"
        
        # Update status
        update_response = requests.put(
            f"{BASE_URL}/api/dev-control/roadmap/{item_id}",
            headers=headers,
            json={"status": new_status}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/dev-control/roadmap", headers=headers)
        updated_items = verify_response.json()["items"]
        updated_item = next((i for i in updated_items if i["id"] == item_id), None)
        assert updated_item is not None, "Item should exist"
        assert updated_item["status"] == new_status, f"Status should be {new_status}"
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/dev-control/roadmap/{item_id}",
            headers=headers,
            json={"status": original_status}
        )


# ============== ANNOTATIONS CRUD ==============
class TestAnnotationsCRUD:
    """Test CRUD operations for /api/dev-control/annotations"""
    
    test_annotation_id = None
    
    def test_annotations_requires_auth(self):
        """Annotations endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/annotations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_create_annotation(self, headers):
        """Can create a new annotation"""
        unique_title = f"TEST_annotation_{uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique_title,
            "content": "This is a test annotation for DevControl module testing",
            "category": "guideline",
            "pinned": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dev-control/annotations",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["title"] == unique_title, "Title should match"
        assert data["content"] == payload["content"], "Content should match"
        assert data["category"] == "guideline", "Category should match"
        assert "created_at" in data, "Should have created_at timestamp"
        
        # Store for other tests
        TestAnnotationsCRUD.test_annotation_id = data["id"]
    
    def test_get_annotations(self, headers):
        """Can get list of annotations"""
        response = requests.get(f"{BASE_URL}/api/dev-control/annotations", headers=headers)
        assert response.status_code == 200, f"Get failed: {response.text}"
        
        data = response.json()
        assert "annotations" in data, "Response should contain 'annotations' key"
        
        annotations = data["annotations"]
        assert isinstance(annotations, list), "Annotations should be a list"
        
        # Find our test annotation
        test_ann = next((a for a in annotations if a["id"] == TestAnnotationsCRUD.test_annotation_id), None)
        assert test_ann is not None, "Created annotation should exist in list"
    
    def test_update_annotation(self, headers):
        """Can update an existing annotation"""
        annotation_id = TestAnnotationsCRUD.test_annotation_id
        assert annotation_id is not None, "Should have test annotation ID from create test"
        
        update_payload = {
            "title": "UPDATED_TEST_annotation",
            "content": "Updated content for testing",
            "category": "bug",
            "pinned": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/dev-control/annotations/{annotation_id}",
            headers=headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update by fetching
        verify_response = requests.get(f"{BASE_URL}/api/dev-control/annotations", headers=headers)
        annotations = verify_response.json()["annotations"]
        updated_ann = next((a for a in annotations if a["id"] == annotation_id), None)
        
        assert updated_ann is not None, "Updated annotation should exist"
        assert updated_ann["title"] == "UPDATED_TEST_annotation", "Title should be updated"
        assert updated_ann["content"] == "Updated content for testing", "Content should be updated"
        assert updated_ann["category"] == "bug", "Category should be updated"
        assert updated_ann["pinned"] == True, "Pinned should be updated"
    
    def test_delete_annotation(self, headers):
        """Can delete an annotation"""
        annotation_id = TestAnnotationsCRUD.test_annotation_id
        assert annotation_id is not None, "Should have test annotation ID from create test"
        
        response = requests.delete(
            f"{BASE_URL}/api/dev-control/annotations/{annotation_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/dev-control/annotations", headers=headers)
        annotations = verify_response.json()["annotations"]
        deleted_ann = next((a for a in annotations if a["id"] == annotation_id), None)
        assert deleted_ann is None, "Deleted annotation should not exist"
    
    def test_create_annotation_without_content_fails(self, headers):
        """Creating annotation without content should fail"""
        payload = {
            "title": "No Content Annotation",
            "content": "",
            "category": "general"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dev-control/annotations",
            headers=headers,
            json=payload
        )
        assert response.status_code == 400, f"Should fail without content: {response.text}"


# ============== ERROR HANDLING ==============
class TestErrorHandling:
    """Test error handling for invalid requests"""
    
    def test_update_nonexistent_roadmap_item(self, headers):
        """Updating non-existent roadmap item returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/dev-control/roadmap/{fake_id}",
            headers=headers,
            json={"status": "done"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_update_nonexistent_annotation(self, headers):
        """Updating non-existent annotation returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/dev-control/annotations/{fake_id}",
            headers=headers,
            json={"title": "Test"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_delete_nonexistent_annotation(self, headers):
        """Deleting non-existent annotation returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/dev-control/annotations/{fake_id}",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
