from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from datetime import datetime, timedelta
from backend.extensions import db, cache
from backend.models import User, Company, Student, PlacementDrive, Application, Notification, Placement

company_bp = Blueprint('company', __name__)

def company_required():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask_jwt_extended import verify_jwt_in_request
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not user or user.role != 'company':
                return jsonify({"success": False, "error": "Company access required"}), 403
            if user.is_blacklisted:
                return jsonify({"success": False, "error": "Company account is blacklisted"}), 403
            if not user.is_active:
                return jsonify({"success": False, "error": "Your company registration is not approved yet by Admin"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

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

def parse_datetime(dt_str):
    if not dt_str:
        return None
    dt_str = dt_str.replace('Z', '')
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(dt_str)
    except ValueError:
        raise ValueError(f"Invalid datetime format: {dt_str}")

@company_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@company_required()
def dashboard():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile
    
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    drives = cp.drives.all()
    
    total_drives = len(drives)
    total_applicants = 0
    shortlisted = 0
    selected = 0
    
    drives_data = []
    for drive in drives:
        app_count = drive.applications.count()
        total_applicants += app_count
        shortlisted += drive.applications.filter_by(status='Shortlisted').count() + drive.applications.filter_by(status='shortlisted').count()
        selected += drive.applications.filter_by(status='Offer').count() + drive.applications.filter_by(status='Placed').count() + drive.applications.filter_by(status='selected').count()
        
        drives_data.append({
            "id": drive.id,
            "title": drive.title,
            "deadline": drive.deadline.isoformat() if drive.deadline else None,
            "status": drive.status,
            "applicant_count": app_count
        })

    return jsonify({
        "success": True,
        "data": {
            "profile": cp.to_dict(),
            "stats": {
                "total_drives": total_drives,
                "total_applicants": total_applicants,
                "shortlisted": shortlisted,
                "selected": selected
            },
            "drives": drives_data
        }
    }), 200


@company_bp.route('/profile', methods=['GET'])
@jwt_required()
@company_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404
    return jsonify({"success": True, "data": cp.to_dict()}), 200


@company_bp.route('/profile', methods=['PUT'])
@jwt_required()
@company_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    data = request.get_json() or {}
    
    cp.hr_contact = data.get('hr_contact', cp.hr_contact)
    cp.website = data.get('website', cp.website)
    cp.location = data.get('location', cp.location) # Update location per V2 PRD
    cp.industry = data.get('industry', cp.industry)
    cp.description = data.get('description', cp.description)
    
    db.session.commit()
    
    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_companies*")
    
    return jsonify({"success": True, "data": cp.to_dict()}), 200


@company_bp.route('/drives', methods=['POST'])
@jwt_required()
@company_required()
def create_drive():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    if cp.approval_status != 'approved':
        return jsonify({"success": False, "error": "Your company registration is not approved yet. Drive creation is forbidden."}), 403

    data = request.get_json() or {}
    
    required_fields = ['title', 'description', 'eligible_branches', 'min_cgpa', 'eligible_year', 'salary', 'deadline']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"success": False, "error": f"{field.replace('_', ' ').capitalize()} is required"}), 400

    try:
        min_cgpa = float(data['min_cgpa'])
        if min_cgpa < 0.0 or min_cgpa > 10.0:
            return jsonify({"success": False, "error": "Minimum CGPA must be between 0.0 and 10.0"}), 400
    except ValueError:
        return jsonify({"success": False, "error": "Minimum CGPA must be a valid decimal number"}), 400

    try:
        salary = float(data['salary'])
        if salary <= 0:
            return jsonify({"success": False, "error": "Salary must be a positive number"}), 400
    except ValueError:
        return jsonify({"success": False, "error": "Salary must be a valid number"}), 400

    try:
        deadline = parse_datetime(data['deadline'])
        if deadline <= datetime.utcnow():
            return jsonify({"success": False, "error": "Application deadline must be a future date"}), 400
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    drive_date = None
    if data.get('drive_date'):
        try:
            drive_date = parse_datetime(data['drive_date'])
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400

    try:
        if str(data['eligible_year']).lower() == 'all':
            eligible_year = 0
        else:
            eligible_year = int(data['eligible_year'])
            if eligible_year < 1 or eligible_year > 4:
                return jsonify({"success": False, "error": "Eligible year must be 1-4 or 'All'"}), 400
    except ValueError:
         return jsonify({"success": False, "error": "Eligible year must be a number or 'All'"}), 400

    new_drive = PlacementDrive(
        company_id=cp.id,
        title=data['title'],
        description=data['description'],
        eligible_branches=data['eligible_branches'],
        min_cgpa=min_cgpa,
        eligible_year=eligible_year,
        salary=salary,
        deadline=deadline,
        drive_date=drive_date,
        status='pending'
    )
    
    db.session.add(new_drive)
    db.session.commit()

    cache.delete(f"company_drives_{cp.id}")
    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_drives*")

    return jsonify({"success": True, "data": new_drive.to_dict()}), 201


@company_bp.route('/drives', methods=['GET'])
@jwt_required()
@company_required()
def get_drives():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile
    if not cp:
        return jsonify({"success": False, "error": "Company profile not found"}), 404

    key = f"company_drives_{cp.id}"
    cached_val = cache.get(key)
    if cached_val is not None:
        return jsonify({"success": True, "data": cached_val}), 200

    drives_data = [d.to_dict() for d in cp.drives.all()]
    cache.set(key, drives_data, timeout=180)
    
    return jsonify({"success": True, "data": drives_data}), 200


@company_bp.route('/drives/<int:id>/applications', methods=['GET'])
@jwt_required()
@company_required()
def get_drive_applications(id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile
    
    drive = PlacementDrive.query.get(id)
    if not drive or drive.company_id != cp.id:
        return jsonify({"success": False, "error": "Placement drive not found"}), 404

    apps_data = []
    for app in drive.applications.all():
        student = app.student
        student_user = student.user if student else None
        
        apps_data.append({
            "id": app.id,
            "applied_at": app.date.isoformat() if app.date else None,
            "status": app.status,
            "interview_date": app.interview_date.isoformat() if app.interview_date else None,
            "remarks": app.remarks,
            "student": {
                "id": student.id if student else None,
                "name": student_user.name if student_user else "Unknown",
                "email": student_user.email if student_user else "Unknown",
                "roll_number": student.roll_number if student else "N/A",
                "branch": student.branch if student else "N/A",
                "year": student.year if student else 1,
                "cgpa": student.cgpa if student else 0.0,
                "phone": student.phone if student else "N/A",
                "resume_filename": student.resume_filename if student else None,
                "linkedin_url": getattr(student, 'linkedin_url', None),
                "skills": student.skills if student else None,
                "education": student.education if student else None,
                "experience": student.experience if student else None
            }
        })

    return jsonify({"success": True, "data": apps_data}), 200


@company_bp.route('/applications/<int:id>/status', methods=['POST', 'PUT'])
@jwt_required()
@company_required()
def update_application_status(id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    cp = user.company_profile

    app = Application.query.get(id)
    if not app or app.drive.company_id != cp.id:
        return jsonify({"success": False, "error": "Application not found"}), 404

    data = request.get_json() or {}
    
    raw_status = data.get('status')
    if not raw_status:
        return jsonify({"success": False, "error": "Status is required"}), 400
        
    status_map = {
        'applied': 'Applied',
        'shortlisted': 'Shortlisted',
        'interview': 'Interview',
        'selected': 'Offer',
        'offer': 'Offer',
        'rejected': 'Rejected',
        'placed': 'Placed'
    }
    
    status = status_map.get(raw_status.lower(), raw_status)
    valid_statuses = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected', 'Placed']
    
    if status not in valid_statuses:
        return jsonify({"success": False, "error": f"Invalid status value: {raw_status}"}), 400

    app.status = status
    app.remarks = data.get('remarks', app.remarks)
    
    if data.get('interview_date'):
        try:
            app.interview_date = parse_datetime(data['interview_date'])
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400
            
    # Handle V2 Placement 1:1 on placement success
    if status == 'Placed':
        existing_placement = Placement.query.filter_by(application_id=app.id).first()
        if not existing_placement:
            placement = Placement(
                student_id=app.student_id,
                company_id=cp.id,
                application_id=app.id,
                position=app.drive.title,
                salary=app.drive.salary,
                joining_date=datetime.utcnow() + timedelta(days=90) # default to 3 months from now
            )
            db.session.add(placement)
    
    student_user = app.student.user
    notif_msg = f"Your application for '{app.drive.title}' at '{cp.company_name}' has been updated to '{status}'."
    if status == 'Shortlisted' or status == 'Interview':
        if app.interview_date:
            notif_msg += f" Interview scheduled for {app.interview_date.strftime('%Y-%m-%d %H:%M')}."
    if app.remarks:
        notif_msg += f" Remarks: {app.remarks}"

    notif = Notification(
        user_id=student_user.id,
        message=notif_msg,
        is_read=False
    )
    db.session.add(notif)
    db.session.commit()

    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_students*")

    return jsonify({"success": True, "data": app.to_dict()}), 200
