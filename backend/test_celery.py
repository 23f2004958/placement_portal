import sys
import os
import time
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User, Student, Company, PlacementDrive, Application
from backend.tasks.reminders import send_deadline_reminders
from backend.tasks.export_csv import export_student_applications
from backend.tasks.monthly_report import send_monthly_report

def run_celery_tests():
    print("=== STARTING CELERY INTEGRATION TESTS ===\n")
    app = create_app()
    
    with app.app_context():
        # Setup temporary testing rows
        db.drop_all()
        db.create_all()
        
        # 1. Create a Student
        stud_user = User(name="Candidate User", email="candidate@iitm.ac.in", role="student", is_active=True)
        stud_user.set_password("student123")
        db.session.add(stud_user)
        db.session.flush()
        
        student = Student(
            user_id=stud_user.id,
            roll_number="EE22B999",
            branch="ECE",
            year=3,
            cgpa=9.2,
            phone="9876543210"
        )
        db.session.add(student)
        
        # 2. Create a Company
        comp_user = User(name="Google HR", email="hr@google.com", role="company", is_active=True)
        comp_user.set_password("google123")
        db.session.add(comp_user)
        db.session.flush()
        
        company = Company(
            user_id=comp_user.id,
            company_name="Google",
            location="Bangalore",
            hr_contact="9876543211",
            approval_status="approved"
        )
        db.session.add(company)
        db.session.flush()
        
        # 3. Create an active approved drive with a close deadline (2 days out)
        drive = PlacementDrive(
            company_id=company.id,
            title="Software Engineering Intern",
            description="Summer Internship",
            eligible_branches="CSE,ECE",
            min_cgpa=8.0,
            eligible_year=3,
            salary=25.0,
            deadline=datetime.utcnow() + timedelta(days=2),
            status="approved"
        )
        db.session.add(drive)
        db.session.commit()
        
        user_id = stud_user.id
        print(f"Created student (User ID: {user_id}) and eligible drive (ID: {drive.id}) successfully.")

    # Test 1: Synchronous testing (verify query logic executes without exception)
    print("\n--- TEST 1: Executing send_deadline_reminders (Synchronously) ---")
    try:
        # Running .apply() runs the task synchronously in the current thread
        res = send_deadline_reminders.apply()
        print("Success! Return value:", res.result)
    except Exception as e:
        print("FAIL! Error during synchronous execution:", str(e))

    # Test 2: Synchronous monthly report compile
    print("\n--- TEST 2: Executing send_monthly_report (Synchronously) ---")
    try:
        res = send_monthly_report.apply()
        print("Success! Return value:", res.result)
    except Exception as e:
        print("FAIL! Error during synchronous execution:", str(e))

    # Test 3: Asynchronous task dispatch (export CSV to file)
    print("\n--- TEST 3: Dispatching export_student_applications (Asynchronously) ---")
    print("Dispatching job request to Celery worker process (via Redis)...")
    try:
        # .delay() posts the job request to Redis and returns immediately
        task = export_student_applications.delay(user_id, "candidate@iitm.ac.in")
        print(f"Task dispatched with ID: {task.id}")
        
        # Wait up to 8 seconds for the worker to pick up the task and execute it
        print("Waiting for worker to complete the CSV export...")
        start_time = time.time()
        completed = False
        while time.time() - start_time < 8:
            if task.ready():
                completed = True
                break
            time.sleep(0.5)
            
        if completed:
            res_val = task.result
            print(f"Task completed successfully! Returned: {res_val}")
            
            # Verify file exists
            if os.path.exists(res_val):
                print(f"Verification OK! CSV file was created at: {res_val}")
            else:
                print("FAIL: Task returned path, but file was not found on disk.")
        else:
            print("TIMEOUT: Task is still in queue. Ensure that 'celery worker' is running in another terminal window!")
            
    except Exception as e:
        print("FAIL! Error during asynchronous dispatch:", str(e))

if __name__ == "__main__":
    run_celery_tests()
