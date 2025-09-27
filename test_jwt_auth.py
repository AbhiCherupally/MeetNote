#!/usr/bin/env python3
"""
JWT Authentication & PostgreSQL Test Script
Tests the new authentication system and database integration
"""

import requests
import json
import sys

class MeetNoteAPITester:
    def __init__(self, base_url="https://meetnote-backend.onrender.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        
    def test_health(self):
        """Test health endpoint to check database and JWT status"""
        print("🏥 Testing health endpoint...")
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                print("✅ Health check passed:")
                print(f"   Database: {health_data.get('services', {}).get('database', 'unknown')}")
                print(f"   JWT: {health_data.get('services', {}).get('jwt', 'unknown')}")
                print(f"   AssemblyAI: {health_data.get('services', {}).get('assemblyai', 'unknown')}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_register(self, email="test@example.com", password="testpassword123", name="Test User"):
        """Test user registration"""
        print(f"📝 Testing user registration for {email}...")
        try:
            data = {
                "email": email,
                "password": password,
                "name": name
            }
            response = requests.post(
                f"{self.base_url}/api/auth/register",
                json=data,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                self.token = result["access_token"]
                self.user_data = result["user"]
                print("✅ Registration successful:")
                print(f"   User ID: {self.user_data['id']}")
                print(f"   Email: {self.user_data['email']}")
                print(f"   Token expires in: {result['expires_in']} seconds")
                print(f"   Token preview: {self.token[:20]}...")
                return True
            elif response.status_code == 400:
                # User might already exist, try login instead
                print("⚠️  User already exists, trying login...")
                return self.test_login(email, password)
            else:
                print(f"❌ Registration failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return False
    
    def test_login(self, email="test@example.com", password="testpassword123"):
        """Test user login"""
        print(f"🔑 Testing user login for {email}...")
        try:
            data = {
                "email": email,
                "password": password
            }
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=data,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                self.token = result["access_token"]
                self.user_data = result["user"]
                print("✅ Login successful:")
                print(f"   User ID: {self.user_data['id']}")
                print(f"   Email: {self.user_data['email']}")
                print(f"   Token expires in: {result['expires_in']} seconds")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_token_extraction(self):
        """Test JWT token extraction endpoint"""
        if not self.token:
            print("❌ No token available for extraction test")
            return False
            
        print("🔍 Testing JWT token extraction...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/api/auth/extract-token",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Token extraction successful:")
                print(f"   Email: {result.get('email')}")
                print(f"   Algorithm: {result.get('algorithm')}")
                print(f"   Expires: {result.get('expires')}")
                if 'payload' in result:
                    print(f"   Subject: {result['payload'].get('sub')}")
                return True
            else:
                print(f"❌ Token extraction failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Token extraction error: {e}")
            return False
    
    def test_protected_endpoint(self):
        """Test accessing protected endpoints with JWT token"""
        if not self.token:
            print("❌ No token available for protected endpoint test")
            return False
            
        print("🔒 Testing protected endpoint access...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/api/auth/me",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Protected endpoint access successful:")
                print(f"   User: {result.get('name')} ({result.get('email')})")
                print(f"   ID: {result.get('id')}")
                return True
            else:
                print(f"❌ Protected endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Protected endpoint error: {e}")
            return False
    
    def test_meetings_endpoint(self):
        """Test meetings endpoint with authentication"""
        if not self.token:
            print("❌ No token available for meetings test")
            return False
            
        print("📅 Testing meetings endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/api/meetings",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                meetings = response.json()
                print(f"✅ Meetings endpoint successful:")
                print(f"   Found {len(meetings)} meetings")
                return True
            else:
                print(f"❌ Meetings endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Meetings endpoint error: {e}")
            return False
    
    def run_all_tests(self):
        """Run all authentication and database tests"""
        print("🚀 Starting MeetNote API Tests")
        print(f"🎯 Testing backend: {self.base_url}")
        print("=" * 50)
        
        tests = [
            self.test_health,
            self.test_register,
            self.test_token_extraction,
            self.test_protected_endpoint,
            self.test_meetings_endpoint
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
                print()
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
                failed += 1
                print()
        
        print("=" * 50)
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests passed! Your JWT authentication and database setup is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the logs above for details.")
        
        return failed == 0

if __name__ == "__main__":
    # Allow custom backend URL for testing
    backend_url = sys.argv[1] if len(sys.argv) > 1 else "https://meetnote-backend.onrender.com"
    
    print(f"""
    🧪 MeetNote JWT & PostgreSQL Test Suite
    ====================================
    
    This script tests:
    ✅ Backend health and database connection
    ✅ User registration with JWT tokens
    ✅ JWT token extraction and validation  
    ✅ Protected endpoint access
    ✅ Database-backed user storage
    
    Backend URL: {backend_url}
    """)
    
    tester = MeetNoteAPITester(backend_url)
    success = tester.run_all_tests()
    
    if success:
        print("\\n🔑 JWT Token for manual testing:")
        if tester.token:
            print(f"Authorization: Bearer {tester.token}")
        sys.exit(0)
    else:
        sys.exit(1)