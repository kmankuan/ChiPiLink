#!/usr/bin/env python3
"""
Focused Integration Hub Tests for Monday.com Proxy Refactor
"""
import requests
import sys
import json

def test_main_app_health():
    """Test main app health"""
    try:
        response = requests.get("https://playwright-login-1.preview.emergentagent.com/api/health", timeout=10)
        success = response.status_code == 200
        print(f"{'✅' if success else '❌'} Main App Health: HTTP {response.status_code}")
        if success:
            data = response.json()
            print(f"   Status: {data.get('status')}, Version: {data.get('version')}, DB: {data.get('db')}")
        return success
    except Exception as e:
        print(f"❌ Main App Health: {e}")
        return False

def test_hub_health():
    """Test Integration Hub health"""
    try:
        response = requests.get("http://localhost:8002/health", timeout=10)
        success = response.status_code == 200
        print(f"{'✅' if success else '❌'} Hub Health: HTTP {response.status_code}")
        if success:
            data = response.json()
            handlers = data.get('handlers', [])
            print(f"   Status: {data.get('status')}, DB: {data.get('db')}")
            print(f"   Handlers: {handlers}")
        return success
    except Exception as e:
        print(f"❌ Hub Health: {e}")
        return False

def test_hub_monday_proxy():
    """Test Hub Monday proxy (expect 503 - no API key in dev)"""
    try:
        response = requests.post(
            "http://localhost:8002/api/monday/execute",
            json={"query": "{ me { name } }"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        success = response.status_code == 503  # Expected in dev environment
        print(f"{'✅' if success else '❌'} Hub Monday Proxy: HTTP {response.status_code} (expected 503)")
        if response.content:
            try:
                error_data = response.json()
                print(f"   Response: {error_data}")
            except:
                pass
        return success
    except Exception as e:
        print(f"❌ Hub Monday Proxy: {e}")
        return False

def test_hub_monday_stats():
    """Test Hub Monday stats"""
    try:
        response = requests.get("http://localhost:8002/api/monday/stats", timeout=10)
        success = response.status_code == 200
        print(f"{'✅' if success else '❌'} Hub Monday Stats: HTTP {response.status_code}")
        if success:
            data = response.json()
            api_key_configured = data.get('api_key_configured', False)
            print(f"   API Key Configured: {api_key_configured}")
            print(f"   Concurrent Limit: {data.get('concurrent_limit', 'unknown')}")
        return success
    except Exception as e:
        print(f"❌ Hub Monday Stats: {e}")
        return False

def test_admin_login():
    """Test admin login"""
    try:
        response = requests.post(
            "https://playwright-login-1.preview.emergentagent.com/api/auth-v2/login",
            json={"email": "teck@koh.one", "password": "Acdb##0897"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        success = response.status_code == 200
        print(f"{'✅' if success else '❌'} Admin Login: HTTP {response.status_code}")
        if success:
            data = response.json()
            if 'token' in data:
                print(f"   Token received: {data['token'][:20]}...")
            return True, data.get('token')
        else:
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                pass
        return False, None
    except Exception as e:
        print(f"❌ Admin Login: {e}")
        return False, None

def test_hub_connections():
    """Test Hub database connections"""
    try:
        response = requests.get("http://localhost:8002/api/debug/connections", timeout=10)
        success = response.status_code == 200
        print(f"{'✅' if success else '❌'} Hub DB Connections: HTTP {response.status_code}")
        if success:
            data = response.json()
            mongodb_status = data.get('mongodb', 'unknown')
            print(f"   MongoDB: {mongodb_status}")
        return success
    except Exception as e:
        print(f"❌ Hub DB Connections: {e}")
        return False

def main():
    """Run focused Integration Hub tests"""
    print("=" * 60)
    print("ChiPi Link Integration Hub Tests")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 6
    
    # Run tests
    if test_main_app_health():
        tests_passed += 1
    
    if test_hub_health():
        tests_passed += 1
    
    if test_hub_monday_proxy():
        tests_passed += 1
        
    if test_hub_monday_stats():
        tests_passed += 1
    
    login_success, token = test_admin_login()
    if login_success:
        tests_passed += 1
    
    if test_hub_connections():
        tests_passed += 1
    
    # Manual checks
    print(f"\n🔍 Manual Verification Required:")
    print("   • Check logs: tail -n 50 /var/log/supervisor/backend.*.log")
    print("   • Look for: 'Monday background workers delegated to Integration Hub'")  
    print("   • Look for: 'Background pollers delegated to Integration Hub'")
    print("   • Check imports: grep -r 'monday_queue' /app/backend --include='*.py'")
    
    # Summary
    print(f"\n" + "=" * 60)
    print(f"SUMMARY: {tests_passed}/{total_tests} tests passed")
    success_rate = (tests_passed / total_tests) * 100
    print(f"Success Rate: {success_rate:.1f}%")
    
    if tests_passed == total_tests:
        print("🎉 All core Integration Hub tests PASSED!")
        return 0
    else:
        print("⚠️  Some tests failed - check Integration Hub setup")
        return 1

if __name__ == "__main__":
    sys.exit(main())