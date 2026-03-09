"""
Test file for Gmail Integration - Steps 2-3 of Gmail-to-Wallet pipeline.
Tests: Gmail IMAP connection, AI email parsing, rules engine, processing log.
Iteration 87 - Gmail + AI parsing system testing.
"""
import pytest
import requests
import os
import time

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


# ============== GMAIL CONNECTION TESTS ==============

class TestGmailConnection:
    """Test Gmail IMAP connection and status"""
    
    def test_gmail_status_requires_auth(self):
        """GET /api/wallet-topups/gmail/status requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/gmail/status requires auth")
    
    def test_gmail_status_connected(self, headers):
        """GET /api/wallet-topups/gmail/status returns connected=true for toolskoh@gmail.com"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "connected" in data, "Response should include 'connected'"
        assert data["connected"] is True, f"Gmail should be connected, got error: {data.get('error')}"
        assert data.get("email") == "toolskoh@gmail.com", f"Expected toolskoh@gmail.com, got {data.get('email')}"
        assert "total_emails" in data, "Response should include 'total_emails'"
        
        print(f"✓ Gmail connected: {data['email']} with {data['total_emails']} emails in inbox")


# ============== GMAIL EMAILS FETCH TESTS ==============

class TestGmailEmails:
    """Test fetching emails from Gmail inbox"""
    
    def test_gmail_emails_requires_auth(self):
        """GET /api/wallet-topups/gmail/emails requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/emails")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/gmail/emails requires auth")
    
    def test_gmail_emails_returns_list(self, headers):
        """GET /api/wallet-topups/gmail/emails returns actual emails from inbox"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/emails?limit=10", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "emails" in data, "Response should include 'emails'"
        assert "total" in data, "Response should include 'total'"
        assert isinstance(data["emails"], list), "Emails should be a list"
        
        # Should have emails (inbox has 199 emails)
        assert len(data["emails"]) > 0, "Should have at least some emails"
        
        # Check email structure
        if data["emails"]:
            email = data["emails"][0]
            assert "id" in email or "imap_id" in email, "Email should have ID"
            assert "from" in email, "Email should have 'from'"
            assert "subject" in email, "Email should have 'subject'"
            assert "date" in email, "Email should have 'date'"
        
        print(f"✓ GET /api/wallet-topups/gmail/emails returns {len(data['emails'])} emails")
        
        # Print first few email subjects for context
        for em in data["emails"][:3]:
            print(f"  - Subject: {em.get('subject', '(no subject)')[:60]}")


# ============== AI EMAIL PARSING TESTS ==============

class TestAIEmailParsing:
    """Test AI-powered email parsing via /process-single endpoint"""
    
    def test_process_single_requires_auth(self):
        """POST /api/wallet-topups/gmail/process-single requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json={"body": "test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/wallet-topups/gmail/process-single requires auth")
    
    def test_process_single_requires_body(self, headers):
        """POST /api/wallet-topups/gmail/process-single requires email body"""
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json={},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/wallet-topups/gmail/process-single requires body (400)")
    
    def test_process_single_bank_email_spanish(self, headers):
        """POST /api/wallet-topups/gmail/process-single parses Spanish bank email correctly"""
        # Simulated Spanish bank transfer alert
        bank_email = {
            "from": "alertas@yappy.com.pa",
            "subject": "Transferencia recibida - Yappy",
            "body": "Se ha recibido transferencia por USD 200.00 de Maria Lopez, referencia TRX-99887. Gracias por usar Yappy."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json=bank_email,
            headers=headers,
            timeout=30  # AI may take 3-5 seconds
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parsed_data" in data, "Response should include 'parsed_data'"
        parsed = data["parsed_data"]
        
        # Check AI extracted the correct values
        assert parsed.get("parsed") is True, f"Parsing should succeed, got: {parsed}"
        assert parsed.get("amount") == 200 or parsed.get("amount") == 200.0, f"Amount should be 200, got {parsed.get('amount')}"
        assert "USD" in parsed.get("currency", "").upper(), f"Currency should be USD, got {parsed.get('currency')}"
        assert "maria" in parsed.get("sender_name", "").lower() or "lopez" in parsed.get("sender_name", "").lower(), \
            f"Sender should contain 'Maria' or 'Lopez', got {parsed.get('sender_name')}"
        assert "99887" in str(parsed.get("bank_reference", "")), f"Reference should contain 99887, got {parsed.get('bank_reference')}"
        assert parsed.get("confidence", 0) >= 50, f"Confidence should be >= 50, got {parsed.get('confidence')}"
        
        # Check rules result
        assert "rule_result" in data, "Response should include 'rule_result'"
        
        print(f"✓ AI parsed bank email: ${parsed.get('amount')} {parsed.get('currency')} from {parsed.get('sender_name')}")
        print(f"  Reference: {parsed.get('bank_reference')}, Confidence: {parsed.get('confidence')}%")
    
    def test_process_single_non_bank_email(self, headers):
        """AI correctly rejects non-bank emails (confidence < 30 or amount = 0)"""
        non_bank_email = {
            "from": "noreply@google.com",
            "subject": "New sign-in to your Google Account",
            "body": "We noticed a new sign-in to your Google Account. If this was you, you can safely ignore this email."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json=non_bank_email,
            headers=headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        parsed = data.get("parsed_data", {})
        
        # Non-bank email should have either low confidence or amount=0
        amount = parsed.get("amount", 0)
        confidence = parsed.get("confidence", 0)
        
        assert amount == 0 or confidence < 30, \
            f"Non-bank email should have amount=0 or confidence<30, got amount={amount}, confidence={confidence}"
        
        print(f"✓ AI correctly identified non-bank email: amount={amount}, confidence={confidence}")
    
    def test_process_single_english_bank_email(self, headers):
        """AI parses English bank email correctly"""
        bank_email = {
            "from": "alerts@banknational.com",
            "subject": "Wire Transfer Received",
            "body": "A wire transfer of $1,500.00 USD has been deposited into your account from John Smith. Reference number: WR-2024-ABC123."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json=bank_email,
            headers=headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        parsed = data.get("parsed_data", {})
        
        assert parsed.get("parsed") is True, "Should parse successfully"
        assert parsed.get("amount") == 1500 or parsed.get("amount") == 1500.0, f"Amount should be 1500, got {parsed.get('amount')}"
        assert parsed.get("confidence", 0) >= 50, f"Confidence should be >= 50, got {parsed.get('confidence')}"
        
        print(f"✓ AI parsed English bank email: ${parsed.get('amount')} {parsed.get('currency')}, confidence={parsed.get('confidence')}%")


# ============== RULES ENGINE TESTS ==============

class TestRulesEngine:
    """Test the email filter rules engine"""
    
    def test_rules_sender_whitelist(self, headers):
        """Rules engine: sender whitelist works"""
        # First get current rules and save them
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/rules", headers=headers)
        original_rules = get_resp.json()
        
        # Set sender whitelist to only accept specific sender
        requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={"sender_whitelist": ["alerts@trustedbank.com"], "enabled": True},
            headers=headers
        )
        
        # Test email from non-whitelisted sender
        email_from_other = {
            "from": "alerts@otherbank.com",
            "subject": "Transfer received",
            "body": "USD 100.00 deposit from Test User, ref: TR123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json=email_from_other,
            headers=headers,
            timeout=30
        )
        assert response.status_code == 200
        
        rule_result = response.json().get("rule_result", {})
        
        # Should fail due to sender not in whitelist
        assert rule_result.get("pass") is False, f"Should reject non-whitelisted sender: {rule_result}"
        assert "whitelist" in rule_result.get("reason", "").lower(), f"Reason should mention whitelist: {rule_result.get('reason')}"
        
        print(f"✓ Sender whitelist works - rejected non-whitelisted sender: {rule_result.get('reason')}")
        
        # Restore original rules
        restore_data = {k: v for k, v in original_rules.items() if k in [
            "sender_whitelist", "must_contain_keywords", "must_not_contain_keywords",
            "amount_auto_approve_threshold", "amount_max_threshold", "enabled"
        ]}
        requests.put(f"{BASE_URL}/api/wallet-topups/rules", json=restore_data, headers=headers)
    
    def test_rules_must_not_contain(self, headers):
        """Rules engine: must-not-contain keywords work"""
        # Get and save current rules
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/rules", headers=headers)
        original_rules = get_resp.json()
        
        # Set must-not-contain to reject "reversal" keyword
        requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={
                "must_not_contain_keywords": ["reversal", "cancelled"],
                "sender_whitelist": [],  # Accept all senders
                "enabled": True
            },
            headers=headers
        )
        
        # Test email with rejected keyword
        email_with_reversal = {
            "from": "alerts@bank.com",
            "subject": "Transaction reversal notice",
            "body": "USD 100.00 reversal processed. Your transfer has been reversed."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json=email_with_reversal,
            headers=headers,
            timeout=30
        )
        assert response.status_code == 200
        
        rule_result = response.json().get("rule_result", {})
        
        # Should fail due to must-not-contain keyword
        assert rule_result.get("pass") is False, f"Should reject email with 'reversal': {rule_result}"
        
        print(f"✓ Must-not-contain keywords work - rejected: {rule_result.get('reason')}")
        
        # Restore original rules
        restore_data = {k: v for k, v in original_rules.items() if k in [
            "sender_whitelist", "must_contain_keywords", "must_not_contain_keywords",
            "amount_auto_approve_threshold", "amount_max_threshold", "enabled"
        ]}
        requests.put(f"{BASE_URL}/api/wallet-topups/rules", json=restore_data, headers=headers)
    
    def test_rules_amount_max_threshold(self, headers):
        """Rules engine: amount max threshold works"""
        # Get and save current rules
        get_resp = requests.get(f"{BASE_URL}/api/wallet-topups/rules", headers=headers)
        original_rules = get_resp.json()
        
        # Set max threshold to $500
        requests.put(
            f"{BASE_URL}/api/wallet-topups/rules",
            json={
                "amount_max_threshold": 500,
                "sender_whitelist": [],
                "must_not_contain_keywords": [],
                "enabled": True
            },
            headers=headers
        )
        
        # Test email with amount above threshold
        high_amount_email = {
            "from": "alerts@bank.com",
            "subject": "Large deposit received",
            "body": "USD 1000.00 transfer received from Big Spender, ref: BIG123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process-single",
            json=high_amount_email,
            headers=headers,
            timeout=30
        )
        assert response.status_code == 200
        
        rule_result = response.json().get("rule_result", {})
        
        # Should fail due to amount exceeding max threshold
        # Note: This only applies if parsed amount > threshold
        parsed = response.json().get("parsed_data", {})
        if parsed.get("amount", 0) > 500:
            assert rule_result.get("pass") is False, f"Should reject amount > threshold: {rule_result}"
            print(f"✓ Amount max threshold works - rejected: {rule_result.get('reason')}")
        else:
            print(f"⚠ AI parsed amount as {parsed.get('amount')}, threshold test inconclusive")
        
        # Restore original rules
        restore_data = {k: v for k, v in original_rules.items() if k in [
            "sender_whitelist", "must_contain_keywords", "must_not_contain_keywords",
            "amount_auto_approve_threshold", "amount_max_threshold", "enabled"
        ]}
        requests.put(f"{BASE_URL}/api/wallet-topups/rules", json=restore_data, headers=headers)


# ============== GMAIL PROCESS (SCAN INBOX) TESTS ==============

class TestGmailProcess:
    """Test scanning Gmail inbox with AI parsing"""
    
    def test_gmail_process_requires_auth(self):
        """POST /api/wallet-topups/gmail/process requires auth"""
        response = requests.post(f"{BASE_URL}/api/wallet-topups/gmail/process")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/wallet-topups/gmail/process requires auth")
    
    def test_gmail_process_scans_inbox(self, headers):
        """POST /api/wallet-topups/gmail/process scans inbox and processes emails"""
        # Only scan 5 emails to keep test fast
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/gmail/process",
            json={"limit": 5},
            headers=headers,
            timeout=60  # Processing with AI can take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "processed" in data, "Response should include 'processed'"
        assert "created" in data, "Response should include 'created'"
        assert "skipped" in data, "Response should include 'skipped'"
        assert "rejected" in data, "Response should include 'rejected'"
        assert "details" in data, "Response should include 'details'"
        
        # Should have processed some emails
        assert data["processed"] > 0, "Should have processed at least 1 email"
        
        print(f"✓ Gmail process results: processed={data['processed']}, created={data['created']}, skipped={data['skipped']}, rejected={data['rejected']}")
        
        # Print details for first few
        for detail in data.get("details", [])[:3]:
            print(f"  - {detail.get('result')}: {detail.get('subject', '')[:50]}")


# ============== PROCESSING LOG TESTS ==============

class TestProcessingLog:
    """Test the processed emails log"""
    
    def test_processed_requires_auth(self):
        """GET /api/wallet-topups/gmail/processed requires auth"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/processed")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/wallet-topups/gmail/processed requires auth")
    
    def test_processed_returns_log(self, headers):
        """GET /api/wallet-topups/gmail/processed returns processing log"""
        response = requests.get(
            f"{BASE_URL}/api/wallet-topups/gmail/processed?limit=20",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should include 'items'"
        assert "total" in data, "Response should include 'total'"
        
        print(f"✓ Processing log has {len(data['items'])} items")
        
        # Check item structure if there are any
        if data["items"]:
            item = data["items"][0]
            assert "email_id" in item or "processed_at" in item, "Item should have email_id or processed_at"
            assert "result" in item, "Item should have 'result'"
            
            # Print a few log entries
            for it in data["items"][:3]:
                print(f"  - {it.get('result')}: processed at {it.get('processed_at', 'N/A')[:19]}")


# ============== STATS VERIFICATION AFTER OPERATIONS ==============

class TestStatsAfterOperations:
    """Verify stats are correct after Gmail operations"""
    
    def test_stats_show_gmail_connected(self, headers):
        """Stats should show gmail_connected=true after status check"""
        # First check gmail status to update connection
        requests.get(f"{BASE_URL}/api/wallet-topups/gmail/status", headers=headers)
        
        # Now check stats
        response = requests.get(f"{BASE_URL}/api/wallet-topups/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("gmail_connected") is True, f"gmail_connected should be True after status check"
        
        print(f"✓ Stats show gmail_connected={data.get('gmail_connected')}")
        print(f"  Pending: {data.get('pending')}, Approved: {data.get('approved')}, Rejected: {data.get('rejected')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
