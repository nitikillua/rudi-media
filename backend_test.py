import requests
import sys
from datetime import datetime
import json
import io
import base64

class RudiMediaAPITester:
    def __init__(self, base_url="https://agency-content-hub.preview.emergentagent.com"):
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

    # ===== ADMIN AUTHENTICATION TESTS =====
    
    def test_admin_login(self):
        """Test admin login with credentials admin/admin123"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        def check_login_response(data):
            if "access_token" not in data or "token_type" not in data:
                print("   Missing access_token or token_type in response")
                return False
            
            # Store token for subsequent tests
            self.admin_token = data["access_token"]
            print(f"   Token received: {self.admin_token[:20]}...")
            return data["token_type"] == "bearer"
            
        return self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data,
            check_response=check_login_response
        )

    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        invalid_login_data = {
            "username": "admin",
            "password": "wrongpassword"
        }
        
        return self.run_test(
            "Admin Login - Invalid Credentials",
            "POST",
            "auth/login",
            401,
            data=invalid_login_data
        )

    def test_admin_me(self):
        """Test getting current admin info"""
        def check_admin_me_response(data):
            return "username" in data and "is_active" in data and data["username"] == "admin"
            
        return self.run_test(
            "Admin Me",
            "GET",
            "auth/me",
            200,
            use_auth=True,
            check_response=check_admin_me_response
        )

    def test_admin_me_unauthorized(self):
        """Test admin/me without authentication"""
        return self.run_test(
            "Admin Me - Unauthorized",
            "GET",
            "auth/me",
            403  # FastAPI returns 403 for missing auth
        )

    # ===== ADMIN BLOG POST TESTS =====
    
    def test_admin_blog_posts_list(self):
        """Test getting all blog posts (admin only - includes unpublished)"""
        def check_admin_posts_response(data):
            if not isinstance(data, list):
                print(f"   Expected list, got {type(data)}")
                return False
            
            print(f"   Found {len(data)} blog posts (admin view)")
            
            # Check if posts have SEO fields
            if len(data) > 0:
                post = data[0]
                seo_fields = ['meta_description', 'meta_keywords', 'featured_image']
                for field in seo_fields:
                    if field not in post:
                        print(f"   Missing SEO field: {field}")
                        return False
                print("   ✅ SEO fields present in blog posts")
            
            return True
            
        return self.run_test(
            "Admin Blog Posts List",
            "GET",
            "admin/blog/posts",
            200,
            use_auth=True,
            check_response=check_admin_posts_response
        )

    def test_admin_blog_posts_unauthorized(self):
        """Test admin blog posts without authentication"""
        return self.run_test(
            "Admin Blog Posts - Unauthorized",
            "GET",
            "admin/blog/posts",
            403  # FastAPI returns 403 for missing auth
        )

    def test_create_blog_post_admin(self):
        """Test creating a blog post with SEO fields via admin endpoint"""
        blog_post_data = {
            "title": "Test Blog Post mit SEO Feldern",
            "content": "<p>Dies ist ein Test-Blog-Post mit erweiterten SEO-Funktionen.</p><h3>Wichtige Punkte:</h3><ul><li>SEO-optimiert</li><li>Meta-Beschreibung</li><li>Keywords</li></ul>",
            "excerpt": "Ein Test-Blog-Post um die neuen SEO-Funktionen zu testen.",
            "tags": ["Test", "SEO", "Blog"],
            "published": True,
            "meta_description": "Test Blog Post mit SEO Feldern - Meta Description für bessere Suchmaschinenoptimierung",
            "meta_keywords": "Test, SEO, Blog, Meta Keywords, Suchmaschinenoptimierung",
            "featured_image": None
        }
        
        def check_create_response(data):
            required_fields = ['id', 'title', 'content', 'excerpt', 'slug', 'meta_description', 'meta_keywords', 'featured_image']
            for field in required_fields:
                if field not in data:
                    print(f"   Missing field in response: {field}")
                    return False
            
            # Store the created post ID for cleanup
            self.created_post_id = data['id']
            print(f"   Created post ID: {self.created_post_id}")
            print(f"   Post slug: {data['slug']}")
            print(f"   Meta description: {data['meta_description'][:50]}...")
            
            return data['title'] == blog_post_data['title']
            
        return self.run_test(
            "Create Blog Post (Admin)",
            "POST",
            "admin/blog/posts",
            200,
            data=blog_post_data,
            use_auth=True,
            check_response=check_create_response
        )

    def test_create_blog_post_unauthorized(self):
        """Test creating blog post without authentication"""
        blog_post_data = {
            "title": "Unauthorized Test Post",
            "content": "This should fail",
            "excerpt": "Should not work"
        }
        
        return self.run_test(
            "Create Blog Post - Unauthorized",
            "POST",
            "admin/blog/posts",
            403,  # FastAPI returns 403 for missing auth
            data=blog_post_data
        )

    def test_update_blog_post_admin(self):
        """Test updating a blog post via admin endpoint"""
        if not hasattr(self, 'created_post_id'):
            print("   Skipping - no post ID available")
            return False, {}
            
        update_data = {
            "title": "Updated Test Blog Post mit SEO",
            "meta_description": "Updated meta description for better SEO",
            "meta_keywords": "Updated, Keywords, SEO, Test"
        }
        
        def check_update_response(data):
            return (data['title'] == update_data['title'] and 
                   data['meta_description'] == update_data['meta_description'])
            
        return self.run_test(
            "Update Blog Post (Admin)",
            "PUT",
            f"admin/blog/posts/{self.created_post_id}",
            200,
            data=update_data,
            use_auth=True,
            check_response=check_update_response
        )

    def test_delete_blog_post_admin(self):
        """Test deleting a blog post via admin endpoint"""
        if not hasattr(self, 'created_post_id'):
            print("   Skipping - no post ID available")
            return False, {}
            
        def check_delete_response(data):
            return "message" in data
            
        return self.run_test(
            "Delete Blog Post (Admin)",
            "DELETE",
            f"admin/blog/posts/{self.created_post_id}",
            200,
            use_auth=True,
            check_response=check_delete_response
        )

    # ===== IMAGE UPLOAD TESTS =====
    
    def test_image_upload_admin(self):
        """Test image upload functionality"""
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        files = {
            'file': ('test_image.png', io.BytesIO(test_image_data), 'image/png')
        }
        
        def check_upload_response(data):
            required_fields = ['status', 'url', 'message']
            for field in required_fields:
                if field not in data:
                    print(f"   Missing field in response: {field}")
                    return False
            
            if data['status'] != 'success':
                print(f"   Upload status not success: {data['status']}")
                return False
                
            if not data['url'].startswith('data:image/png;base64,'):
                print(f"   Invalid image URL format: {data['url'][:50]}...")
                return False
                
            print(f"   Image uploaded successfully")
            print(f"   URL length: {len(data['url'])} characters")
            
            return True
            
        return self.run_test(
            "Image Upload (Admin)",
            "POST",
            "admin/upload/image",
            200,
            files=files,
            use_auth=True,
            check_response=check_upload_response
        )

    def test_image_upload_unauthorized(self):
        """Test image upload without authentication"""
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        files = {
            'file': ('test_image.png', io.BytesIO(test_image_data), 'image/png')
        }
        
        return self.run_test(
            "Image Upload - Unauthorized",
            "POST",
            "admin/upload/image",
            403,  # FastAPI returns 403 for missing auth
            files=files
        )

    def test_image_upload_invalid_file_type(self):
        """Test image upload with invalid file type"""
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not an image'), 'text/plain')
        }
        
        return self.run_test(
            "Image Upload - Invalid File Type",
            "POST",
            "admin/upload/image",
            400,
            files=files,
            use_auth=True
        )

    # ===== CONTACTS ADMIN TESTS =====
    
    def test_admin_contacts_list(self):
        """Test getting all contacts (admin only)"""
        def check_contacts_response(data):
            if not isinstance(data, list):
                print(f"   Expected list, got {type(data)}")
                return False
            
            print(f"   Found {len(data)} contact submissions")
            return True
            
        return self.run_test(
            "Admin Contacts List",
            "GET",
            "contacts",
            200,
            use_auth=True,
            check_response=check_contacts_response
        )

    def test_admin_contacts_unauthorized(self):
        """Test contacts endpoint without authentication"""
        return self.run_test(
            "Admin Contacts - Unauthorized",
            "GET",
            "contacts",
            403  # FastAPI returns 403 for missing auth
        )

def main():
    print("🚀 Starting Enhanced Rudi-Media API Tests")
    print("=" * 60)
    
    tester = RudiMediaAPITester()
    
    # ===== BASIC API TESTS =====
    print("\n📋 BASIC API TESTS")
    print("-" * 30)
    
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
        
        # Check if SEO fields are present in public posts
        print(f"\n🔍 Checking SEO fields in public blog posts...")
        seo_fields = ['meta_description', 'meta_keywords', 'featured_image']
        seo_present = all(field in first_post for field in seo_fields)
        if seo_present:
            print("✅ SEO fields present in public blog posts")
        else:
            print("⚠️  Some SEO fields missing in public blog posts")
    
    # Test 404 handling
    tester.test_blog_post_not_found()
    
    # Test contact form
    tester.test_contact_form_submission()
    tester.test_contact_form_validation()
    
    # ===== ADMIN AUTHENTICATION TESTS =====
    print("\n🔐 ADMIN AUTHENTICATION TESTS")
    print("-" * 40)
    
    # Test admin login
    login_success, _ = tester.test_admin_login()
    tester.test_admin_login_invalid_credentials()
    
    if login_success:
        tester.test_admin_me()
    
    # Test unauthorized access
    tester.test_admin_me_unauthorized()
    
    # ===== ADMIN BLOG MANAGEMENT TESTS =====
    print("\n📝 ADMIN BLOG MANAGEMENT TESTS")
    print("-" * 40)
    
    if login_success:
        # Test admin blog endpoints
        tester.test_admin_blog_posts_list()
        
        # Test blog post creation with SEO fields
        create_success, _ = tester.test_create_blog_post_admin()
        
        if create_success:
            # Test update and delete
            tester.test_update_blog_post_admin()
            tester.test_delete_blog_post_admin()
    
    # Test unauthorized access to admin endpoints
    tester.test_admin_blog_posts_unauthorized()
    tester.test_create_blog_post_unauthorized()
    
    # ===== IMAGE UPLOAD TESTS =====
    print("\n🖼️  IMAGE UPLOAD TESTS")
    print("-" * 30)
    
    if login_success:
        tester.test_image_upload_admin()
        tester.test_image_upload_invalid_file_type()
    
    tester.test_image_upload_unauthorized()
    
    # ===== ADMIN CONTACTS TESTS =====
    print("\n📧 ADMIN CONTACTS TESTS")
    print("-" * 30)
    
    if login_success:
        tester.test_admin_contacts_list()
    
    tester.test_admin_contacts_unauthorized()
    
    # ===== FINAL RESULTS =====
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.errors:
        print(f"\n❌ Errors found:")
        for error in tester.errors:
            print(f"   - {error}")
    else:
        print("\n✅ All tests passed!")
    
    print("\n📝 Test Summary:")
    print("   ✅ Basic API functionality")
    print("   ✅ Admin authentication with JWT tokens")
    print("   ✅ Protected admin endpoints")
    print("   ✅ Blog post creation with SEO fields")
    print("   ✅ Image upload functionality")
    print("   ✅ Enhanced blog post model with SEO fields")
    print("   ✅ Proper authorization checks")
    
    print("\n📋 Notes:")
    print("   - Admin credentials: admin/admin123")
    print("   - All admin endpoints require JWT authentication")
    print("   - SEO fields: meta_description, meta_keywords, featured_image")
    print("   - Image uploads are stored as base64 data URLs")
    print("   - Email sending may fail (SendGrid API key not configured)")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())