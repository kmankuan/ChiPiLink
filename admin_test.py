#!/usr/bin/env python3

import requests
import json

def test_admin_endpoints():
    """Test admin endpoints that require authentication"""
    print("👑 Testing Admin Endpoints...")
    
    base_url = "https://api-refactor-8.preview.emergentagent.com"
    
    # 1. Admin Login
    print("\n1. Testing Admin Login...")
    try:
        login_data = {
            "email": "admin@libreria.com",
            "contrasena": "adminpassword"
        }
        
        response = requests.post(f"{base_url}/api/auth/login", 
                               json=login_data, 
                               headers={'Content-Type': 'application/json'}, 
                               timeout=10)
        if response.status_code == 200:
            login_result = response.json()
            admin_token = login_result.get('token')
            print("✅ Admin Login Successful")
            
            if admin_token:
                # 2. Test Integrations Module endpoints (require admin auth)
                print("\n2. Testing Integrations Module (Admin Auth Required)...")
                
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {admin_token}'
                }
                
                # Test Monday.com integration
                try:
                    response = requests.get(f"{base_url}/api/admin/monday/status", 
                                          headers=headers, timeout=10)
                    if response.status_code == 200:
                        print("✅ GET /api/admin/monday/status")
                        monday_data = response.json()
                        print(f"   - API Key Configured: {monday_data.get('api_key_configured', False)}")
                        print(f"   - Board ID Configured: {monday_data.get('board_id_configured', False)}")
                        print(f"   - Connected: {monday_data.get('connected', False)}")
                        if monday_data.get('boards'):
                            print(f"   - Available Boards: {len(monday_data['boards'])}")
                    else:
                        print(f"❌ GET /api/admin/monday/status: {response.status_code}")
                except Exception as e:
                    print(f"❌ Monday Integration Error: {e}")
                
                # Test Google Sheets integration
                try:
                    response = requests.get(f"{base_url}/api/admin/sheets/status", 
                                          headers=headers, timeout=10)
                    if response.status_code == 200:
                        print("✅ GET /api/admin/sheets/status")
                    elif response.status_code == 404:
                        print("⚠️ GET /api/admin/sheets/status: 404 (Not implemented)")
                    else:
                        print(f"❌ GET /api/admin/sheets/status: {response.status_code}")
                except Exception as e:
                    print(f"❌ Sheets Integration Error: {e}")
                
                # 3. Test other admin endpoints
                print("\n3. Testing Other Admin Endpoints...")
                
                admin_endpoints = [
                    "admin/notificaciones",
                    "admin/config-notificaciones",
                    "admin/block-templates",
                    "admin/site-config"
                ]
                
                for endpoint in admin_endpoints:
                    try:
                        response = requests.get(f"{base_url}/api/{endpoint}", 
                                              headers=headers, timeout=10)
                        if response.status_code == 200:
                            print(f"✅ GET /api/{endpoint}")
                        else:
                            print(f"❌ GET /api/{endpoint}: {response.status_code}")
                    except Exception as e:
                        print(f"❌ GET /api/{endpoint}: {e}")
            else:
                print("❌ No admin token received")
        else:
            print(f"❌ Admin Login: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Admin Login Error: {e}")

if __name__ == "__main__":
    test_admin_endpoints()