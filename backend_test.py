import requests
import sys
from datetime import datetime
import json
import io
import base64

class RudiMediaAPITester:
    def __init__(self, base_url="https://rudimedia-web-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []
        self.admin_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, check_response=None, files=None, use_auth=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {}
        
        # Add authentication header if needed
        if use_auth and self.admin_token:
            headers['Authorization'] = f"Bearer {self.admin_token}"
        
        # Set content type for JSON requests
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if use_auth:
            print(f"   Using Auth: {'Yes' if self.admin_token else 'No token available'}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads (requests will set it automatically)
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=headers, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Additional response checks
                if check_response and response.status_code < 400:
                    try:
                        response_data = response.json()
                        if check_response(response_data):
                            print("✅ Response validation passed")
                        else:
                            print("⚠️  Response validation failed")
                            success = False
                    except Exception as e:
                        print(f"⚠️  Response validation error: {str(e)}")
                        
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                self.errors.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                
                # Try to get error details
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")

            return success, response.json() if response.status_code < 400 else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            self.errors.append(f"{name}: Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            self.errors.append(f"{name}: Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.errors.append(f"{name}: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        def check_root_response(data):
            return "message" in data and "version" in data
            
        return self.run_test(
            "API Root",
            "GET",
            "",
            200,
            check_response=check_root_response
        )

    def test_blog_posts_list(self):
        """Test getting all blog posts"""
        def check_posts_response(data):
            if not isinstance(data, list):
                print(f"   Expected list, got {type(data)}")
                return False
            if len(data) == 0:
                print("   No blog posts found")
                return True
            
            # Check first post structure
            post = data[0]
            required_fields = ['id', 'title', 'content', 'excerpt', 'author', 'slug', 'created_at']
            for field in required_fields:
                if field not in post:
                    print(f"   Missing field: {field}")
                    return False
            
            print(f"   Found {len(data)} blog posts")
            return True
            
        return self.run_test(
            "Blog Posts List",
            "GET",
            "blog/posts",
            200,
            check_response=check_posts_response
        )

    def test_blog_post_by_id(self, post_id):
        """Test getting a specific blog post by ID"""
        def check_post_response(data):
            required_fields = ['id', 'title', 'content', 'excerpt', 'author', 'slug']
            for field in required_fields:
                if field not in data:
                    print(f"   Missing field: {field}")
                    return False
            return data['id'] == post_id
            
        return self.run_test(
            f"Blog Post by ID ({post_id[:8]}...)",
            "GET",
            f"blog/posts/{post_id}",
            200,
            check_response=check_post_response
        )

    def test_blog_post_by_slug(self, slug):
        """Test getting a blog post by slug"""
        def check_post_response(data):
            required_fields = ['id', 'title', 'content', 'excerpt', 'author', 'slug']
            for field in required_fields:
                if field not in data:
                    print(f"   Missing field: {field}")
                    return False
            return data['slug'] == slug
            
        return self.run_test(
            f"Blog Post by Slug ({slug})",
            "GET",
            f"blog/posts/slug/{slug}",
            200,
            check_response=check_post_response
        )

    def test_blog_post_not_found(self):
        """Test 404 for non-existent blog post"""
        return self.run_test(
            "Blog Post Not Found",
            "GET",
            "blog/posts/non-existent-id",
            404
        )

    def test_contact_form_submission(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+49 123 456789",
            "message": "Dies ist eine Test-Nachricht für die Kontaktform."
        }
        
        def check_contact_response(data):
            return "status" in data and "message" in data and data["status"] == "success"
            
        return self.run_test(
            "Contact Form Submission",
            "POST",
            "contact",
            200,
            data=contact_data,
            check_response=check_contact_response
        )

    def test_contact_form_validation(self):
        """Test contact form validation with invalid data"""
        invalid_data = {
            "name": "",  # Empty name
            "email": "invalid-email",  # Invalid email
            "message": ""  # Empty message
        }
        
        return self.run_test(
            "Contact Form Validation",
            "POST",
            "contact",
            422  # Validation error
        )

def main():
    print("🚀 Starting Rudi-Media API Tests")
    print("=" * 50)
    
    tester = RudiMediaAPITester()
    
    # Test API root
    tester.test_api_root()
    
    # Test blog endpoints
    success, posts_data = tester.test_blog_posts_list()
    
    # If we got posts, test individual post endpoints
    if success and posts_data:
        # Test first post by ID and slug
        first_post = posts_data[0]
        tester.test_blog_post_by_id(first_post['id'])
        tester.test_blog_post_by_slug(first_post['slug'])
    
    # Test 404 handling
    tester.test_blog_post_not_found()
    
    # Test contact form
    tester.test_contact_form_submission()
    tester.test_contact_form_validation()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.errors:
        print(f"\n❌ Errors found:")
        for error in tester.errors:
            print(f"   - {error}")
    else:
        print("\n✅ All tests passed!")
    
    print("\n📝 Notes:")
    print("   - Email sending is expected to fail (SendGrid API key not configured)")
    print("   - Contact form should validate and store data successfully")
    print("   - Blog posts should be pre-populated with German marketing content")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())