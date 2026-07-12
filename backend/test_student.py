import sys
import os
from datetime import datetime, timedelta
from io import BytesIO

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Student, Company, PlacementDrive, Application

def test_student_flow():
    app = create_app()
    client = app.test_client()

    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Student User
        st_user = User(name="Jane Doe", email="jane@ppa.com", role="student", is_active=True)
        st_user.set_password("student123")
        db.session.add(st_user)
        db.session.flush()
        student = Student(
            user_id=st_user.id,
            roll_number="ST003",
            branch="CSE",
            year=3,
            cgpa=9.5,
            phone="1234567890"
        )
        db.session.add(student)

        # Company User (Active/Approved)
        co_user = User(name="HR Manager", email="hr@ppa.com", role="company", is_active=True)
        co_user.set_password("company123")
        db.session.add(co_user)
        db.session.flush()
        company = Company(
            user_id=co_user.id,
            company_name="Tech Solutions",
            location="Hyderabad, India",
            hr_contact="9876543210",
            website="https://techsol.com",
            industry="IT / Software",
            description="Software dev company.",
            approval_status="approved"
        )
        db.session.add(company)
        db.session.flush()
        
        # Drive (Approved)
        drive1 = PlacementDrive(
            company_id=company.id,
            title="Software Developer",
            description="Coding role",
            eligible_branches="CSE,ECE",
            min_cgpa=8.0,
            eligible_year=3,
            salary=10.0,
            deadline=datetime.utcnow() + timedelta(days=2),
            status="approved"
        )
        db.session.add(drive1)
        db.session.commit()

    # Login student
    resp = client.post('/api/auth/login', json={'email': 'jane@ppa.com', 'password': 'student123'})
    token = resp.get_json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. Test Profile Update
    print("\n--- Testing Student Profile Update ---")
    profile_data = {
        'phone': '9876543210',
        'cgpa': 9.6,
        'skills': 'Python, Flask, SQLite',
        'education': 'B.Tech in Computer Science',
        'experience': 'Intern at Google'
    }
    resp = client.put('/api/student/profile', json=profile_data, headers=headers)
    print("Update Profile Status:", resp.status_code)
    sp_data = resp.get_json()['data']
    print("Updated CGPA:", sp_data['cgpa'])
    print("Updated Experience:", sp_data['experience'])

    # 2. Test Resume Upload
    print("\n--- Testing Resume Upload ---")
    data = {
        'resume': (BytesIO(b"dummy pdf contents"), 'resume.pdf')
    }
    resp = client.post('/api/student/profile/resume', data=data, content_type='multipart/form-data', headers=headers)
    print("Resume Upload Status:", resp.status_code)
    print("Resume Upload JSON:", resp.get_json())

    # 3. Test Browse Eligible Drives
    print("\n--- Testing Get Eligible Drives ---")
    resp = client.get('/api/student/drives?branch=CSE&min_cgpa=8.0', headers=headers)
    print("Get Drives Status:", resp.status_code)
    drives = resp.get_json()['data']
    print("Drives Found:", len(drives))
    print("Drive Title:", drives[0]['title'])
    print("Is Eligible:", drives[0]['is_eligible'])

    # 4. Test Apply to Drive
    print("\n--- Testing Apply to Drive ---")
    resp = client.post('/api/student/drives/1/apply', headers=headers)
    print("Apply Status:", resp.status_code)
    print("Apply JSON:", resp.get_json())

    # 5. Check Dashboard Recent Applications
    print("\n--- Testing Dashboard Stats & Recent Apps ---")
    resp = client.get('/api/student/dashboard', headers=headers)
    print("Dashboard Status:", resp.status_code)
    dash = resp.get_json()['data']
    print("Applied Count:", dash['stats']['applied'])
    print("Recent App Status:", dash['recent_applications'][0]['status'])

    # 6. Simulate Status update to Offer (Admin/Company side)
    print("\n--- Simulating Offer Issuance in DB ---")
    with app.app_context():
        app_rec = Application.query.get(1)
        app_rec.status = 'Offer'
        db.session.commit()
        print("Application status updated to Offer.")

    # 7. Test Download Offer Letter
    print("\n--- Testing Download Offer Letter ---")
    resp = client.get('/api/student/applications/1/offer-letter', headers=headers)
    print("Download Offer Letter Status:", resp.status_code)
    print("Content Type Header:", resp.headers.get('Content-type'))
    print("Offer Letter Preview:")
    print(resp.data.decode()[:300])

if __name__ == '__main__':
    test_student_flow()
