from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func
from backend.extensions import db, cache
from backend.models import User, Company, Student, PlacementDrive, Application, Notification

admin_bp = Blueprint('admin', __name__)

def admin_required():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request_custom()
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not user or user.role != 'admin':
                return jsonify({"success": False, "error": "Admin privileges required"}), 403
            if user.is_blacklisted or not user.is_active:
                return jsonify({"success": False, "error": "Account is inactive or blacklisted"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def verify_jwt_in_request_custom():
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()

def safe_delete_pattern(pattern):
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
        elif hasattr(cache, 'cache') and hasattr(cache.cache, 'delete_pattern'):
            cache.cache.delete_pattern(pattern)
        elif hasattr(cache, 'cache') and hasattr(cache.cache, '_client'):
            client = cache.cache._client
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
        else:
            cache.clear()
    except Exception:
        try:
            cache.clear()
        except Exception:
            pass

def invalidate_admin_companies():
    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_companies*")

def invalidate_admin_drives():
    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_drives*")


@admin_bp.route('/stats', methods=['GET'])
@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required()
@cache.cached(timeout=300, key_prefix="admin_dashboard")
def dashboard():
    total_students = Student.query.count()
    total_companies = Company.query.count()
    total_drives = PlacementDrive.query.count()
    total_applications = Application.query.count()
    pending_companies_count = Company.query.filter_by(approval_status='pending').count()
    pending_drives_count = PlacementDrive.query.filter_by(status='pending').count()

    # Pending companies list
    pending_companies = []
    for cp in Company.query.filter_by(approval_status='pending').all():
        u = User.query.get(cp.user_id)
        if u:
            pending_companies.append({
                "id": cp.id,
                "user_id": cp.user_id,
                "company_name": cp.company_name,
                "location": cp.location,
                "industry": cp.industry,
                "email": u.email,
                "registered_at": cp.registered_at.isoformat() if cp.registered_at else None
            })

    # Pending drives list
    pending_drives = []
    for pd in PlacementDrive.query.filter_by(status='pending').all():
        pending_drives.append({
            "id": pd.id,
            "company_name": pd.company.company_name if pd.company else "Unknown",
            "title": pd.title,
            "deadline": pd.deadline.isoformat() if pd.deadline else None,
            "salary": pd.salary
        })

    # Applications per month (last 6 months)
    applications_per_month = {}
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=i*30)
        month_str = month_date.strftime("%b %Y")
        y = month_date.year
        m = month_date.month
        
        start_date = datetime(y, m, 1)
        if m == 12:
            end_date = datetime(y + 1, 1, 1)
        else:
            end_date = datetime(y, m + 1, 1)

        count = Application.query.filter(Application.date >= start_date, Application.date < end_date).count()
        applications_per_month[month_str] = count

    # Status distribution
    status_distribution = {
        "Applied": Application.query.filter_by(status='Applied').count() + Application.query.filter_by(status='applied').count(),
        "Shortlisted": Application.query.filter_by(status='Shortlisted').count() + Application.query.filter_by(status='shortlisted').count(),
        "Interview": Application.query.filter_by(status='Interview').count() + Application.query.filter_by(status='interview').count(),
        "Offer": Application.query.filter_by(status='Offer').count() + Application.query.filter_by(status='offer').count(),
        "Rejected": Application.query.filter_by(status='Rejected').count() + Application.query.filter_by(status='rejected').count(),
        "Placed": Application.query.filter_by(status='Placed').count() + Application.query.filter_by(status='placed').count()
    }

    # Top 5 companies by applicant count
    top_companies_query = db.session.query(
        Company.company_name, 
        func.count(Application.id).label('app_count')
    ).join(PlacementDrive, PlacementDrive.company_id == Company.id)\
     .join(Application, Application.drive_id == PlacementDrive.id)\
     .group_by(Company.company_name)\
     .order_by(func.count(Application.id).desc())\
     .limit(5).all()

    top_companies = [{"company_name": row[0], "applicant_count": row[1]} for row in top_companies_query]

    if not top_companies:
        top_companies = [{"company_name": cp.company_name, "applicant_count": 0} for cp in Company.query.limit(5).all()]

    return jsonify({
        "success": True,
        "data": {
            "total_students": total_students,
            "total_companies": total_companies,
            "total_drives": total_drives,
            "total_applications": total_applications,
            "pending_companies_count": pending_companies_count,
            "pending_drives_count": pending_drives_count,
            "pending_companies": pending_companies,
            "pending_drives": pending_drives,
            "applications_per_month": applications_per_month,
            "status_distribution": status_distribution,
            "top_companies": top_companies
        }
    }), 200


def make_companies_cache_key():
    status = request.args.get('status', 'all')
    search = request.args.get('search', '')
    return f"admin_companies_{status}_{search}"

@admin_bp.route('/companies', methods=['GET'])
@jwt_required()
@admin_required()
def get_companies():
    key = make_companies_cache_key()
    cached_val = cache.get(key)
    if cached_val is not None:
        return jsonify({"success": True, "data": cached_val}), 200

    status = request.args.get('status')
    search = request.args.get('search')

    query = Company.query

    if status and status in ['pending', 'approved', 'rejected']:
        query = query.filter_by(approval_status=status)
    
    if search:
        query = query.filter(Company.company_name.ilike(f"%{search}%"))

    companies = []
    for cp in query.all():
        u = User.query.get(cp.user_id)
        if u:
            companies.append({
                "id": cp.id,
                "user_id": cp.user_id,
                "company_name": cp.company_name,
                "location": cp.location,
                "hr_contact": cp.hr_contact,
                "website": cp.website,
                "industry": cp.industry,
                "description": cp.description,
                "approval_status": cp.approval_status,
                "registered_at": cp.registered_at.isoformat() if cp.registered_at else None,
                "email": u.email,
                "is_blacklisted": u.is_blacklisted,
                "is_active": u.is_active
            })

    cache.set(key, companies, timeout=300)
    return jsonify({"success": True, "data": companies}), 200


@admin_bp.route('/companies/<int:id>/approve', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def approve_company(id):
    cp = Company.query.get(id)
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    u = User.query.get(cp.user_id)
    if not u:
        return jsonify({"success": False, "error": "User account not found"}), 404

    cp.approval_status = 'approved'
    u.is_active = True
    
    # Notify company user
    notif = Notification(
        user_id=u.id,
        message="Your company profile has been approved. You can now post placement drives.",
        is_read=False
    )
    db.session.add(notif)
    db.session.commit()

    invalidate_admin_companies()

    return jsonify({
        "success": True,
        "data": {
            "id": cp.id,
            "approval_status": cp.approval_status,
            "is_active": u.is_active
        }
    }), 200


@admin_bp.route('/companies/<int:id>/reject', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def reject_company(id):
    cp = Company.query.get(id)
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    cp.approval_status = 'rejected'
    db.session.commit()

    invalidate_admin_companies()

    return jsonify({
        "success": True,
        "data": {
            "id": cp.id,
            "approval_status": cp.approval_status
        }
    }), 200


@admin_bp.route('/companies/<int:id>/blacklist', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def blacklist_company(id):
    cp = Company.query.get(id)
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    u = User.query.get(cp.user_id)
    if not u:
        return jsonify({"success": False, "error": "User account not found"}), 404

    u.is_blacklisted = True
    u.is_active = False
    db.session.commit()

    invalidate_admin_companies()

    return jsonify({
        "success": True,
        "data": {
            "id": cp.id,
            "is_blacklisted": u.is_blacklisted,
            "is_active": u.is_active
        }
    }), 200


def make_students_cache_key():
    search = request.args.get('search', '')
    return f"admin_students_{search}"

@admin_bp.route('/students', methods=['GET'])
@jwt_required()
@admin_required()
def get_students():
    key = make_students_cache_key()
    cached_val = cache.get(key)
    if cached_val is not None:
        return jsonify({"success": True, "data": cached_val}), 200

    search = request.args.get('search')

    query = Student.query

    if search:
        query = query.join(User).filter(
            (User.name.ilike(f"%{search}%")) | 
            (Student.roll_number.ilike(f"%{search}%"))
        )

    students = []
    for sp in query.all():
        u = User.query.get(sp.user_id)
        if u:
            apps = []
            for app in sp.applications.all():
                apps.append({
                    "id": app.id,
                    "company_name": app.drive.company.company_name if app.drive.company else "Unknown",
                    "title": app.drive.title,
                    "date": app.date.isoformat() if app.date else None,
                    "status": app.status,
                    "salary": app.drive.salary
                })

            students.append({
                "id": sp.id,
                "user_id": sp.user_id,
                "roll_number": sp.roll_number,
                "branch": sp.branch,
                "year": sp.year,
                "cgpa": sp.cgpa,
                "phone": sp.phone,
                "education": sp.education,
                "resume_filename": sp.resume_filename,
                "experience": sp.experience,
                "skills": sp.skills,
                "created_at": sp.created_at.isoformat() if sp.created_at else None,
                "name": u.name,
                "email": u.email,
                "is_blacklisted": u.is_blacklisted,
                "is_active": u.is_active,
                "applications": apps
            })

    cache.set(key, students, timeout=300)
    return jsonify({"success": True, "data": students}), 200


@admin_bp.route('/students/<int:id>/blacklist', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def blacklist_student(id):
    sp = Student.query.get(id)
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    u = User.query.get(sp.user_id)
    if not u:
        return jsonify({"success": False, "error": "User account not found"}), 404

    u.is_blacklisted = True
    u.is_active = False
    db.session.commit()

    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_students*")

    return jsonify({
        "success": True,
        "data": {
            "id": sp.id,
            "is_blacklisted": u.is_blacklisted,
            "is_active": u.is_active
        }
    }), 200


@admin_bp.route('/students/<int:id>/activate', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def activate_student(id):
    sp = Student.query.get(id)
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    u = User.query.get(sp.user_id)
    if not u:
        return jsonify({"success": False, "error": "User account not found"}), 404

    u.is_blacklisted = False
    u.is_active = True
    db.session.commit()

    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_students*")

    return jsonify({
        "success": True,
        "data": {
            "id": sp.id,
            "is_blacklisted": u.is_blacklisted,
            "is_active": u.is_active
        }
    }), 200


def make_drives_cache_key():
    status = request.args.get('status', 'all')
    return f"admin_drives_{status}"

@admin_bp.route('/drives', methods=['GET'])
@jwt_required()
@admin_required()
def get_drives():
    key = make_drives_cache_key()
    cached_val = cache.get(key)
    if cached_val is not None:
        return jsonify({"success": True, "data": cached_val}), 200

    status = request.args.get('status')

    query = PlacementDrive.query

    if status and status in ['pending', 'approved', 'closed']:
        query = query.filter_by(status=status)

    drives = []
    for pd in query.all():
        drives.append({
            "id": pd.id,
            "company_id": pd.company_id,
            "company_name": pd.company.company_name if pd.company else "Unknown",
            "title": pd.title,
            "job_title": pd.title,
            "description": pd.description,
            "job_description": pd.description,
            "eligible_branches": pd.eligible_branches,
            "min_cgpa": pd.min_cgpa,
            "eligible_year": pd.eligible_year,
            "salary": pd.salary,
            "package_lpa": pd.salary,
            "deadline": pd.deadline.isoformat() if pd.deadline else None,
            "application_deadline": pd.deadline.isoformat() if pd.deadline else None,
            "drive_date": pd.drive_date.isoformat() if pd.drive_date else None,
            "status": pd.status,
            "created_at": pd.created_at.isoformat() if pd.created_at else None
        })

    cache.set(key, drives, timeout=300)
    return jsonify({"success": True, "data": drives}), 200


@admin_bp.route('/drives/<int:id>/approve', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def approve_drive(id):
    pd = PlacementDrive.query.get(id)
    if not pd:
        return jsonify({"success": False, "error": "Placement drive not found"}), 404

    pd.status = 'approved'
    
    # Notify company user of drive approval
    if pd.company and pd.company.user:
        notif = Notification(
            user_id=pd.company.user.id,
            message=f"Your placement drive '{pd.title}' has been approved by the Admin.",
            is_read=False
        )
        db.session.add(notif)
    
    db.session.commit()

    invalidate_admin_drives()
    safe_delete_pattern("student_drives*")

    return jsonify({
        "success": True,
        "data": {
            "id": pd.id,
            "status": pd.status
        }
    }), 200


@admin_bp.route('/drives/<int:id>/reject', methods=['POST', 'PUT'])
@jwt_required()
@admin_required()
def reject_drive(id):
    pd = PlacementDrive.query.get(id)
    if not pd:
        return jsonify({"success": False, "error": "Placement drive not found"}), 404

    pd.status = 'closed'
    db.session.commit()

    invalidate_admin_drives()
    safe_delete_pattern("student_drives*")

    return jsonify({
        "success": True,
        "data": {
            "id": pd.id,
            "status": pd.status
        }
    }), 200


@admin_bp.route('/applications', methods=['GET'])
@jwt_required()
@admin_required()
def get_applications():
    query = Application.query.order_by(Application.date.desc())
    
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    applications = []
    for app in query.all():
        student_name = app.student.user.name if app.student and app.student.user else "Unknown"
        roll_no = app.student.roll_number if app.student else "N/A"
        company_name = app.drive.company.company_name if app.drive and app.drive.company else "Unknown"
        drive_title = app.drive.title if app.drive else "Unknown"

        applications.append({
            "id": app.id,
            "student_name": student_name,
            "roll_no": roll_no,
            "company_name": company_name,
            "drive_title": drive_title,
            "applied_at": app.date.isoformat() if app.date else None,
            "status": app.status,
            "package_lpa": app.drive.salary if app.drive else 0
        })

    return jsonify({"success": True, "data": applications}), 200


@admin_bp.route('/search', methods=['GET'])
@jwt_required()
@admin_required()
def search():
    search_type = request.args.get('type') # 'student' | 'company'
    q = request.args.get('q', '')

    if not search_type or search_type not in ['student', 'company']:
        return jsonify({"success": False, "error": "Search type 'student' or 'company' is required"}), 400

    results = []

    if search_type == 'student':
        query = Student.query.join(User).filter(
            (User.name.ilike(f"%{q}%")) | 
            (User.email.ilike(f"%{q}%")) | 
            (Student.roll_number.ilike(f"%{q}%"))
        )
        for sp in query.all():
            results.append({
                "id": sp.id,
                "name": sp.user.name,
                "email": sp.user.email,
                "roll_number": sp.roll_number,
                "branch": sp.branch,
                "year": sp.year,
                "cgpa": sp.cgpa,
                "is_active": sp.user.is_active,
                "is_blacklisted": sp.user.is_blacklisted
            })

    elif search_type == 'company':
        query = Company.query.join(User).filter(
            (Company.company_name.ilike(f"%{q}%")) | 
            (User.email.ilike(f"%{q}%"))
        )
        for cp in query.all():
            results.append({
                "id": cp.id,
                "company_name": cp.company_name,
                "location": cp.location,
                "email": cp.user.email,
                "industry": cp.industry,
                "website": cp.website,
                "approval_status": cp.approval_status,
                "is_active": cp.user.is_active,
                "is_blacklisted": cp.user.is_blacklisted
            })

    return jsonify({"success": True, "data": results}), 200
