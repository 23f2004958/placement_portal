from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.extensions import db, cache
from backend.models import User, Student, Company

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    if user.is_blacklisted:
        return jsonify({"success": False, "error": "Your account has been blacklisted"}), 403

    if not user.is_active:
        return jsonify({"success": False, "error": "Your account is not active. Companies must be approved by the Admin."}), 403

    # Generate JWT Token using user ID
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        "success": True,
        "data": {
            "access_token": access_token,
            "role": user.role,
            "user_id": user.id,
            "name": user.name
        }
    }), 200


@auth_bp.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json() or {}
    
    # Required field verification
    required_fields = ['name', 'email', 'password', 'roll_number', 'branch', 'year', 'cgpa', 'phone']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"success": False, "error": f"{field.replace('_', ' ').capitalize()} is required"}), 400

    # Checks
    if len(data['password']) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400

    try:
        cgpa = float(data['cgpa'])
        if cgpa < 0.0 or cgpa > 10.0:
            return jsonify({"success": False, "error": "CGPA must be between 0.0 and 10.0"}), 400
    except ValueError:
        return jsonify({"success": False, "error": "CGPA must be a valid decimal number"}), 400

    try:
        year = int(data['year'])
        if year < 1 or year > 4:
            return jsonify({"success": False, "error": "Year must be between 1 and 4"}), 400
    except ValueError:
        return jsonify({"success": False, "error": "Year must be an integer between 1 and 4"}), 400

    # Check for duplicate email
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"success": False, "error": "Email is already registered"}), 400

    # Check for duplicate roll number
    if Student.query.filter_by(roll_number=data['roll_number']).first():
        return jsonify({"success": False, "error": "Roll number is already registered"}), 400

    # Create User and Profile
    new_user = User(
        name=data['name'],
        email=data['email'],
        role='student',
        is_active=True,
        is_blacklisted=False
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.flush() # Populate user.id

    new_profile = Student(
        user_id=new_user.id,
        roll_number=data['roll_number'],
        branch=data['branch'],
        year=year,
        cgpa=cgpa,
        phone=data['phone']
    )
    db.session.add(new_profile)
    db.session.commit()

    # Invalidate dashboard cache as student count changes
    cache.delete("admin_dashboard")

    return jsonify({
        "success": True,
        "data": {
            "message": "Student registered successfully",
            "user_id": new_user.id
        }
    }), 201


@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json() or {}
    
    required_fields = ['name', 'email', 'password', 'company_name', 'location', 'hr_contact', 'website', 'industry', 'description']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"success": False, "error": f"{field.replace('_', ' ').capitalize()} is required"}), 400

    if len(data['password']) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400

    # Check for duplicate email
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"success": False, "error": "Email is already registered"}), 400

    # Create User and Profile
    new_user = User(
        name=data['name'],
        email=data['email'],
        role='company',
        is_active=False, # Wait for admin approval
        is_blacklisted=False
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.flush()

    new_profile = Company(
        user_id=new_user.id,
        company_name=data['company_name'],
        location=data['location'], # Added location constraint per V2 PRD
        hr_contact=data['hr_contact'],
        website=data['website'],
        industry=data['industry'],
        description=data['description'],
        approval_status='pending'
    )
    db.session.add(new_profile)
    db.session.commit()

    # Invalidate dashboard cache
    cache.delete("admin_dashboard")

    return jsonify({
        "success": True,
        "data": {
            "message": "Registration submitted. Awaiting admin approval."
        }
    }), 201


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    if user.is_blacklisted:
        return jsonify({"success": False, "error": "Account is blacklisted"}), 403

    response_data = {
        "user": user.to_dict()
    }
    
    if user.role == 'student':
        if user.student_profile:
            response_data["profile"] = user.student_profile.to_dict()
    elif user.role == 'company':
        if user.company_profile:
            response_data["profile"] = user.company_profile.to_dict()

    return jsonify({
        "success": True,
        "data": response_data
    }), 200
