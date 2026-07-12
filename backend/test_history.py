import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Student, Company, PlacementDrive, Application

def test_history_flow():
    app = create_app()
    client = app.test_client()

    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # 1. Setup Admin, Student, Company, and Drive
        admin = User(name="Admin User", email="admin@ppa.com", role="admin", is_active=True)
        admin.set_password("admin123")
        db.session.add(admin)

        st_user = User(name="John Student", email="john@ppa.com", role="student", is_active=True)
        st_user.set_password("student123")
        db.session.add(st_user)
        db.session.flush()
        student = Student(user_id=st_user.id, roll_number="ST004", branch="CSE", year=4, cgpa=9.0, phone="1112223334")
        db.session.add(student)

        co_user = User(name="HR Corp", email="hr@corp.com", role="company", is_active=True)
        co_user.set_password("company123")
        db.session.add(co_user)
        db.session.flush()
        company = Company(user_id=co_user.id, company_name="Corp Inc", location="Mumbai", hr_contact="5556667778", approval_status="approved")
        db.session.add(company)
        db.session.flush()

        drive = PlacementDrive(
            company_id=company.id,
            title="Systems Engineer",
            description="C++ dev",
            eligible_branches="CSE,ECE",
            min_cgpa=8.0,
            eligible_year=4,
            salary=8.0,
            deadline=datetime.utcnow() + timedelta(days=2),
            status="approved"
        )
        db.session.add(drive)
        db.session.commit()

    # Login tokens
    resp = client.post('/api/auth/login', json={'email': 'admin@ppa.com', 'password': 'admin123'})
    admin_token = resp.get_json()['data']['access_token']

    resp = client.post('/api/auth/login', json={'email': 'john@ppa.com', 'password': 'student123'})
    student_token = resp.get_json()['data']['access_token']

    resp = client.post('/api/auth/login', json={'email': 'hr@corp.com', 'password': 'company123'})
    company_token = resp.get_json()['data']['access_token']

    # 1. Apply from Student
    print("\n--- 1. Submitting Application ---")
    resp = client.post('/api/student/drives/1/apply', headers={'Authorization': f'Bearer {student_token}'})
    print("Submit Application Status:", resp.status_code)
    print("Submit Application JSON:", resp.get_json())

    # 2. Duplicate application attempt (Should return 409 Conflict)
    print("\n--- 2. Duplicate Application Check ---")
    resp = client.post('/api/student/drives/1/apply', headers={'Authorization': f'Bearer {student_token}'})
    print("Duplicate Application Status (Expected 409):", resp.status_code)
    print("Duplicate Application JSON:", resp.get_json())

    # 3. Role-Scoped Visibility
    print("\n--- 3. Role-Scoped Visibility ---")
    # Student view
    resp = client.get('/api/student/applications', headers={'Authorization': f'Bearer {student_token}'})
    print("Student sees own apps count:", len(resp.get_json()['data']))

    # Company view
    resp = client.get('/api/company/drives/1/applications', headers={'Authorization': f'Bearer {company_token}'})
    print("Company sees drive applicants count:", len(resp.get_json()['data']))

    # Admin view
    resp = client.get('/api/admin/applications', headers={'Authorization': f'Bearer {admin_token}'})
    print("Admin sees all apps count:", len(resp.get_json()['data']))

    # Student trying to hit Admin view (Should be forbidden 403)
    resp = client.get('/api/admin/applications', headers={'Authorization': f'Bearer {student_token}'})
    print("Student hitting Admin view (Expected 403):", resp.status_code)

    # Student trying to hit Company view (Should be forbidden 403)
    resp = client.get('/api/company/drives/1/applications', headers={'Authorization': f'Bearer {student_token}'})
    print("Student hitting Company view (Expected 403):", resp.status_code)

if __name__ == '__main__':
    from datetime import datetime, timedelta
    test_history_flow()
