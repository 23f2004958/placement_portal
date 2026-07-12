import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db, cache
from backend.models import User, Company, Student

def test_redis_caching():
    app = create_app()
    client = app.test_client()

    with app.app_context():
        db.drop_all()
        db.create_all()
        cache.clear() # Reset cache
        
        # Admin User
        admin = User(name="Admin User", email="admin@ppa.com", role="admin", is_active=True)
        admin.set_password("admin123")
        db.session.add(admin)

        # Company User
        co_user = User(name="Recruiter", email="recruiter@ppa.com", role="company", is_active=True)
        co_user.set_password("recruiter123")
        db.session.add(co_user)
        db.session.flush()
        company = Company(
            user_id=co_user.id,
            company_name="Innovate Ltd",
            location="Pune",
            hr_contact="9998887776",
            approval_status="approved"
        )
        db.session.add(company)
        db.session.commit()

    # Login admin
    resp = client.post('/api/auth/login', json={'email': 'admin@ppa.com', 'password': 'admin123'})
    admin_token = resp.get_json()['data']['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    # 1. First request - Query companies (should seed cache)
    print("\n--- 1. Requesting Companies List (Cache Miss) ---")
    resp = client.get('/api/admin/companies?status=approved', headers=admin_headers)
    print("Fetch Companies Status:", resp.status_code)
    print("Fetched Companies count:", len(resp.get_json()['data']))

    # 2. Check if key exists in Redis cache
    print("\n--- 2. Checking Redis Cache Keys ---")
    with app.app_context():
        if app.config.get('CACHE_TYPE') == 'RedisCache':
            client_redis = cache.cache._write_client
            keys = client_redis.keys("*")
            print("Current Redis Keys:")
            for k in keys:
                print(" -", k.decode())
        else:
            print("Cache is not configured as RedisCache in current test context.")

    # 3. Request again - should return from cache
    print("\n--- 3. Requesting Companies List again (Cache Hit) ---")
    resp = client.get('/api/admin/companies?status=approved', headers=admin_headers)
    print("Fetch Companies Status:", resp.status_code)

    # 4. Trigger profile update (should purge cache)
    print("\n--- 4. Updating Company Profile (Should Invalidate Cache) ---")
    login_resp = client.post('/api/auth/login', json={'email': 'recruiter@ppa.com', 'password': 'recruiter123'})
    co_token = login_resp.get_json()['data']['access_token']
    co_headers = {'Authorization': f'Bearer {co_token}'}
    
    update_data = {'location': 'Mumbai'}
    resp = client.put('/api/company/profile', json=update_data, headers=co_headers)
    print("Update Profile Status:", resp.status_code)

    # 5. Check if key was purged from Redis
    print("\n--- 5. Checking Redis Cache Keys post-update ---")
    with app.app_context():
        if app.config.get('CACHE_TYPE') == 'RedisCache':
            client_redis = cache.cache._write_client
            keys = client_redis.keys("*")
            print("Current Redis Keys after purge:")
            for k in keys:
                print(" -", k.decode())
            cache_keys = [k.decode() for k in keys if k.decode().startswith('flask_cache_')]
            if not cache_keys:
                print("Cache successfully purged!")
        else:
            print("Cache is not RedisCache.")

if __name__ == '__main__':
    test_redis_caching()
