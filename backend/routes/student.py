import os
from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from datetime import datetime
from werkzeug.utils import secure_filename
from backend.extensions import db, cache
from backend.models import User, Student, Company, PlacementDrive, Application, Notification, Placement
from celery.result import AsyncResult

student_bp = Blueprint('student', __name__)

def student_required():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask_jwt_extended import verify_jwt_in_request
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not user or user.role != 'student':
                return jsonify({"success": False, "error": "Student access required"}), 403
            if user.is_blacklisted or not user.is_active:
                return jsonify({"success": False, "error": "Student account is inactive or blacklisted"}), 403
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

def check_eligibility(student, pd):
    if pd.status != 'approved':
        return False, "Placement drive is not approved"

    if pd.deadline < datetime.utcnow():
        return False, "Application deadline has passed"

    if student.cgpa < pd.min_cgpa:
        return False, f"Your CGPA ({student.cgpa}) is below the minimum required ({pd.min_cgpa})"

    if pd.eligible_branches:
        branches = [b.strip().upper() for b in pd.eligible_branches.split(',')]
        if student.branch.strip().upper() not in branches:
            return False, f"Your branch ({student.branch}) is not eligible for this drive"

    if pd.eligible_year != 0 and student.year != pd.eligible_year:
        return False, f"Only year {pd.eligible_year} students are eligible"

    return True, "Eligible"


@student_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@student_required()
def dashboard():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile
    
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    total_applied = sp.applications.count()
    shortlisted = sp.applications.filter_by(status='Shortlisted').count() + sp.applications.filter_by(status='shortlisted').count()
    selected = sp.applications.filter_by(status='Offer').count() + sp.applications.filter_by(status='Placed').count() + sp.applications.filter_by(status='selected').count()
    rejected = sp.applications.filter_by(status='Rejected').count() + sp.applications.filter_by(status='rejected').count()

    recent_apps = []
    for app in sp.applications.order_by(Application.date.desc()).limit(5).all():
        recent_apps.append({
            "id": app.id,
            "company_name": app.drive.company.company_name if app.drive and app.drive.company else "Unknown",
            "title": app.drive.title if app.drive else "Unknown",
            "date": app.date.isoformat() if app.date else None,
            "status": app.status
        })

    recommended_drives = []
    all_drives = PlacementDrive.query.filter_by(status='approved').all()
    applied_drive_ids = [app.drive_id for app in sp.applications.all()]

    for pd in all_drives:
        if pd.id in applied_drive_ids:
            continue
        is_eligible, _ = check_eligibility(sp, pd)
        if is_eligible:
            recommended_drives.append({
                "id": pd.id,
                "company_name": pd.company.company_name if pd.company else "Unknown",
                "title": pd.title,
                "salary": pd.salary,
                "deadline": pd.deadline.isoformat() if pd.deadline else None,
                "min_cgpa": pd.min_cgpa
            })

    return jsonify({
        "success": True,
        "data": {
            "profile": sp.to_dict(),
            "name": user.name,
            "email": user.email,
            "stats": {
                "applied": total_applied,
                "shortlisted": shortlisted,
                "selected": selected,
                "rejected": rejected
            },
            "recent_applications": recent_apps,
            "recommended_drives": recommended_drives[:5]
        }
    }), 200


@student_bp.route('/profile', methods=['GET'])
@jwt_required()
@student_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404
    return jsonify({"success": True, "data": sp.to_dict()}), 200


@student_bp.route('/profile', methods=['PUT'])
@jwt_required()
@student_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    data = request.get_json() or {}
    
    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()

    if 'roll_number' in data and data['roll_number'].strip():
        sp.roll_number = data['roll_number'].strip()
    
    if 'phone' in data:
        phone = str(data['phone'])
        if len(phone) != 10 or not phone.isdigit():
             return jsonify({"success": False, "error": "Phone number must be exactly 10 digits"}), 400
        sp.phone = phone

    if 'cgpa' in data:
        try:
            cgpa = float(data['cgpa'])
            if cgpa < 0.0 or cgpa > 10.0:
                return jsonify({"success": False, "error": "CGPA must be between 0.0 and 10.0"}), 400
            sp.cgpa = cgpa
        except ValueError:
            return jsonify({"success": False, "error": "CGPA must be a valid decimal number"}), 400

    sp.skills = data.get('skills', sp.skills)
    sp.education = data.get('education', sp.education)
    sp.experience = data.get('experience', sp.experience)
    
    db.session.commit()

    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_students*")
    safe_delete_pattern("student_drives*")

    return jsonify({"success": True, "data": sp.to_dict()}), 200


@student_bp.route('/profile/resume', methods=['POST'])
@jwt_required()
@student_required()
def upload_resume():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    if 'resume' not in request.files:
        return jsonify({"success": False, "error": "No resume file part"}), 400
    
    file = request.files['resume']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400

    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if ext not in ['pdf', 'docx']:
        return jsonify({"success": False, "error": "Only PDF and DOCX files are allowed"}), 400

    filename = secure_filename(f"{user_id}_resume.{ext}")
    
    # Resolve absolute upload path relative to root_path or project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    upload_path = os.path.join(project_root, 'backend', 'uploads', 'resumes')
    
    os.makedirs(upload_path, exist_ok=True)
    file_full_path = os.path.join(upload_path, filename)
    file.save(file_full_path)

    sp.resume_filename = filename
    db.session.commit()

    cache.delete("admin_dashboard")
    safe_delete_pattern("admin_students*")

    return jsonify({
        "success": True,
        "data": {
            "message": "Resume uploaded successfully",
            "resume_filename": filename
        }
    }), 200


def make_student_drives_cache_key():
    user_id = get_jwt_identity()
    search = request.args.get('search', '')
    branch = request.args.get('branch', '')
    min_cgpa = request.args.get('min_cgpa', '')
    return f"student_drives_{user_id}_{search}_{branch}_{min_cgpa}"

@student_bp.route('/drives', methods=['GET'])
@jwt_required()
@student_required()
def get_eligible_drives():
    key = make_student_drives_cache_key()
    cached_val = cache.get(key)
    if cached_val is not None:
        return jsonify({"success": True, "data": cached_val}), 200

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile

    search = request.args.get('search')
    branch_filter = request.args.get('branch')
    min_cgpa_filter = request.args.get('min_cgpa')

    query = PlacementDrive.query.filter_by(status='approved')

    if search:
        query = query.join(Company).filter(
            (PlacementDrive.title.ilike(f"%{search}%")) |
            (Company.company_name.ilike(f"%{search}%"))
        )

    applied_drive_ids = [app.drive_id for app in sp.applications.all()]

    drives = []
    for pd in query.all():
        is_eligible, eligibility_reason = check_eligibility(sp, pd)
        
        if branch_filter and branch_filter != '':
            if not pd.eligible_branches or branch_filter.strip().upper() not in [b.strip().upper() for b in pd.eligible_branches.split(',')]:
                continue
        
        if min_cgpa_filter and min_cgpa_filter != '':
            try:
                if pd.min_cgpa > float(min_cgpa_filter):
                    continue
            except ValueError:
                pass

        drives.append({
            "id": pd.id,
            "company_name": pd.company.company_name if pd.company else "Unknown",
            "title": pd.title,
            "description": pd.description,
            "eligible_branches": pd.eligible_branches,
            "min_cgpa": pd.min_cgpa,
            "eligible_year": pd.eligible_year,
            "salary": pd.salary,
            "deadline": pd.deadline.isoformat() if pd.deadline else None,
            "drive_date": pd.drive_date.isoformat() if pd.drive_date else None,
            "status": pd.status,
            "is_eligible": is_eligible,
            "eligibility_reason": eligibility_reason,
            "already_applied": pd.id in applied_drive_ids
        })

    cache.set(key, drives, timeout=180)
    return jsonify({"success": True, "data": drives}), 200


@student_bp.route('/drives/<int:drive_id>/apply', methods=['POST'])
@jwt_required()
@student_required()
def apply_to_drive(drive_id):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    pd = PlacementDrive.query.get(drive_id)
    if not pd:
        return jsonify({"success": False, "error": "Placement drive not found"}), 404

    existing_app = Application.query.filter_by(student_id=sp.id, drive_id=pd.id).first()
    if existing_app:
        return jsonify({"success": False, "error": "You have already applied to this drive"}), 409

    is_eligible, reason = check_eligibility(sp, pd)
    if not is_eligible:
        return jsonify({"success": False, "error": f"Eligibility check failed: {reason}"}), 400

    new_app = Application(
        student_id=sp.id,
        drive_id=pd.id,
        status='Applied'
    )
    db.session.add(new_app)
    db.session.commit()

    cache.delete("admin_dashboard")
    safe_delete_pattern("student_drives*")

    return jsonify({
        "success": True,
        "data": {
            "message": "Applied successfully"
        }
    }), 201


@student_bp.route('/applications', methods=['GET'])
@jwt_required()
@student_required()
def get_applications():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile

    apps = []
    for app in sp.applications.order_by(Application.date.desc()).all():
        apps.append({
            "id": app.id,
            "company_name": app.drive.company.company_name if app.drive and app.drive.company else "Unknown",
            "title": app.drive.title if app.drive else "Unknown",
            "salary": app.drive.salary if app.drive else 0,
            "date": app.date.isoformat() if app.date else None,
            "status": app.status,
            "interview_date": app.interview_date.isoformat() if app.interview_date else None,
            "remarks": app.remarks
        })

    return jsonify({"success": True, "data": apps}), 200


@student_bp.route('/history', methods=['GET'])
@jwt_required()
@student_required()
def get_history():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile

    apps = []
    for app in sp.applications.order_by(Application.date.desc()).all():
        apps.append({
            "id": app.id,
            "company_name": app.drive.company.company_name if app.drive and app.drive.company else "Unknown",
            "title": app.drive.title if app.drive else "Unknown",
            "salary": app.drive.salary if app.drive else 0,
            "date": app.date.isoformat() if app.date else None,
            "status": app.status,
            "remarks": app.remarks
        })

    return jsonify({"success": True, "data": apps}), 200




@student_bp.route('/notifications', methods=['GET'])
@jwt_required()
@student_required()
def get_notifications():
    user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(user_id=int(user_id)).order_by(Notification.created_at.desc()).all()
    unread_count = Notification.query.filter_by(user_id=int(user_id), is_read=False).count()

    notifs_data = [n.to_dict() for n in notifications]
    return jsonify({
        "success": True,
        "data": {
            "notifications": notifs_data,
            "unread_count": unread_count
        }
    }), 200


@student_bp.route('/notifications/<int:id>/read', methods=['PUT'])
@jwt_required()
@student_required()
def read_notification(id):
    user_id = get_jwt_identity()
    notif = Notification.query.get(id)
    if not notif or notif.user_id != int(user_id):
        return jsonify({"success": False, "error": "Notification not found"}), 404

    notif.is_read = True
    db.session.commit()

    return jsonify({"success": True, "data": notif.to_dict()}), 200


@student_bp.route('/export-csv', methods=['POST'])
@jwt_required()
@student_required()
def export_csv():
    import io
    import csv
    from flask import make_response

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    sp = user.student_profile
    if not sp:
        return jsonify({"success": False, "error": "Student profile not found"}), 404
        
    apps = sp.applications.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "Student ID", 
        "Student Name", 
        "Company Name", 
        "Drive Title", 
        "Application Date", 
        "Application Status", 
        "Package (LPA)"
    ]
    writer.writerow(headers)
    
    for app in apps:
        company_name = app.drive.company.company_name if app.drive and app.drive.company else "Unknown"
        drive_title = app.drive.title if app.drive else "Unknown"
        app_date = app.date.strftime("%Y-%m-%d %H:%M:%S") if app.date else "N/A"
        package = app.drive.salary if app.drive else 0.0
        
        writer.writerow([
            sp.roll_number,
            user.name,
            company_name,
            drive_title,
            app_date,
            app.status,
            package
        ])
        
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=applications_history.csv"
    response.headers["Content-type"] = "text/csv"
    return response
