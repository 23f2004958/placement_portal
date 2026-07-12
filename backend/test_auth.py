import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Student, Company

def test_auth_flow():
    app = create_app()
    client = app.test_client()

    with app.app_context():
        # Clear database and reseed
        db.drop_all()
        db.create_all()
        
        # Seed admin
        admin = User(name="Admin", email="admin@ppa.com", role="admin", is_active=True)
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print("Admin user seeded.")

    # 1. Admin Login
    print("\n--- Testing Admin Login ---")
    resp = client.post('/api/auth/login', json={'email': 'admin@ppa.com', 'password': 'admin123'})
    print("Admin Login Status:", resp.status_code)
    print("Admin Login JSON:", resp.get_json())

    # 2. Student Self-Registration
    print("\n--- Testing Student Self-Registration ---")
    student_data = {
        'name': 'Student Name',
        'email': 'student@ppa.com',
        'password': 'password123',
        'roll_number': 'ST001',
        'branch': 'CSE',
        'year': 3,
        'cgpa': 9.2,
        'phone': '1234567890'
    }
    resp = client.post('/api/auth/register/student', json=student_data)
    print("Student Register Status:", resp.status_code)
    print("Student Register JSON:", resp.get_json())

    # 3. Student Login
    print("\n--- Testing Student Login ---")
    resp = client.post('/api/auth/login', json={'email': 'student@ppa.com', 'password': 'password123'})
    print("Student Login Status:", resp.status_code)
    print("Student Login JSON:", resp.get_json())

    # 4. Company Registration (Admin-Gated)
    print("\n--- Testing Company Registration (Unapproved) ---")
    company_data = {
        'name': 'Recruiter HR',
        'email': 'company@ppa.com',
        'password': 'password123',
        'company_name': 'Acme Corp',
        'location': 'Bangalore, India',
        'hr_contact': '9876543210',
        'website': 'https://acme.com',
        'industry': 'IT / Software',
        'description': 'A top technology firm.'
    }
    resp = client.post('/api/auth/register/company', json=company_data)
    print("Company Register Status:", resp.status_code)
    print("Company Register JSON:", resp.get_json())

    # 5. Company Login (Should fail with 403 since not approved)
    print("\n--- Testing Company Login (Unapproved - Should Fail) ---")
    resp = client.post('/api/auth/login', json={'email': 'company@ppa.com', 'password': 'password123'})
    print("Company Login Status (Expected 403):", resp.status_code)
    print("Company Login JSON:", resp.get_json())

    # 6. Admin Approves Company (Mocking admin approval in DB)
    print("\n--- Approving Company in Database ---")
    with app.app_context():
        co_user = User.query.filter_by(email='company@ppa.com').first()
        co_user.is_active = True
        co_user.company_profile.approval_status = 'approved'
        db.session.commit()
        print("Company approved in DB.")

    # 7. Company Login (Should succeed now)
    print("\n--- Testing Company Login (Approved - Should Succeed) ---")
    resp = client.post('/api/auth/login', json={'email': 'company@ppa.com', 'password': 'password123'})
    print("Company Login Status:", resp.status_code)
    print("Company Login JSON:", resp.get_json())

if __name__ == '__main__':
    test_auth_flow()
