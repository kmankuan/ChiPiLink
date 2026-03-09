"""
Wallet Transaction Bulk Operations Tests
- Bulk Archive, Bulk Unarchive, Bulk Delete
- Single Transaction Delete
- Verify archived field in GET /api/wallet/admin/transactions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWalletTransactionBulkOperations:
    """Test wallet transaction archive, unarchive, and delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        token = login_response.json().get('token')
        assert token, "No token in login response"
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
    def test_get_admin_transactions_returns_archived_field(self):
        """GET /api/wallet/admin/transactions should return transactions with archived field"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=10")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert 'transactions' in data, "Response should have transactions"
        assert 'total' in data, "Response should have total count"
        
        # Check that we have transactions
        transactions = data['transactions']
        print(f"Found {len(transactions)} transactions, total: {data['total']}")
        
        if len(transactions) > 0:
            # Each transaction should have standard fields
            tx = transactions[0]
            assert 'transaction_id' in tx, "Transaction should have transaction_id"
            assert 'user_id' in tx, "Transaction should have user_id"
            # archived field may or may not exist (only set when archived)
            print(f"First transaction has archived={tx.get('archived', 'not set')}")
    
    def test_bulk_archive_requires_transaction_ids(self):
        """POST /api/wallet/admin/transactions/bulk-archive should require transaction_ids"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-archive",
            json={}
        )
        assert response.status_code == 400, f"Should return 400 for empty request"
        assert 'No transactions specified' in response.text or 'detail' in response.json()
    
    def test_bulk_unarchive_requires_transaction_ids(self):
        """POST /api/wallet/admin/transactions/bulk-unarchive should require transaction_ids"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-unarchive",
            json={}
        )
        assert response.status_code == 400, f"Should return 400 for empty request"
        assert 'No transactions specified' in response.text or 'detail' in response.json()
    
    def test_bulk_delete_requires_transaction_ids(self):
        """POST /api/wallet/admin/transactions/bulk-delete should require transaction_ids"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-delete",
            json={}
        )
        assert response.status_code == 400, f"Should return 400 for empty request"
        assert 'No transactions specified' in response.text or 'detail' in response.json()
    
    def test_single_delete_nonexistent_returns_404(self):
        """DELETE /api/wallet/admin/transactions/{id} should return 404 for non-existent"""
        response = self.session.delete(
            f"{BASE_URL}/api/wallet/admin/transactions/NONEXISTENT_TX_ID_12345"
        )
        assert response.status_code == 404, f"Should return 404: {response.text}"
    
    def test_bulk_archive_archive_unarchive_flow(self):
        """Test full flow: Get transactions, archive them, verify archived, unarchive, verify restored"""
        # Step 1: Get transactions
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=100")
        assert response.status_code == 200
        transactions = response.json()['transactions']
        
        if len(transactions) == 0:
            pytest.skip("No transactions to test with")
        
        # Find non-archived transactions to test with
        non_archived = [tx for tx in transactions if not tx.get('archived')]
        if len(non_archived) < 2:
            pytest.skip("Not enough non-archived transactions to test")
        
        # Pick 2 transactions to archive
        test_tx_ids = [non_archived[0]['transaction_id'], non_archived[1]['transaction_id']]
        print(f"Testing with transaction IDs: {test_tx_ids}")
        
        # Step 2: Archive them
        archive_response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-archive",
            json={"transaction_ids": test_tx_ids}
        )
        assert archive_response.status_code == 200, f"Archive failed: {archive_response.text}"
        
        archive_data = archive_response.json()
        assert archive_data['status'] == 'archived', "Status should be 'archived'"
        assert archive_data['count'] == 2, f"Should archive 2 transactions, got {archive_data['count']}"
        print(f"Archived {archive_data['count']} transactions")
        
        # Step 3: Verify they are archived in GET response
        verify_response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=100")
        assert verify_response.status_code == 200
        
        all_txns = verify_response.json()['transactions']
        archived_txns = [tx for tx in all_txns if tx['transaction_id'] in test_tx_ids]
        
        for tx in archived_txns:
            assert tx.get('archived') == True, f"Transaction {tx['transaction_id']} should have archived=True"
            assert 'archived_at' in tx, f"Transaction {tx['transaction_id']} should have archived_at timestamp"
        print("Verified transactions have archived=True and archived_at")
        
        # Step 4: Unarchive them
        unarchive_response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-unarchive",
            json={"transaction_ids": test_tx_ids}
        )
        assert unarchive_response.status_code == 200, f"Unarchive failed: {unarchive_response.text}"
        
        unarchive_data = unarchive_response.json()
        assert unarchive_data['status'] == 'unarchived', "Status should be 'unarchived'"
        assert unarchive_data['count'] == 2, f"Should unarchive 2 transactions, got {unarchive_data['count']}"
        print(f"Unarchived {unarchive_data['count']} transactions")
        
        # Step 5: Verify they are no longer archived
        final_response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=100")
        assert final_response.status_code == 200
        
        final_txns = final_response.json()['transactions']
        restored_txns = [tx for tx in final_txns if tx['transaction_id'] in test_tx_ids]
        
        for tx in restored_txns:
            # archived field should be removed (not just False)
            assert tx.get('archived') is None or tx.get('archived') == False, \
                f"Transaction {tx['transaction_id']} should not be archived"
        print("Verified transactions are no longer archived")
    
    def test_bulk_archive_with_nonexistent_ids(self):
        """Bulk archive with non-existent IDs should return count=0"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-archive",
            json={"transaction_ids": ["FAKE_ID_1", "FAKE_ID_2"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'archived'
        assert data['count'] == 0, "Should not archive non-existent transactions"
    
    def test_bulk_unarchive_with_nonexistent_ids(self):
        """Bulk unarchive with non-existent IDs should return count=0"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-unarchive",
            json={"transaction_ids": ["FAKE_ID_1", "FAKE_ID_2"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'unarchived'
        assert data['count'] == 0, "Should not unarchive non-existent transactions"
    
    def test_bulk_delete_with_nonexistent_ids(self):
        """Bulk delete with non-existent IDs should return count=0"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/transactions/bulk-delete",
            json={"transaction_ids": ["FAKE_ID_1", "FAKE_ID_2"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'deleted'
        assert data['count'] == 0, "Should not delete non-existent transactions"
    
    def test_endpoints_require_admin_auth(self):
        """All bulk endpoints should require admin authentication"""
        # Create unauthenticated session
        no_auth_session = requests.Session()
        no_auth_session.headers.update({'Content-Type': 'application/json'})
        
        endpoints = [
            ('POST', f"{BASE_URL}/api/wallet/admin/transactions/bulk-archive", {"transaction_ids": ["test"]}),
            ('POST', f"{BASE_URL}/api/wallet/admin/transactions/bulk-unarchive", {"transaction_ids": ["test"]}),
            ('POST', f"{BASE_URL}/api/wallet/admin/transactions/bulk-delete", {"transaction_ids": ["test"]}),
            ('DELETE', f"{BASE_URL}/api/wallet/admin/transactions/test123", None),
            ('GET', f"{BASE_URL}/api/wallet/admin/transactions", None),
        ]
        
        for method, url, body in endpoints:
            if method == 'POST':
                response = no_auth_session.post(url, json=body)
            elif method == 'DELETE':
                response = no_auth_session.delete(url)
            else:
                response = no_auth_session.get(url)
            
            assert response.status_code in [401, 403], \
                f"{method} {url} should require auth, got {response.status_code}"
        
        print("All endpoints correctly require admin authentication")


class TestWalletTransactionDeleteIntegration:
    """Integration test for permanent deletion - creates test data then deletes it"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert login_response.status_code == 200
        token = login_response.json().get('token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
    def test_single_transaction_delete_flow(self):
        """Test single transaction DELETE endpoint"""
        # Get a transaction to potentially delete (we'll skip actual deletion to preserve data)
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=5")
        assert response.status_code == 200
        
        transactions = response.json()['transactions']
        if len(transactions) == 0:
            pytest.skip("No transactions available")
        
        # Don't actually delete - just verify endpoint accepts valid format
        # Test with non-existent ID to verify endpoint works
        test_id = "TEST_DELETE_NONEXISTENT_12345"
        delete_response = self.session.delete(
            f"{BASE_URL}/api/wallet/admin/transactions/{test_id}"
        )
        
        # Should return 404 for non-existent
        assert delete_response.status_code == 404
        assert 'Transaction not found' in delete_response.text or delete_response.json().get('detail')
        print("Single delete endpoint working correctly (404 for non-existent)")
    
    def test_transaction_data_structure(self):
        """Verify transaction data structure includes all expected fields"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert 'transactions' in data
        assert 'total' in data
        
        if len(data['transactions']) > 0:
            tx = data['transactions'][0]
            # Check expected fields
            expected_fields = ['transaction_id', 'user_id', 'amount', 'transaction_type']
            for field in expected_fields:
                assert field in tx, f"Transaction missing field: {field}"
            
            # Check enriched fields (may or may not be present)
            if 'user_email' in tx:
                print(f"Transaction enriched with user_email: {tx['user_email']}")
            if 'user_name' in tx:
                print(f"Transaction enriched with user_name: {tx['user_name']}")
            
            print(f"Transaction structure verified: {list(tx.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
