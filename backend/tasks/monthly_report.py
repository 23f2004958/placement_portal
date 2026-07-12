from datetime import datetime, timedelta
from flask import render_template, current_app
from flask_mail import Message
from backend.extensions import db, celery_app, mail
from backend.models import PlacementDrive, Student, Application, Company

def get_previous_month_range():
    today = datetime.utcnow()
    first_of_current = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_of_prev = first_of_current - timedelta(days=1)
    first_of_prev = last_of_prev.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return first_of_prev, first_of_current

@celery_app.task(name='send_monthly_report')
def send_monthly_report():
    print("Starting monthly activity report job...")
    first_of_prev, first_of_current = get_previous_month_range()
    
    month_year = first_of_prev.strftime("%B %Y")
    
    drives_conducted = PlacementDrive.query.filter(
        PlacementDrive.created_at >= first_of_prev,
        PlacementDrive.created_at < first_of_current,
        PlacementDrive.status.in_(['approved', 'closed'])
    ).count()

    applications_received = Application.query.filter(
        Application.date >= first_of_prev,
        Application.date < first_of_current
    ).count()

    students_selected = Application.query.filter(
        Application.date >= first_of_prev,
        Application.date < first_of_current,
        Application.status.in_(['Offer', 'Placed', 'selected'])
    ).count()

    top_companies_query = db.session.query(
        Company.company_name,
        db.func.count(Application.id).label('app_count')
    ).join(PlacementDrive, PlacementDrive.company_id == Company.id)\
     .join(Application, Application.drive_id == PlacementDrive.id)\
     .filter(Application.date >= first_of_prev, Application.date < first_of_current)\
     .group_by(Company.company_name)\
     .order_by(db.func.count(Application.id).desc())\
     .limit(5).all()

    top_companies = [{"company_name": row[0], "applicant_count": row[1]} for row in top_companies_query]

    branches = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL"]
    branch_summary = {}
    for branch in branches:
        apps_count = Application.query.join(Student).filter(
            Student.branch == branch,
            Application.date >= first_of_prev,
            Application.date < first_of_current
        ).count()
        
        sel_count = Application.query.join(Student).filter(
            Student.branch == branch,
            Application.status.in_(['Offer', 'Placed', 'selected']),
            Application.date >= first_of_prev,
            Application.date < first_of_current
        ).count()
        
        branch_summary[branch] = {
            "applications": apps_count,
            "selected": sel_count
        }

    generated_date = datetime.utcnow().strftime("%B %d, %Y")
    
    try:
        email_body = render_template(
            'monthly_report.html',
            month_year=month_year,
            drives_conducted=drives_conducted,
            applications_received=applications_received,
            students_selected=students_selected,
            top_companies=top_companies,
            branch_summary=branch_summary,
            status_distribution={
                "applied": Application.query.filter(Application.date >= first_of_prev, Application.date < first_of_current, Application.status.in_(['Applied', 'applied'])).count(),
                "shortlisted": Application.query.filter(Application.date >= first_of_prev, Application.date < first_of_current, Application.status.in_(['Shortlisted', 'shortlisted'])).count(),
                "selected": students_selected,
                "rejected": Application.query.filter(Application.date >= first_of_prev, Application.date < first_of_current, Application.status.in_(['Rejected', 'rejected'])).count()
            },
            generated_date=generated_date
        )
    except Exception:
        # Fallback plaintext report if HTML template fails
        email_body = f"""
===================================================
        MONTHLY PLACEMENT ACTIVITY REPORT
===================================================
Report Period: {month_year}
Generated Date: {generated_date}

1. OVERALL METRICS:
   - Placement Drives Conducted: {drives_conducted}
   - Student Applications Received: {applications_received}
   - Offers Issued / Placements Confirmed: {students_selected}

2. TOP COMPANIES BY APPLICANTS:
"""
        for rank, tc in enumerate(top_companies, 1):
            email_body += f"   {rank}. {tc['company_name']} ({tc['applicant_count']} applications)\n"
            
        email_body += "\n3. BRANCH SUMMARY:\n"
        for br, stats in branch_summary.items():
            email_body += f"   - {br}: Applications = {stats['applications']}, Offers = {stats['selected']}\n"
        
        email_body += "\n===================================================\n"

    admin_email = current_app.config.get('ADMIN_EMAIL', 'admin@ppa.com')
    subject = f"Monthly Placement Activity Report - {month_year}"
    
    msg = Message(
        subject=subject,
        recipients=[admin_email],
        html=email_body if '<html>' in email_body or '<p>' in email_body else None,
        body=email_body if not ('<html>' in email_body or '<p>' in email_body) else None
    )
    
    try:
        mail.send(msg)
        print(f"Monthly activity report sent to admin: {admin_email}")
        return f"Monthly report sent to {admin_email}"
    except Exception as e:
        print(f"Failed to send monthly report email to admin: {str(e)}")
        return f"Failed to send: {str(e)}"
