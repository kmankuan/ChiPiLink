#!/usr/bin/env python3

import requests
import json

def test_architectural_reorganization():
    """Test the architectural reorganization - CRITICAL REVIEW REQUEST"""
    print("🏗️ Testing Architectural Reorganization (CRITICAL)...")
    
    base_url = "https://wallet-control-panel.preview.emergentagent.com"
    
    # 1. Health Check - Should return all 12 modules
    print("\n1. Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health Check: {response.status_code}")
            
            expected_modules = [
                "auth", "store", "landing", "community",
                "integrations/monday", "integrations/sheets",
                "admin", "invision", "platform_store",
                "pingpong", "membership", "translations"
            ]
            
            actual_modules = health_data.get("modules", [])
            
            if len(actual_modules) == 12:
                print(f"✅ Module Count: {len(actual_modules)}/12")
            else:
                print(f"❌ Module Count: {len(actual_modules)}/12")
            
            # Check each expected module
            for module in expected_modules:
                if module in actual_modules:
                    print(f"✅ Module '{module}' Present")
                else:
                    print(f"❌ Module '{module}' Missing")
        else:
            print(f"❌ Health Check: {response.status_code}")
    except Exception as e:
        print(f"❌ Health Check Error: {e}")
    
    # 2. Test Auth Module endpoints
    print("\n2. Testing Auth Module...")
    try:
        # Test registration (should work without admin)
        test_user_data = {
            "email": "arch_test_user@test.com",
            "contrasena": "TestPass123!",
            "nombre": "Architecture Test User",
            "telefono": "507-1234-5678",
            "direccion": "Test Address"
        }
        
        response = requests.post(f"{base_url}/api/auth/registro", 
                               json=test_user_data, 
                               headers={'Content-Type': 'application/json'}, 
                               timeout=10)
        if response.status_code == 200:
            print("✅ POST /api/auth/registro")
        else:
            print(f"❌ POST /api/auth/registro: {response.status_code}")
    except Exception as e:
        print(f"❌ Auth Module Error: {e}")
    
    # 3. Test Store Module endpoints
    print("\n3. Testing Store Module...")
    endpoints = [
        "categorias", "libros", "grados", "materias", "public/libros"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}/api/{endpoint}", timeout=10)
            if response.status_code == 200:
                print(f"✅ GET /api/{endpoint}")
            else:
                print(f"❌ GET /api/{endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ GET /api/{endpoint}: {e}")
    
    # 4. Test Landing Module endpoints
    print("\n4. Testing Landing Module...")
    landing_endpoints = ["public/site-config", "public/landing-page"]
    
    for endpoint in landing_endpoints:
        try:
            response = requests.get(f"{base_url}/api/{endpoint}", timeout=10)
            if response.status_code == 200:
                print(f"✅ GET /api/{endpoint}")
            else:
                print(f"❌ GET /api/{endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ GET /api/{endpoint}: {e}")
    
    # 5. Test Community Module endpoints
    print("\n5. Testing Community Module...")
    community_endpoints = ["community/posts", "community/events", "community/gallery", "community/landing"]
    
    for endpoint in community_endpoints:
        try:
            response = requests.get(f"{base_url}/api/{endpoint}", timeout=10)
            if response.status_code == 200:
                print(f"✅ GET /api/{endpoint}")
            else:
                print(f"❌ GET /api/{endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ GET /api/{endpoint}: {e}")
    
    # 6. Test Existing Routes endpoints
    print("\n6. Testing Existing Routes...")
    existing_endpoints = [
        "pingpong/players", "platform-store", "platform-store/products", 
        "membership/plans", "translations/all"
    ]
    
    for endpoint in existing_endpoints:
        try:
            response = requests.get(f"{base_url}/api/{endpoint}", timeout=10)
            if response.status_code == 200:
                print(f"✅ GET /api/{endpoint}")
            else:
                print(f"❌ GET /api/{endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ GET /api/{endpoint}: {e}")

if __name__ == "__main__":
    test_architectural_reorganization()