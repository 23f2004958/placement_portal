import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Student, Company, PlacementDrive, Application, Placement

def test_company_flow():
    app = create_app()
    client = app.test_client()

    # Get admin login token
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Company User (Active/Approved)
        co_user = User(name="Recruiter", email="recruiter@ppa.com", role="company", is_active=True)
        co_user.set_password("recruiter123")
        db.session.add(co_user)
        db.session.flush()
        company = Company(
            user_id=co_user.id,
            company_name="Innovate Ltd",
            location="Pune, India",
            hr_contact="9998887776",
            website="https://innovate.io",
            industry="IT / Software",
            description="Innovative solutions.",
            approval_status="approved"
        )
        db.session.add(company)
        
        # Student User
        st_user = User(name="Alex", email="alex@ppa.com", role="student", is_active=True)
        st_user.set_password("alex123")
        db.session.add(st_user)
        db.session.flush()
        student = Student(
            user_id=st_user.id,
            roll_number="ST002",
            branch="ECE",
            year=4,
            cgpa=9.0,
            phone="8887776665"
        )
        db.session.add(student)
        db.session.commit()

    # Login company
    resp = client.post('/api/auth/login', json={'email': 'recruiter@ppa.com', 'password': 'recruiter123'})
    token = resp.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. Test Company Profile Update
    print("\n--- Testing Company Profile Update ---")
    profile_data = {
        'hr_contact': '1112223334',
        'location': 'New Delhi, India',
        'website': 'https://innovate.com',
        'industry': 'Consulting / Finance',
        'description': 'Leading consultancy.'
    }
    resp = client.put('/api/company/profile', json=profile_data, headers=headers)
    print("Update Profile Status:", resp.status_code)
    print("Updated Location:", resp.get_json()['data']['location'])

    # 2. Test Post Placement Drive
    print("\n--- Testing Create Placement Drive ---")
    drive_data = {
        'title': 'Consultant Associate',
        'description': 'Requires analytics background.',
        'eligible_branches': 'ECE,CSE,IT',
        'min_cgpa': 7.5,
        'eligible_year': 4,
        'salary': 15.0,
        'deadline': (datetime.utcnow() + timedelta(days=5)).isoformat()
    }
    resp = client.post('/api/company/drives', json=drive_data, headers=headers)
    print("Create Drive Status:", resp.status_code)
    print("Created Drive Title:", resp.get_json()['data']['title'])

    # 3. Simulate Student Application
    print("\n--- Simulating Student Application to Drive ---")
    with app.app_context():
        app_record = Application(
            student_id=1,
            drive_id=1,
            status="Applied"
        )
        db.session.add(app_record)
        db.session.commit()
        print("Application simulated in DB.")

    # 4. View applicants
    print("\n--- Testing Get Applicants ---")
    resp = client.get('/api/company/drives/1/applications', headers=headers)
    print("Get Applicants Status:", resp.status_code)
    apps = resp.get_json()['data']
    print("Applicants Count:", len(apps))
    print("Applicant Name:", apps[0]['student']['name'])

    # 5. Shortlist Applicant
    print("\n--- Testing Shortlist Applicant ---")
    status_data = {
        'status': 'shortlisted',
        'remarks': 'Strong resume.',
        'interview_date': (datetime.utcnow() + timedelta(days=7)).isoformat()
    }
    resp = client.post('/api/company/applications/1/status', json=status_data, headers=headers)
    print("Update Status (Shortlisted) Status:", resp.status_code)
    print("Updated Status in Response:", resp.get_json()['data']['status'])

    # 6. Place Applicant (Should create Placement 1:1)
    print("\n--- Testing Place Applicant (Create Placement) ---")
    status_data = {
        'status': 'Placed',
        'remarks': 'Offered and Accepted.'
    }
    resp = client.post('/api/company/applications/1/status', json=status_data, headers=headers)
    print("Update Status (Placed) Status:", resp.status_code)
    print("Updated Status in Response:", resp.get_json()['data']['status'])

    # 7. Verify Placement record exists
    print("\n--- Verifying Placement in DB ---")
    with app.app_context():
        pl = Placement.query.filter_by(application_id=1).first()
        print("Placement Found in DB:", pl is not None)
        if pl:
            print("Placement Position:", pl.position)
            print("Placement Salary (LPA):", pl.salary)

if __name__ == '__main__':
    test_company_flow()
