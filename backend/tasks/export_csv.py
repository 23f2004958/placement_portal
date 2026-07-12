import os
import csv
from datetime import datetime
from flask import current_app
from flask_mail import Message
from backend.extensions import db, celery_app, mail
from backend.models import Student, Application, User

@celery_app.task(name='export_student_applications')
def export_student_applications(user_id, student_email):
    print(f"Starting application export for user ID {user_id}...")
    
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        print(f"Student profile not found for user ID {user_id}")
        return "Student profile not found"
        
    student_name = student.user.name if student.user else "Unknown"

    apps = student.applications.all()
    print(f"Found {len(apps)} applications to export.")

    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    export_dir = os.path.join(project_root, 'backend', 'exports')
    os.makedirs(export_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{student.id}_applications_{timestamp}.csv"
    filepath = os.path.join(export_dir, filename)

    headers = [
        "Student ID", 
        "Student Name", 
        "Company Name", 
        "Drive Title", 
        "Application Date", 
        "Application Status", 
        "Package (LPA)"
    ]

    try:
        with open(filepath, mode='w', newline='', encoding='utf-8') as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(headers)
            for app in apps:
                company_name = app.drive.company.company_name if app.drive and app.drive.company else "Unknown"
                drive_title = app.drive.title if app.drive else "Unknown"
                app_date = app.date.strftime("%Y-%m-%d %H:%M:%S") if app.date else "N/A"
                package = app.drive.salary if app.drive else 0.0
                
                writer.writerow([
                    student.roll_number,
                    student_name,
                    company_name,
                    drive_title,
                    app_date,
                    app.status,
                    package
                ])
        print(f"CSV file written to {filepath}")
    except Exception as e:
        print(f"Failed to write CSV file: {str(e)}")
        return f"Failed to write CSV: {str(e)}"

    subject = "Your Placement Application History Export"
    body = "Please find your application history attached."
    
    msg = Message(
        subject=subject,
        recipients=[student_email],
        body=body
    )
    
    try:
        with open(filepath, "rb") as fp:
            msg.attach(
                filename=f"application_history_{timestamp}.csv",
                content_type="text/csv",
                data=fp.read()
            )
        mail.send(msg)
        print(f"Export CSV sent successfully to student: {student_email}")
    except Exception as e:
        print(f"Failed to send export email: {str(e)}")
        return f"Failed to send email: {str(e)}"

    return f"Export completed successfully. CSV sent to {student_email}"
