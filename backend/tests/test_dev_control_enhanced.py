"""
Test Dev Control Module - Enhanced Features (iteration 85)
- AI Dev Helper (chat, sessions, quick actions)
- Database Explorer (collections, counts, fields)
- Changes Log (git commits)
- Dependencies (Python + Node packages)
- Dynamic Modules detection
"""
import pytest
import requests
import os
import uuid
import time

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
    return data["token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============== DATABASE EXPLORER ==============
class TestDbExplorer:
    """Test GET /api/dev-control/db-explorer"""
    
    def test_db_explorer_requires_auth(self):
        """DB Explorer endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/db-explorer")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_db_explorer_returns_collections(self, headers):
        """DB Explorer returns all MongoDB collections with doc counts and fields"""
        response = requests.get(f"{BASE_URL}/api/dev-control/db-explorer", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "collections" in data, "Response should contain 'collections' key"
        assert "total_collections" in data, "Response should contain 'total_collections' key"
        
        collections = data["collections"]
        assert isinstance(collections, list), "Collections should be a list"
        assert len(collections) > 10, f"Expected many collections, got {len(collections)}"
        
        # Verify collection structure
        if len(collections) > 0:
            col = collections[0]
            assert "name" in col, "Collection should have 'name'"
            assert "count" in col, "Collection should have 'count'"
            assert "fields" in col, "Collection should have 'fields'"
            assert isinstance(col["fields"], list), "Fields should be a list"
        
        # Verify known collections exist
        col_names = [c["name"] for c in collections]
        assert "auth_users" in col_names or any("user" in n.lower() for n in col_names), "Should have auth/user collection"
        
        print(f"DB Explorer returned {data['total_collections']} collections")


# ============== CHANGES LOG (GIT) ==============
class TestChangesLog:
    """Test GET /api/dev-control/changes-log"""
    
    def test_changes_log_requires_auth(self):
        """Changes log endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/changes-log")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_changes_log_returns_commits(self, headers):
        """Changes log returns recent git commits"""
        response = requests.get(f"{BASE_URL}/api/dev-control/changes-log", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "commits" in data, "Response should contain 'commits' key"
        assert "total" in data, "Response should contain 'total' key"
        
        commits = data["commits"]
        assert isinstance(commits, list), "Commits should be a list"
        
        if len(commits) > 0:
            commit = commits[0]
            assert "hash" in commit, "Commit should have 'hash'"
            assert "full_hash" in commit, "Commit should have 'full_hash'"
            assert "author" in commit, "Commit should have 'author'"
            assert "date" in commit, "Commit should have 'date'"
            assert "message" in commit, "Commit should have 'message'"
            assert len(commit["hash"]) == 8, "Short hash should be 8 chars"
        
        print(f"Changes log returned {data['total']} commits")
    
    def test_changes_log_commit_detail(self, headers):
        """Can get details of a specific commit"""
        # First get commits list
        response = requests.get(f"{BASE_URL}/api/dev-control/changes-log", headers=headers)
        assert response.status_code == 200
        
        commits = response.json()["commits"]
        if len(commits) > 0:
            commit_hash = commits[0]["full_hash"]
            
            # Get commit detail
            detail_response = requests.get(
                f"{BASE_URL}/api/dev-control/changes-log/{commit_hash}",
                headers=headers
            )
            assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
            
            detail = detail_response.json()
            assert "files" in detail, "Detail should have 'files'"
            assert "hash" in detail, "Detail should have 'hash'"
            
            if len(detail["files"]) > 0:
                file_entry = detail["files"][0]
                assert "status" in file_entry, "File entry should have 'status'"
                assert "file" in file_entry, "File entry should have 'file'"


# ============== DEPENDENCIES ==============
class TestDependencies:
    """Test GET /api/dev-control/dependencies"""
    
    def test_dependencies_requires_auth(self):
        """Dependencies endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/dependencies")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_dependencies_returns_packages(self, headers):
        """Dependencies returns both Python and Node.js packages"""
        response = requests.get(f"{BASE_URL}/api/dev-control/dependencies", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check Python packages
        assert "python" in data, "Response should contain 'python' key"
        python_data = data["python"]
        assert "packages" in python_data, "Python should have 'packages'"
        assert "total" in python_data, "Python should have 'total'"
        assert isinstance(python_data["packages"], list), "Python packages should be a list"
        assert python_data["total"] > 50, f"Expected many Python packages, got {python_data['total']}"
        
        if len(python_data["packages"]) > 0:
            pkg = python_data["packages"][0]
            assert "name" in pkg, "Package should have 'name'"
            assert "version" in pkg, "Package should have 'version'"
        
        # Check Node packages
        assert "node" in data, "Response should contain 'node' key"
        node_data = data["node"]
        assert "dependencies" in node_data, "Node should have 'dependencies'"
        assert "devDependencies" in node_data, "Node should have 'devDependencies'"
        assert "total" in node_data, "Node should have 'total'"
        
        assert isinstance(node_data["dependencies"], dict), "Node dependencies should be a dict"
        assert isinstance(node_data["devDependencies"], dict), "Node devDependencies should be a dict"
        assert node_data["total"] > 20, f"Expected many Node packages, got {node_data['total']}"
        
        print(f"Dependencies: {python_data['total']} Python, {node_data['total']} Node.js packages")


# ============== DYNAMIC MODULES ==============
class TestDynamicModules:
    """Test GET /api/dev-control/modules - Dynamic detection"""
    
    def test_modules_dynamic_detection(self, headers):
        """Modules endpoint detects from filesystem with file counts"""
        response = requests.get(f"{BASE_URL}/api/dev-control/modules", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "modules" in data, "Response should contain 'modules' key"
        
        modules = data["modules"]
        assert isinstance(modules, list), "Modules should be a list"
        assert len(modules) >= 5, f"Expected multiple modules, got {len(modules)}"
        
        # Check structure includes new dynamic fields
        module = modules[0]
        required_fields = ["id", "name", "status", "path"]
        for field in required_fields:
            assert field in module, f"Module should have '{field}'"
        
        # Check for dynamic detection fields
        assert "files" in module, "Module should have 'files' count"
        assert "subdirs" in module, "Module should have 'subdirs' count"
        assert "has_routes" in module or "endpoint_count" in module, "Module should have routes info"
        
        print(f"Dynamic modules detected: {len(modules)} modules")


# ============== AI DEV HELPER ==============
class TestAiHelperSessions:
    """Test AI Helper session management endpoints"""
    
    test_session_id = None
    
    def test_ai_sessions_requires_auth(self):
        """AI sessions endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/dev-control/ai-helper/sessions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_ai_sessions_list(self, headers):
        """Can list AI chat sessions"""
        response = requests.get(f"{BASE_URL}/api/dev-control/ai-helper/sessions", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sessions" in data, "Response should contain 'sessions' key"
        assert isinstance(data["sessions"], list), "Sessions should be a list"
        
        print(f"AI Helper has {len(data['sessions'])} sessions")


class TestAiHelperChat:
    """Test AI Helper chat endpoint"""
    
    test_session_id = None
    
    def test_ai_chat_requires_auth(self):
        """AI chat endpoint returns 401 without token"""
        response = requests.post(f"{BASE_URL}/api/dev-control/ai-helper/chat", json={"message": "test"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_ai_chat_requires_message(self, headers):
        """AI chat requires a message"""
        response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/chat",
            headers=headers,
            json={"message": ""}
        )
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
    
    def test_ai_chat_simple_message(self, headers):
        """Can send a simple message to AI helper (GPT-4o route)"""
        # Use a short message for faster response
        response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/chat",
            headers=headers,
            json={"message": "Hello, what is 2+2?"},
            timeout=30  # LLM calls may take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data, "Response should contain 'session_id'"
        assert "response" in data, "Response should contain 'response'"
        assert "model" in data, "Response should contain 'model'"
        assert "model_route" in data, "Response should contain 'model_route'"
        
        # Verify response has content
        assert len(data["response"]) > 0, "Response should have content"
        assert data["model_route"] == "gpt4o", f"Simple query should route to GPT-4o, got {data['model_route']}"
        
        # Store session for later tests
        TestAiHelperChat.test_session_id = data["session_id"]
        print(f"AI Chat: Created session {data['session_id'][:8]}..., model: {data['model']}")
    
    def test_ai_chat_code_review_routes_to_claude(self, headers):
        """Code review query should route to Claude"""
        # Use a code review keyword for Claude routing
        response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/chat",
            headers=headers,
            json={"message": "Can you do a code review of this: const x = 1;"},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["model_route"] == "claude", f"Code review should route to Claude, got {data['model_route']}"
        print(f"Code review routed to: {data['model']}")


class TestAiHelperQuickActions:
    """Test AI Helper quick action endpoint"""
    
    def test_quick_action_requires_auth(self):
        """Quick action endpoint returns 401 without token"""
        response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/quick-action",
            json={"action": "health_check"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_quick_action_invalid_action(self, headers):
        """Invalid action returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/quick-action",
            headers=headers,
            json={"action": "invalid_action_xyz"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}"
    
    def test_quick_action_health_check(self, headers):
        """Health check quick action works"""
        response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/quick-action",
            headers=headers,
            json={"action": "health_check"},
            timeout=45  # Quick actions have longer prompts
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data, "Should have response"
        assert "session_id" in data, "Should have session_id"
        assert len(data["response"]) > 100, "Health check should return detailed response"
        
        print(f"Health check response length: {len(data['response'])} chars")


class TestAiHelperSessionManagement:
    """Test AI Helper session CRUD"""
    
    def test_session_messages(self, headers):
        """Can get messages for a session"""
        # First get sessions
        sessions_response = requests.get(
            f"{BASE_URL}/api/dev-control/ai-helper/sessions",
            headers=headers
        )
        assert sessions_response.status_code == 200
        
        sessions = sessions_response.json()["sessions"]
        if len(sessions) > 0:
            session_id = sessions[0]["id"]
            
            # Get session messages
            messages_response = requests.get(
                f"{BASE_URL}/api/dev-control/ai-helper/sessions/{session_id}",
                headers=headers
            )
            assert messages_response.status_code == 200, f"Expected 200, got {messages_response.status_code}"
            
            data = messages_response.json()
            assert "messages" in data, "Response should have 'messages'"
            assert "session_id" in data, "Response should have 'session_id'"
            
            if len(data["messages"]) > 0:
                msg = data["messages"][0]
                assert "role" in msg, "Message should have 'role'"
                assert "content" in msg, "Message should have 'content'"
                assert msg["role"] in ["user", "assistant"], f"Invalid role: {msg['role']}"
    
    def test_delete_session(self, headers):
        """Can delete an AI session"""
        # Create a session first by sending a message
        create_response = requests.post(
            f"{BASE_URL}/api/dev-control/ai-helper/chat",
            headers=headers,
            json={"message": "TEST_SESSION_TO_DELETE: What is 1+1?"},
            timeout=30
        )
        
        if create_response.status_code == 200:
            session_id = create_response.json()["session_id"]
            
            # Delete the session
            delete_response = requests.delete(
                f"{BASE_URL}/api/dev-control/ai-helper/sessions/{session_id}",
                headers=headers
            )
            assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
            
            # Verify deletion - session messages should be empty
            verify_response = requests.get(
                f"{BASE_URL}/api/dev-control/ai-helper/sessions/{session_id}",
                headers=headers
            )
            # Session may still return 200 but with empty messages
            assert verify_response.status_code == 200
            messages = verify_response.json().get("messages", [])
            assert len(messages) == 0, "Deleted session should have no messages"


# ============== PREVIOUS FEATURES STILL WORK ==============
class TestPreviousFeaturesStillWork:
    """Verify previous iteration 84 features still work"""
    
    def test_architecture_still_works(self, headers):
        """Architecture endpoint still returns file trees"""
        response = requests.get(f"{BASE_URL}/api/dev-control/architecture", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "backend" in data and "frontend" in data
    
    def test_endpoints_still_works(self, headers):
        """Endpoints discovery still works"""
        response = requests.get(f"{BASE_URL}/api/dev-control/endpoints", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data and "total" in data
        assert data["total"] > 50
    
    def test_principles_still_works(self, headers):
        """Principles endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/dev-control/principles", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "principles" in data
    
    def test_roadmap_still_works(self, headers):
        """Roadmap endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/dev-control/roadmap", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_annotations_crud_still_works(self, headers):
        """Annotations CRUD still works"""
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/dev-control/annotations",
            headers=headers,
            json={
                "title": f"TEST_iter85_{uuid.uuid4().hex[:6]}",
                "content": "Testing previous features still work",
                "category": "general"
            }
        )
        assert create_response.status_code == 200
        annotation_id = create_response.json()["id"]
        
        # Read
        read_response = requests.get(f"{BASE_URL}/api/dev-control/annotations", headers=headers)
        assert read_response.status_code == 200
        
        # Delete (cleanup)
        delete_response = requests.delete(
            f"{BASE_URL}/api/dev-control/annotations/{annotation_id}",
            headers=headers
        )
        assert delete_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
