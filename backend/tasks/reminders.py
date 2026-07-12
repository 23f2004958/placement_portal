from datetime import datetime, timedelta
from flask import render_template
from flask_mail import Message
from backend.extensions import db, celery_app, mail
from backend.models import PlacementDrive, Student, Application, Notification, User

def is_student_eligible(student, pd):
    if student.cgpa < pd.min_cgpa:
        return False
    if pd.eligible_branches:
        branches = [b.strip().upper() for b in pd.eligible_branches.split(',')]
        if student.branch.strip().upper() not in branches:
            return False
    if pd.eligible_year != 0 and student.year != pd.eligible_year:
        return False
    return True

@celery_app.task(name='send_deadline_reminders')
def send_deadline_reminders():
    print("Starting daily deadline reminders job...")
    now = datetime.utcnow()
    three_days_later = now + timedelta(days=3)
    
    upcoming_drives = PlacementDrive.query.filter(
        PlacementDrive.status == 'approved',
        PlacementDrive.deadline >= now,
        PlacementDrive.deadline <= three_days_later
    ).all()
    
    print(f"Found {len(upcoming_drives)} upcoming drives with deadlines within 3 days.")
    
    reminders_sent = 0
    for drive in upcoming_drives:
        applied_student_ids = [app.student_id for app in drive.applications.all()]
        
        eligible_students = Student.query.all()
        for student in eligible_students:
            if student.id in applied_student_ids:
                continue
            
            if is_student_eligible(student, drive):
                user = student.user
                if not user or user.is_blacklisted or not user.is_active:
                    continue
                
                subject = f"Reminder: Deadline approaching for {drive.title} at {drive.company.company_name if drive.company else 'PPA'}"
                deadline_str = drive.deadline.strftime("%B %d, %Y at %I:%M %p")
                
                try:
                    email_body = render_template(
                        'reminder_email.html',
                        student_name=user.name,
                        job_title=drive.title,
                        company_name=drive.company.company_name if drive.company else "PPA",
                        package_lpa=drive.salary,
                        deadline_date=deadline_str
                    )
                except Exception:
                    # Plaintext fallback if template is missing
                    email_body = f"""
                    Dear {user.name},
                    
                    This is a reminder that the application deadline for '{drive.title}' at '{drive.company.company_name if drive.company else "PPA"}' is approaching.
                    
                    Details:
                    - Position: {drive.title}
                    - Package: {drive.salary} LPA
                    - Deadline: {deadline_str}
                    
                    Please submit your application on the Placement Portal before the deadline.
                    
                    Best regards,
                    Placement Office
                    """
                
                msg = Message(
                    subject=subject,
                    recipients=[user.email],
                    html=email_body if '<html>' in email_body or '<p>' in email_body else None,
                    body=email_body if not ('<html>' in email_body or '<p>' in email_body) else None
                )
                
                try:
                    mail.send(msg)
                except Exception as e:
                    print(f"Failed to send email to {user.email}: {str(e)}")
                
                notif = Notification(
                    user_id=user.id,
                    message=f"Deadline reminder: The application for '{drive.title}' at '{drive.company.company_name if drive.company else 'PPA'}' closes on {deadline_str}.",
                    is_read=False
                )
                db.session.add(notif)
                reminders_sent += 1
                
        db.session.commit()
    
    print(f"Completed deadline reminders job. Sent {reminders_sent} reminder notifications.")
    return f"Sent {reminders_sent} reminders"
