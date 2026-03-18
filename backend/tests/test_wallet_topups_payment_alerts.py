"""
Test file for Wallet Topups / Payment Alerts Module
Tests all CRUD operations for pending top-ups, rules, settings, and stats.
Iteration 86 - Payment Alerts system testing.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "teck@koh.one", "password": "admin"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============== PENDING TOP-UPS TESTS ==============

class TestPendingTopupsAuth:
    """Test auth requirements for pending topups endpoints"""
    
    def test_list_pending_requires_auth(self):
        """GET /api/wallet-topups/pending requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/pending")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/pending requires auth (401/403)")
    
    def test_create_pending_requires_auth(self):
        """POST /api/wallet-topups/pending requires auth"""
        response = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json={"amount": 100})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/wallet-topups/pending requires auth (401/403)")


class TestPendingTopupsCRUD:
    """Test CRUD operations for pending top-ups"""
    
    def test_list_pending_topups(self, headers):
        """GET /api/wallet-topups/pending returns list with counts"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/pending", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert "counts" in data, "Response should contain 'counts'"
        assert "pending" in data["counts"], "Counts should include 'pending'"
        assert "approved" in data["counts"], "Counts should include 'approved'"
        assert "rejected" in data["counts"], "Counts should include 'rejected'"
        print(f"✓ GET /api/wallet-topups/pending returns {len(data['items'])} items with counts")
    
    def test_list_pending_with_filter(self, headers):
        """GET /api/wallet-topups/pending with status filter"""
        for status in ["all", "pending", "approved", "rejected"]:
            response = requests.get(f"{BASE_URL}/api/wallet-topups/pending?status={status}", headers=headers)
            assert response.status_code == 200, f"Filter '{status}' failed: {response.status_code}"
            print(f"✓ Status filter '{status}' works")
    
    def test_create_pending_topup_invalid(self, headers):
        """POST /api/wallet-topups/pending with invalid data returns 400"""
        # No amount
        response = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json={}, headers=headers)
        assert response.status_code == 400, f"Expected 400 for missing amount, got {response.status_code}"
        
        # Zero amount
        response = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json={"amount": 0}, headers=headers)
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        
        # Negative amount
        response = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json={"amount": -100}, headers=headers)
        assert response.status_code == 400, f"Expected 400 for negative amount, got {response.status_code}"
        print("✓ Invalid data returns 400 (missing, zero, negative amounts)")
    
    def test_create_pending_topup_success(self, headers):
        """POST /api/wallet-topups/pending creates a new pending top-up"""
        test_amount = 123.45
        test_sender = f"TEST_Sender_{uuid.uuid4().hex[:8]}"
        test_ref = f"TEST_REF_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "amount": test_amount,
            "sender_name": test_sender,
            "bank_reference": test_ref,
            "target_user_email": "test@example.com",
            "notes": "Test topup from pytest iteration 86"
        }
        
        response = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json=payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["amount"] == test_amount, "Amount should match"
        assert data["sender_name"] == test_sender, "Sender should match"
        assert data["bank_reference"] == test_ref, "Reference should match"
        assert data["status"] == "pending", "Status should be 'pending'"
        assert "id" in data, "Response should include ID"
        assert "created_at" in data, "Response should include created_at"
        
        # Store for later tests
        pytest.created_topup_id = data["id"]
        print(f"✓ Created pending topup with ID: {data['id']}")
        return data["id"]
    
    def test_get_pending_topup_by_id(self, headers):
        """GET /api/wallet-topups/pending/{id} returns specific topup"""
        topup_id = getattr(pytest, 'created_topup_id', None)
        if not topup_id:
            pytest.skip("No topup created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == topup_id, "ID should match"
        assert data["status"] == "pending", "Status should be pending"
        print(f"✓ GET /api/wallet-topups/pending/{topup_id[:8]}... returns correct data")
    
    def test_get_nonexistent_topup(self, headers):
        """GET /api/wallet-topups/pending/{id} returns 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/pending/nonexistent-id-123", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent topup returns 404")


class TestTopupApproveReject:
    """Test approve/reject workflow"""
    
    def test_approve_nonexistent(self, headers):
        """PUT /api/wallet-topups/pending/{id}/approve returns 404 for nonexistent"""
        response = requests.put(f"{BASE_URL}/api/wallet-topups/pending/nonexistent-id/approve", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Approve nonexistent returns 404")
    
    def test_reject_nonexistent(self, headers):
        """PUT /api/wallet-topups/pending/{id}/reject returns 404 for nonexistent"""
        response = requests.put(f"{BASE_URL}/api/wallet-topups/pending/nonexistent-id/reject", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Reject nonexistent returns 404")
    
    def test_approve_topup(self, headers):
        """PUT /api/wallet-topups/pending/{id}/approve approves a pending topup"""
        # Create a new topup for this test
        payload = {
            "amount": 50.00,
            "sender_name": f"TEST_Approve_{uuid.uuid4().hex[:6]}",
            "bank_reference": f"APPROVE_REF_{uuid.uuid4().hex[:6]}",
            "notes": "Test approve flow"
        }
        create_resp = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json=payload, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        topup_id = create_resp.json()["id"]
        
        # Approve it
        approve_resp = requests.put(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/approve", json={}, headers=headers)
        assert approve_resp.status_code == 200, f"Expected 200, got {approve_resp.status_code}: {approve_resp.text}"
        
        data = approve_resp.json()
        assert data["success"] is True, "Approve should return success=True"
        assert data["topup_id"] == topup_id, "ID should match"
        assert data["amount"] == 50.00, "Amount should match"
        # Note: credited may be False if target user doesn't exist, which is expected
        
        # Verify status changed to approved
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}", headers=headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "approved", "Status should be 'approved'"
        
        print(f"✓ Approved topup {topup_id[:8]}... - credited: {data.get('credited', False)}")
    
    def test_cannot_approve_already_approved(self, headers):
        """Cannot approve an already approved topup"""
        # Create and approve a topup
        payload = {"amount": 25.00, "sender_name": "TEST_DoubleApprove"}
        create_resp = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json=payload, headers=headers)
        topup_id = create_resp.json()["id"]
        
        # First approve
        requests.put(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/approve", json={}, headers=headers)
        
        # Second approve should fail
        second_resp = requests.put(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/approve", json={}, headers=headers)
        assert second_resp.status_code == 400, f"Expected 400, got {second_resp.status_code}"
        print("✓ Cannot approve already approved topup (400)")
    
    def test_reject_topup(self, headers):
        """PUT /api/wallet-topups/pending/{id}/reject rejects a pending topup"""
        # Create a new topup for rejection test
        payload = {
            "amount": 75.00,
            "sender_name": f"TEST_Reject_{uuid.uuid4().hex[:6]}",
            "bank_reference": f"REJECT_REF_{uuid.uuid4().hex[:6]}",
        }
        create_resp = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json=payload, headers=headers)
        assert create_resp.status_code == 200
        topup_id = create_resp.json()["id"]
        
        # Reject with reason
        reject_data = {"reason": "Test rejection - suspicious sender"}
        reject_resp = requests.put(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/reject", json=reject_data, headers=headers)
        assert reject_resp.status_code == 200, f"Expected 200, got {reject_resp.status_code}: {reject_resp.text}"
        
        data = reject_resp.json()
        assert data["success"] is True, "Reject should return success=True"
        assert data["topup_id"] == topup_id, "ID should match"
        
        # Verify status changed to rejected
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}", headers=headers)
        assert get_resp.status_code == 200
        item = get_resp.json()
        assert item["status"] == "rejected", "Status should be 'rejected'"
        assert item.get("reject_reason") == "Test rejection - suspicious sender", "Reject reason should be saved"
        
        print(f"✓ Rejected topup {topup_id[:8]}... with reason")
    
    def test_cannot_reject_already_rejected(self, headers):
        """Cannot reject an already rejected topup"""
        # Create and reject
        payload = {"amount": 30.00, "sender_name": "TEST_DoubleReject"}
        create_resp = requests.post(f"{BASE_URL}/api/wallet-topups/pending", json=payload, headers=headers)
        topup_id = create_resp.json()["id"]
        
        requests.put(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/reject", json={"reason": "first"}, headers=headers)
        
        # Second reject should fail
        second_resp = requests.put(f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/reject", json={"reason": "second"}, headers=headers)
        assert second_resp.status_code == 400, f"Expected 400, got {second_resp.status_code}"
        print("✓ Cannot reject already rejected topup (400)")


# ============== STATS TESTS ==============

class TestStats:
    """Test stats endpoint"""
    
    def test_stats_requires_auth(self):
        """GET /api/wallet-topups/stats requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/stats requires auth")
    
    def test_get_stats(self, headers):
        """GET /api/wallet-topups/stats returns correct counts"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pending" in data, "Stats should include 'pending'"
        assert "approved" in data, "Stats should include 'approved'"
        assert "rejected" in data, "Stats should include 'rejected'"
        assert "total_approved_amount" in data, "Stats should include 'total_approved_amount'"
        assert "today_pending" in data, "Stats should include 'today_pending'"
        assert "gmail_connected" in data, "Stats should include 'gmail_connected'"
        
        # Values should be numbers
        assert isinstance(data["pending"], int), "Pending should be int"
        assert isinstance(data["approved"], int), "Approved should be int"
        assert isinstance(data["rejected"], int), "Rejected should be int"
        assert isinstance(data["total_approved_amount"], (int, float)), "Total approved should be number"
        
        print(f"✓ Stats: pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}, total_approved=${data['total_approved_amount']}")


# ============== RULES TESTS ==============

class TestRules:
    """Test email filter rules endpoints"""
    
    def test_rules_requires_auth(self):
        """GET /api/wallet-topups/rules requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/rules")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/rules requires auth")
    
    def test_get_rules(self, headers):
        """GET /api/wallet-topups/rules returns default rules"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/rules", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Rules should include 'id'"
        assert "sender_whitelist" in data, "Rules should include 'sender_whitelist'"
        assert "must_contain_keywords" in data, "Rules should include 'must_contain_keywords'"
        assert "must_not_contain_keywords" in data, "Rules should include 'must_not_contain_keywords'"
        assert "amount_auto_approve_threshold" in data, "Rules should include 'amount_auto_approve_threshold'"
        assert "amount_max_threshold" in data, "Rules should include 'amount_max_threshold'"
        assert "enabled" in data, "Rules should include 'enabled'"
        
        print(f"✓ GET /api/wallet-topups/rules returns valid structure")
    
    def test_update_rules_invalid(self, headers):
        """PUT /api/wallet-topups/rules with no valid fields returns 400"""
        response = requests.put(f"{BASE_URL}/api/wallet-topups/rules", json={}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Update rules with no fields returns 400")
    
    def test_update_rules_sender_whitelist(self, headers):
        """PUT /api/wallet-topups/rules updates sender whitelist"""
        test_sender = f"test-bank-{uuid.uuid4().hex[:6]}@bank.com"
        
        # Get current
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/rules", headers=headers)
        current = get_resp.json()
        current_whitelist = current.get("sender_whitelist", [])
        
        # Add test sender
        new_whitelist = current_whitelist + [test_sender]
        update_resp = requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={"sender_whitelist": new_whitelist},
            headers=headers
        )
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}"
        assert test_sender in update_resp.json()["sender_whitelist"], "Test sender should be in whitelist"
        
        # Clean up - restore original
        requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={"sender_whitelist": current_whitelist},
            headers=headers
        )
        print("✓ Update sender whitelist works")
    
    def test_update_rules_thresholds(self, headers):
        """PUT /api/wallet-topups/rules updates amount thresholds"""
        update_resp = requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={
                "amount_auto_approve_threshold": 50,
                "amount_max_threshold": 5000
            },
            headers=headers
        )
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}"
        data = update_resp.json()
        assert data["amount_auto_approve_threshold"] == 50, "Auto approve threshold should be 50"
        assert data["amount_max_threshold"] == 5000, "Max threshold should be 5000"
        
        # Restore defaults
        requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={"amount_auto_approve_threshold": 0, "amount_max_threshold": 10000},
            headers=headers
        )
        print("✓ Update amount thresholds works")


# ============== SETTINGS TESTS ==============

class TestSettings:
    """Test processing settings endpoints"""
    
    def test_settings_requires_auth(self):
        """GET /api/wallet-topups/settings requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/settings requires auth")
    
    def test_get_settings(self, headers):
        """GET /api/wallet-topups/settings returns default settings"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/settings", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Settings should include 'id'"
        assert "gmail_connected" in data, "Settings should include 'gmail_connected'"
        assert "polling_mode" in data, "Settings should include 'polling_mode'"
        assert "polling_interval_minutes" in data, "Settings should include 'polling_interval_minutes'"
        assert "auto_process" in data, "Settings should include 'auto_process'"
        assert "require_approval" in data, "Settings should include 'require_approval'"
        
        print(f"✓ GET /api/wallet-topups/settings: gmail_connected={data['gmail_connected']}, polling_mode={data['polling_mode']}")
    
    def test_update_settings_invalid(self, headers):
        """PUT /api/wallet-topups/settings with no valid fields returns 400"""
        response = requests.put(f"{BASE_URL}/api/wallet-topups/settings", json={}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Update settings with no fields returns 400")
    
    def test_update_settings_polling_mode(self, headers):
        """PUT /api/wallet-topups/settings updates polling mode"""
        # Get current
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/settings", headers=headers)
        original_mode = get_resp.json().get("polling_mode", "realtime")
        
        # Update to polling
        update_resp = requests.put(
            f"{BASE_URL}/api/wallet-topups/settings",
            json={"polling_mode": "polling", "polling_interval_minutes": 10},
            headers=headers
        )
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}"
        data = update_resp.json()
        assert data["polling_mode"] == "polling", "Mode should be 'polling'"
        assert data["polling_interval_minutes"] == 10, "Interval should be 10"
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/wallet-topups/settings",
            json={"polling_mode": original_mode, "polling_interval_minutes": 5},
            headers=headers
        )
        print("✓ Update polling mode works")
    
    def test_update_settings_processing_options(self, headers):
        """PUT /api/wallet-topups/settings updates processing options"""
        update_resp = requests.put(
            f"{BASE_URL}/api/wallet-topups/settings",
            json={"auto_process": False, "require_approval": True},
            headers=headers
        )
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}"
        data = update_resp.json()
        assert data["auto_process"] is False, "auto_process should be False"
        assert data["require_approval"] is True, "require_approval should be True"
        
        # Restore defaults
        requests.put(
            f"{BASE_URL}/api/wallet-topups/settings",
            json={"auto_process": True, "require_approval": True},
            headers=headers
        )
        print("✓ Update processing options works")


# ============== DEV CONTROL CHANGES TAB FIX TEST ==============

class TestDevControlChangesFix:
    """Test Dev Control Changes tab fix (production resilience)"""
    
    def test_changes_log_returns_gracefully(self, headers):
        """GET /api/dev-control/changes-log returns gracefully even without git"""
        response = requests.get(f"{BASE_URL}/api/dev-control/changes-log", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "commits" in data, "Response should contain 'commits'"
        assert "available" in data, "Response should contain 'available'"
        
        if data["available"]:
            print(f"✓ Changes log available with {len(data['commits'])} commits")
        else:
            reason = data.get("reason", "unknown")
            print(f"✓ Changes log gracefully handles missing git: {reason}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
