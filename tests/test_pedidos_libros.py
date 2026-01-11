"""
Test Suite for Pedidos de Libros Escolares (School Book Orders)
Tests the complete pre-order flow including:
- Order preview for students
- Creating draft orders
- Adding/removing items
- Confirming pre-orders
- Duplicate book restriction per student per year
- Admin demand aggregation and order management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"

# Known test data from context
EXISTING_STUDENT_SYNC_ID = "sync_9cc621714fdb"  # Carlos Rodriguez, 2do Grado
EXISTING_ORDER_ID = "ped_438fb868e68c"  # Confirmed order with MAT201, ESP201
NEW_STUDENT_SYNC_ID = "sync_5031d618d653"  # Juan Perez, 1er Grado
FIRST_GRADE_BOOKS = ["MAT101", "ESP101", "CIE101"]


class TestPedidosAuth:
    """Test authentication for pedidos endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_preview_requires_auth(self):
        """Test that preview endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/pedidos/preview/{EXISTING_STUDENT_SYNC_ID}")
        assert response.status_code in [401, 403], "Preview should require auth"
    
    def test_crear_pedido_requires_auth(self):
        """Test that crear pedido requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/crear",
            json={"estudiante_sync_id": EXISTING_STUDENT_SYNC_ID}
        )
        assert response.status_code in [401, 403], "Crear pedido should require auth"
    
    def test_mis_pedidos_requires_auth(self):
        """Test that mis-pedidos requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/pedidos/mis-pedidos")
        assert response.status_code in [401, 403], "Mis pedidos should require auth"


class TestPedidosPreview:
    """Test order preview functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_preview_existing_student(self, admin_token):
        """Test preview for student with existing vinculacion"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/preview/{EXISTING_STUDENT_SYNC_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Preview failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Preview not successful: {data}"
        assert "estudiante" in data, "Missing estudiante in response"
        assert "libros_requeridos" in data, "Missing libros_requeridos"
        assert "libros_pendientes" in data, "Missing libros_pendientes"
        assert "libros_ya_pedidos" in data, "Missing libros_ya_pedidos"
        assert "resumen" in data, "Missing resumen"
        assert "total_estimado" in data, "Missing total_estimado"
        
        # Verify student info
        estudiante = data["estudiante"]
        assert estudiante.get("sync_id") == EXISTING_STUDENT_SYNC_ID
        assert estudiante.get("grado") is not None
        
        # Verify resumen structure
        resumen = data["resumen"]
        assert "total_libros" in resumen
        assert "libros_pedidos" in resumen
        assert "libros_faltantes" in resumen
        
        print(f"Preview successful: {resumen['total_libros']} total, {resumen['libros_pedidos']} ordered, {resumen['libros_faltantes']} pending")
    
    def test_preview_invalid_student(self, admin_token):
        """Test preview for non-existent student"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/preview/invalid_sync_id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 400 or success=false
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == False, "Should fail for invalid student"
        else:
            assert response.status_code == 400


class TestPedidosCrearYModificar:
    """Test creating and modifying orders"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_crear_pedido_borrador(self, admin_token):
        """Test creating a draft order"""
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/crear",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "estudiante_sync_id": EXISTING_STUDENT_SYNC_ID,
                "tipo": "pre_orden"
            }
        )
        assert response.status_code == 200, f"Crear pedido failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Crear pedido not successful: {data}"
        assert "pedido_id" in data, "Missing pedido_id"
        
        # Store for later tests
        pytest.created_pedido_id = data["pedido_id"]
        print(f"Created/retrieved order: {data['pedido_id']}, es_existente: {data.get('es_existente')}")
    
    def test_obtener_pedido(self, admin_token):
        """Test getting a specific order"""
        if not hasattr(pytest, 'created_pedido_id'):
            pytest.skip("No pedido created")
        
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/{pytest.created_pedido_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get pedido failed: {response.text}"
        
        data = response.json()
        assert data.get("pedido_id") == pytest.created_pedido_id
        assert "estado" in data
        assert "items" in data
        print(f"Order state: {data['estado']}, items: {len(data.get('items', []))}")
    
    def test_agregar_todos_libros(self, admin_token):
        """Test adding all missing books to order"""
        if not hasattr(pytest, 'created_pedido_id'):
            pytest.skip("No pedido created")
        
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/{pytest.created_pedido_id}/agregar-todos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # May fail if order is not in borrador state
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"Added {data.get('agregados', 0)} books, errors: {len(data.get('errores', []))}")
        elif response.status_code == 400:
            data = response.json()
            print(f"Could not add books: {data.get('detail')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestMisPedidos:
    """Test getting user's orders"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_obtener_mis_pedidos(self, admin_token):
        """Test getting all user orders"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/mis-pedidos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Mis pedidos failed: {response.text}"
        
        data = response.json()
        assert "pedidos" in data, "Missing pedidos in response"
        
        pedidos = data["pedidos"]
        print(f"Found {len(pedidos)} orders")
        
        # Verify structure of orders
        if pedidos:
            pedido = pedidos[0]
            assert "pedido_id" in pedido
            assert "estado" in pedido
            assert "estudiante_nombre" in pedido
            assert "total" in pedido
    
    def test_filtrar_por_estudiante(self, admin_token):
        """Test filtering orders by student"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/mis-pedidos",
            params={"estudiante_sync_id": EXISTING_STUDENT_SYNC_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        # All orders should be for the specified student
        for pedido in pedidos:
            assert pedido.get("estudiante_sync_id") == EXISTING_STUDENT_SYNC_ID
        
        print(f"Found {len(pedidos)} orders for student {EXISTING_STUDENT_SYNC_ID}")
    
    def test_filtrar_por_estado(self, admin_token):
        """Test filtering orders by state"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/mis-pedidos",
            params={"estado": "pre_orden"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        # All orders should have the specified state
        for pedido in pedidos:
            assert pedido.get("estado") == "pre_orden"
        
        print(f"Found {len(pedidos)} pre_orden orders")


class TestPedidosAdmin:
    """Test admin endpoints for order management"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_admin_demanda_agregada(self, admin_token):
        """Test getting aggregated demand for books"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/demanda",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Demanda failed: {response.text}"
        
        data = response.json()
        assert "ano_escolar" in data, "Missing ano_escolar"
        assert "total_pre_ordenes" in data, "Missing total_pre_ordenes"
        assert "total_confirmados" in data, "Missing total_confirmados"
        assert "total_estudiantes" in data, "Missing total_estudiantes"
        assert "valor_total_estimado" in data, "Missing valor_total_estimado"
        assert "libros" in data, "Missing libros"
        
        print(f"Demand summary: {data['total_pre_ordenes']} pre-orders, {data['total_confirmados']} confirmed")
        print(f"Total students: {data['total_estudiantes']}, Total value: ${data['valor_total_estimado']:.2f}")
        
        # Verify libro structure
        if data["libros"]:
            libro = data["libros"][0]
            assert "libro_id" in libro
            assert "codigo" in libro
            assert "nombre" in libro
            assert "cantidad_total" in libro
            assert "cantidad_pre_ordenes" in libro
            assert "cantidad_confirmados" in libro
    
    def test_admin_todos_pedidos(self, admin_token):
        """Test getting all orders (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/todos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin todos failed: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing total"
        assert "pedidos" in data, "Missing pedidos"
        assert "pagina" in data, "Missing pagina"
        assert "total_paginas" in data, "Missing total_paginas"
        
        print(f"Total orders: {data['total']}, Page {data['pagina']}/{data['total_paginas']}")
    
    def test_admin_filtrar_por_estado(self, admin_token):
        """Test filtering orders by state (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/todos",
            params={"estado": "pre_orden"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        for pedido in pedidos:
            assert pedido.get("estado") == "pre_orden"
        
        print(f"Found {len(pedidos)} pre_orden orders (admin)")
    
    def test_admin_obtener_pedido(self, admin_token):
        """Test getting specific order (admin)"""
        # First get list of orders
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/todos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        if not pedidos:
            pytest.skip("No orders to test")
        
        pedido_id = pedidos[0]["pedido_id"]
        
        # Get specific order
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/{pedido_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin get pedido failed: {response.text}"
        
        data = response.json()
        assert data.get("pedido_id") == pedido_id
        print(f"Admin retrieved order: {pedido_id}")
    
    def test_admin_actualizar_estado(self, admin_token):
        """Test updating order state (admin)"""
        # First get a pre_orden to update
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/todos",
            params={"estado": "pre_orden"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        if not pedidos:
            pytest.skip("No pre_orden orders to test state update")
        
        pedido_id = pedidos[0]["pedido_id"]
        
        # Update to confirmado
        response = requests.put(
            f"{BASE_URL}/api/store/pedidos/admin/{pedido_id}/estado",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"nuevo_estado": "confirmado", "notas": "Test update"}
        )
        assert response.status_code == 200, f"Update estado failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("estado") == "confirmado"
        
        print(f"Updated order {pedido_id} to confirmado")
        
        # Revert back to pre_orden for other tests
        requests.put(
            f"{BASE_URL}/api/store/pedidos/admin/{pedido_id}/estado",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"nuevo_estado": "pre_orden"}
        )
    
    def test_admin_estado_invalido(self, admin_token):
        """Test updating to invalid state"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/admin/todos",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        if not pedidos:
            pytest.skip("No orders to test")
        
        pedido_id = pedidos[0]["pedido_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/store/pedidos/admin/{pedido_id}/estado",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"nuevo_estado": "estado_invalido"}
        )
        assert response.status_code == 400, "Should reject invalid state"


class TestRestriccionDuplicados:
    """Test duplicate book restriction per student per year"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_verificar_libros_ya_pedidos_en_preview(self, admin_token):
        """Test that preview shows already ordered books"""
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/preview/{EXISTING_STUDENT_SYNC_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        if not data.get("success"):
            pytest.skip(f"Preview failed: {data.get('error')}")
        
        libros_ya_pedidos = data.get("libros_ya_pedidos", [])
        libros_pendientes = data.get("libros_pendientes", [])
        
        print(f"Already ordered: {len(libros_ya_pedidos)}, Pending: {len(libros_pendientes)}")
        
        # Verify ya_pedido flag in libros_requeridos
        for libro in data.get("libros_requeridos", []):
            if libro.get("ya_pedido"):
                assert libro.get("pedido_id") is not None, "ya_pedido should have pedido_id"


class TestCancelarPedido:
    """Test order cancellation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_cancelar_pedido_borrador(self, admin_token):
        """Test canceling a draft order"""
        # First create a new order
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/crear",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "estudiante_sync_id": EXISTING_STUDENT_SYNC_ID,
                "tipo": "pre_orden"
            }
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create order for cancellation test")
        
        data = response.json()
        pedido_id = data.get("pedido_id")
        
        if not pedido_id:
            pytest.skip("No pedido_id returned")
        
        # Cancel the order
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/{pedido_id}/cancelar",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"motivo": "Test cancellation"}
        )
        
        # May succeed or fail depending on order state
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"Successfully canceled order {pedido_id}")
        else:
            print(f"Could not cancel order: {response.json().get('detail')}")


class TestConfirmarPedido:
    """Test order confirmation flow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_confirmar_pedido_vacio_falla(self, admin_token):
        """Test that confirming empty order fails"""
        # Create a new order
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/crear",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "estudiante_sync_id": EXISTING_STUDENT_SYNC_ID,
                "tipo": "pre_orden"
            }
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create order")
        
        data = response.json()
        pedido_id = data.get("pedido_id")
        
        # Get order to check if it has items
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/{pedido_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            order_data = response.json()
            if order_data.get("estado") != "borrador":
                pytest.skip("Order is not in borrador state")
            
            if not order_data.get("items"):
                # Try to confirm empty order - should fail
                response = requests.post(
                    f"{BASE_URL}/api/store/pedidos/{pedido_id}/confirmar",
                    headers={
                        "Authorization": f"Bearer {admin_token}",
                        "Content-Type": "application/json"
                    },
                    json={"acepto_terminos": True}
                )
                assert response.status_code == 400, "Should not confirm empty order"
                print("Correctly rejected empty order confirmation")
    
    def test_confirmar_sin_aceptar_terminos_falla(self, admin_token):
        """Test that confirming without accepting terms fails"""
        # Get existing order
        response = requests.get(
            f"{BASE_URL}/api/store/pedidos/mis-pedidos",
            params={"estado": "borrador"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get orders")
        
        data = response.json()
        pedidos = data.get("pedidos", [])
        
        # Find one with items
        pedido_con_items = None
        for p in pedidos:
            if p.get("items"):
                pedido_con_items = p
                break
        
        if not pedido_con_items:
            pytest.skip("No borrador order with items found")
        
        # Try to confirm without accepting terms
        response = requests.post(
            f"{BASE_URL}/api/store/pedidos/{pedido_con_items['pedido_id']}/confirmar",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"acepto_terminos": False}
        )
        assert response.status_code == 400, "Should not confirm without accepting terms"
        print("Correctly rejected confirmation without terms acceptance")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
