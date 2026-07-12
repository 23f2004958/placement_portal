from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import UniqueConstraint
from backend.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'admin' | 'company' | 'student'
    is_active = db.Column(db.Boolean, default=True)
    is_blacklisted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    company_profile = db.relationship('Company', backref='user', uselist=False, cascade="all, delete-orphan")
    student_profile = db.relationship('Student', backref='user', uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'is_blacklisted': self.is_blacklisted,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Company(db.Model):
    __tablename__ = 'companies'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    company_name = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(150), nullable=True) # Added per PRD V2
    hr_contact = db.Column(db.String(20))
    website = db.Column(db.String(150))
    industry = db.Column(db.String(100))
    description = db.Column(db.Text)
    approval_status = db.Column(db.String(20), default='pending') # 'pending' | 'approved' | 'rejected'
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    drives = db.relationship('PlacementDrive', backref='company', lazy='dynamic', cascade="all, delete-orphan")
    placements = db.relationship('Placement', backref='company', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'location': self.location,
            'hr_contact': self.hr_contact,
            'website': self.website,
            'industry': self.industry,
            'description': self.description,
            'approval_status': self.approval_status,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None
        }


class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    roll_number = db.Column(db.String(50), unique=True, nullable=False)
    branch = db.Column(db.String(50), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    cgpa = db.Column(db.Float, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    education = db.Column(db.Text, nullable=True) # Added per PRD V2
    skills = db.Column(db.Text, nullable=True)
    resume_filename = db.Column(db.String(250), nullable=True)
    experience = db.Column(db.Text, nullable=True) # Added per PRD V2
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    applications = db.relationship('Application', backref='student', lazy='dynamic', cascade="all, delete-orphan")
    placements = db.relationship('Placement', backref='student', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'roll_number': self.roll_number,
            'branch': self.branch,
            'year': self.year,
            'cgpa': self.cgpa,
            'phone': self.phone,
            'education': self.education,
            'skills': self.skills,
            'resume_filename': self.resume_filename,
            'experience': self.experience,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PlacementDrive(db.Model):
    __tablename__ = 'placement_drives'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False) # Renamed to 'title' per PRD V2
    description = db.Column(db.Text) # Renamed to 'description' per PRD V2
    eligible_branches = db.Column(db.String(250)) # Comma separated e.g. "CSE,ECE,IT"
    min_cgpa = db.Column(db.Float)
    eligible_year = db.Column(db.Integer) # eligible_year: e.g. 4 or 0 (All)
    salary = db.Column(db.Float) # Renamed to 'salary' per PRD V2 (equivalent to LPA)
    deadline = db.Column(db.DateTime, nullable=False) # Renamed to 'deadline' per PRD V2
    drive_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='pending') # 'pending' | 'approved' | 'closed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    applications = db.relationship('Application', backref='drive', lazy='dynamic', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'title': self.title,
            'job_title': self.title,
            'description': self.description,
            'job_description': self.description,
            'eligible_branches': self.eligible_branches,
            'min_cgpa': self.min_cgpa,
            'eligible_year': self.eligible_year,
            'salary': self.salary,
            'package_lpa': self.salary,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'application_deadline': self.deadline.isoformat() if self.deadline else None,
            'drive_date': self.drive_date.isoformat() if self.drive_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Application(db.Model):
    __tablename__ = 'applications'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    drive_id = db.Column(db.Integer, db.ForeignKey('placement_drives.id'), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow) # Renamed to 'date' per PRD V2
    status = db.Column(db.String(20), default='Applied') # 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Rejected' | 'Placed'
    interview_date = db.Column(db.DateTime, nullable=True)
    remarks = db.Column(db.Text, nullable=True)

    # Relationship
    placement = db.relationship('Placement', backref='application', uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('student_id', 'drive_id', name='uq_student_drive_v2'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'drive_id': self.drive_id,
            'date': self.date.isoformat() if self.date else None,
            'applied_at': self.date.isoformat() if self.date else None,
            'status': self.status,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'remarks': self.remarks
        }


class Placement(db.Model):
    __tablename__ = 'placements'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), unique=True, nullable=True)
    position = db.Column(db.String(150), nullable=False)
    salary = db.Column(db.Float, nullable=False)
    joining_date = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'company_id': self.company_id,
            'application_id': self.application_id,
            'position': self.position,
            'salary': self.salary,
            'joining_date': self.joining_date.isoformat() if self.joining_date else None
        }


class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Aliases for V1 routes compatibility during V2 migration
StudentProfile = Student
CompanyProfile = Company

