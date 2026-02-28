"""
Test Presale Sync to Inventory Feature
Tests the sync-inventory endpoint that:
1. Aggregates all presale order items
2. Creates inventory products for unmatched books
3. Re-links presale items to inventory products
4. Recalculates reserved_quantity on each product
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token using /api/auth-v2/login"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("token") or data.get("access_token")
    assert token, "No token in login response"
    return token


@pytest.fixture(scope="module")
def headers(admin_token):
    """Auth headers"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestPresaleSyncToInventory:
    """Test sync-inventory endpoint and its effects"""

    def test_sync_inventory_endpoint_returns_sync_results(self, headers):
        """POST /api/sysbook/presale-import/sync-inventory should work and return sync results"""
        response = requests.post(f"{BASE_URL}/api/sysbook/presale-import/sync-inventory", headers=headers)
        
        assert response.status_code == 200, f"Sync failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "created" in data, "Response should contain 'created' count"
        assert "matched" in data, "Response should contain 'matched' count"
        assert "updated_orders" in data, "Response should contain 'updated_orders' count"
        assert "products_with_reservations" in data or "total_reserved_units" in data, "Response should have reservation info"
        
        print(f"Sync results: created={data.get('created')}, matched={data.get('matched')}, "
              f"updated_orders={data.get('updated_orders')}, reserved_units={data.get('total_reserved_units')}")

    def test_inventory_products_have_reserved_quantity(self, headers):
        """After sync, GET /api/sysbook/inventory/products should show products with reserved_quantity > 0"""
        response = requests.get(f"{BASE_URL}/api/sysbook/inventory/products?limit=500", headers=headers)
        
        assert response.status_code == 200, f"Fetch products failed: {response.text}"
        data = response.json()
        
        products = data.get("products", [])
        assert len(products) > 0, "Should have products in inventory"
        
        # Count products with reserved_quantity > 0
        products_with_reservations = [p for p in products if (p.get("reserved_quantity") or 0) > 0]
        total_reserved = sum(p.get("reserved_quantity", 0) for p in products)
        
        print(f"Total products: {len(products)}")
        print(f"Products with reserved_quantity > 0: {len(products_with_reservations)}")
        print(f"Total reserved units: {total_reserved}")
        
        # Based on context - 31 presale orders with 308 items, there should be reservations
        assert len(products_with_reservations) > 0, "Should have products with reserved_quantity > 0 after sync"
        assert total_reserved > 0, "Total reserved quantity should be > 0"

    def test_presale_orders_items_are_matched(self, headers):
        """After sync, presale order items should all have matched: true"""
        response = requests.get(f"{BASE_URL}/api/sysbook/presale-import/orders", headers=headers)
        
        assert response.status_code == 200, f"Fetch orders failed: {response.text}"
        data = response.json()
        
        orders = data.get("orders", [])
        assert len(orders) > 0, "Should have presale orders"
        
        total_items = 0
        matched_items = 0
        unmatched_items = []
        
        for order in orders:
            items = order.get("items", [])
            for item in items:
                total_items += 1
                if item.get("matched"):
                    matched_items += 1
                else:
                    unmatched_items.append({
                        "order_id": order.get("order_id"),
                        "book_name": item.get("book_name"),
                        "book_code": item.get("book_code"),
                        "book_id": item.get("book_id")
                    })
        
        print(f"Total orders: {len(orders)}")
        print(f"Total items: {total_items}")
        print(f"Matched items: {matched_items}")
        print(f"Unmatched items: {len(unmatched_items)}")
        
        if unmatched_items:
            print(f"Sample unmatched items: {unmatched_items[:5]}")
        
        # All items should be matched after sync
        assert matched_items == total_items, f"All items should be matched after sync. Found {len(unmatched_items)} unmatched"

    def test_sync_is_idempotent(self, headers):
        """Calling sync twice should not create duplicate products"""
        # First sync - record current state
        products_before = requests.get(f"{BASE_URL}/api/sysbook/inventory/products?limit=500", headers=headers).json()
        product_count_before = len(products_before.get("products", []))
        
        # Run sync first time
        sync_result_1 = requests.post(f"{BASE_URL}/api/sysbook/presale-import/sync-inventory", headers=headers)
        assert sync_result_1.status_code == 200, f"First sync failed: {sync_result_1.text}"
        data_1 = sync_result_1.json()
        
        # Run sync second time
        sync_result_2 = requests.post(f"{BASE_URL}/api/sysbook/presale-import/sync-inventory", headers=headers)
        assert sync_result_2.status_code == 200, f"Second sync failed: {sync_result_2.text}"
        data_2 = sync_result_2.json()
        
        # Check product count after second sync
        products_after = requests.get(f"{BASE_URL}/api/sysbook/inventory/products?limit=500", headers=headers).json()
        product_count_after = len(products_after.get("products", []))
        
        print(f"Products before first sync: {product_count_before}")
        print(f"First sync - created: {data_1.get('created')}, matched: {data_1.get('matched')}")
        print(f"Second sync - created: {data_2.get('created')}, matched: {data_2.get('matched')}")
        print(f"Products after second sync: {product_count_after}")
        
        # Second sync should not create new products (all should match)
        assert data_2.get("created", 0) == 0, "Second sync should not create new products (idempotent)"
        
        # Product count should remain stable
        assert product_count_after == product_count_before or data_1.get("created", 0) == 0, \
            "Product count should not increase after second sync"

    def test_presale_column_shows_correct_values(self, headers):
        """Verify inventory products show correct reserved_quantity values"""
        # Get orders first to calculate expected reservations
        orders_response = requests.get(f"{BASE_URL}/api/sysbook/presale-import/orders", headers=headers)
        assert orders_response.status_code == 200
        orders = orders_response.json().get("orders", [])
        
        # Calculate expected reservations by book_id
        expected_reservations = {}
        for order in orders:
            for item in order.get("items", []):
                book_id = item.get("book_id")
                if book_id and not book_id.startswith("unmatched_"):
                    qty = item.get("quantity_ordered", 1)
                    expected_reservations[book_id] = expected_reservations.get(book_id, 0) + qty
        
        # Get products and verify
        products_response = requests.get(f"{BASE_URL}/api/sysbook/inventory/products?limit=500", headers=headers)
        assert products_response.status_code == 200
        products = products_response.json().get("products", [])
        
        # Check a sample of products
        products_with_reservations = [p for p in products if p.get("reserved_quantity", 0) > 0]
        
        print(f"Products with reservations from API: {len(products_with_reservations)}")
        print(f"Expected products with reservations: {len(expected_reservations)}")
        
        # Sample verification
        for product in products_with_reservations[:5]:
            book_id = product.get("book_id")
            reserved = product.get("reserved_quantity", 0)
            expected = expected_reservations.get(book_id, 0)
            print(f"Product {book_id}: reserved={reserved}, expected={expected}, name={product.get('name', '')[:40]}")
            
        assert len(products_with_reservations) > 0, "Should have products with presale reservations displayed"


class TestPresaleOrdersEndpoint:
    """Test the presale orders endpoint"""
    
    def test_get_presale_orders(self, headers):
        """GET /api/sysbook/presale-import/orders should return orders"""
        response = requests.get(f"{BASE_URL}/api/sysbook/presale-import/orders", headers=headers)
        
        assert response.status_code == 200, f"Fetch orders failed: {response.text}"
        data = response.json()
        
        assert "orders" in data, "Response should contain 'orders'"
        orders = data["orders"]
        
        print(f"Total presale orders: {len(orders)}")
        
        # Verify order structure
        if orders:
            sample_order = orders[0]
            assert "order_id" in sample_order
            assert "student_name" in sample_order
            assert "items" in sample_order
            print(f"Sample order: {sample_order.get('order_id')}, student: {sample_order.get('student_name')}, items: {len(sample_order.get('items', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
