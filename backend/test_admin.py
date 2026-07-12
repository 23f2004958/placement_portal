import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Student, Company, PlacementDrive, Application

def test_admin_flow():
    app = create_app()
    client = app.test_client()

    # Get admin login token
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Admin
        admin = User(name="Admin", email="admin@ppa.com", role="admin", is_active=True)
        admin.set_password("admin123")
        db.session.add(admin)
        
        # Student
        st_user = User(name="St Name", email="st@ppa.com", role="student", is_active=True)
        st_user.set_password("student123")
        db.session.add(st_user)
        db.session.flush()
        student = Student(user_id=st_user.id, roll_number="ST001", branch="CSE", year=3, cgpa=8.5, phone="1234567890")
        db.session.add(student)

        # Company (Pending)
        co_user = User(name="Co Name", email="co@ppa.com", role="company", is_active=False)
        co_user.set_password("company123")
        db.session.add(co_user)
        db.session.flush()
        company = Company(user_id=co_user.id, company_name="Acme Corp", location="Mumbai", hr_contact="9876543210")
        db.session.add(company)
        db.session.flush()
        
        # Drive (Pending)
        drive = PlacementDrive(
            company_id=company.id,
            title="Software Eng",
            description="Good job",
            eligible_branches="CSE,ECE",
            min_cgpa=7.0,
            eligible_year=3,
            salary=12.0,
            deadline=datetime.utcnow() + timedelta(days=2),
            status="pending"
        )
        db.session.add(drive)
        db.session.commit()

    # Login admin
    resp = client.post('/api/auth/login', json={'email': 'admin@ppa.com', 'password': 'admin123'})
    token = resp.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. Test Admin Stats
    print("\n--- Testing Admin Stats ---")
    resp = client.get('/api/admin/stats', headers=headers)
    print("Admin Stats Status:", resp.status_code)
    stats_data = resp.get_json()['data']
    print("Total Students:", stats_data['total_students'])
    print("Total Companies:", stats_data['total_companies'])
    print("Pending Companies Count:", stats_data['pending_companies_count'])
    print("Pending Drives Count:", stats_data['pending_drives_count'])

    # 2. Test Admin Search
    print("\n--- Testing Admin Search ---")
    resp = client.get('/api/admin/search?type=company&q=Acme', headers=headers)
    print("Company Search Status:", resp.status_code)
    print("Company Search Count:", len(resp.get_json()['data']))
    print("Company Search Result:", resp.get_json()['data'][0]['company_name'])

    # 3. Test Approve Company
    print("\n--- Testing Approve Company ---")
    resp = client.post(f'/api/admin/companies/1/approve', headers=headers)
    print("Approve Company Status:", resp.status_code)
    print("Approve Company JSON:", resp.get_json())

    # 4. Test Approve Drive
    print("\n--- Testing Approve Drive ---")
    resp = client.post(f'/api/admin/drives/1/approve', headers=headers)
    print("Approve Drive Status:", resp.status_code)
    print("Approve Drive JSON:", resp.get_json())

    # 5. Test Blacklist Student
    print("\n--- Testing Blacklist Student ---")
    resp = client.post(f'/api/admin/students/1/blacklist', headers=headers)
    print("Blacklist Student Status:", resp.status_code)
    print("Blacklist Student JSON:", resp.get_json())

if __name__ == '__main__':
    test_admin_flow()
