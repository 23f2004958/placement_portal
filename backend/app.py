import os
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from backend.config import Config
from backend.extensions import db, jwt, mail, cache, celery_app

def create_app(config_class=Config):
    # Set templates and static files correctly
    app = Flask(
        __name__,
        static_folder='../frontend',
        static_url_path='/frontend',
        template_folder='templates'
    )
    
    app.config.from_object(config_class)
    
    # Ensure files directories are absolute
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app.config['UPLOAD_FOLDER'] = os.path.join(project_root, 'backend', 'uploads', 'resumes')
    app.config['EXPORT_FOLDER'] = os.path.join(project_root, 'backend', 'exports')
    
    # Ensure they exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cache.init_app(app)

    # Enable CORS for localhost:5000 development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Import and register blueprints
    from backend.routes.auth import auth_bp
    from backend.routes.admin import admin_bp
    from backend.routes.company import company_bp
    from backend.routes.student import student_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(company_bp, url_prefix='/api/company')
    app.register_blueprint(student_bp, url_prefix='/api/student')

    # Configure Celery app with Flask context
    celery_app.conf.update(
        broker_url=app.config['CELERY_BROKER_URL'],
        result_backend=app.config['CELERY_RESULT_BACKEND'],
        timezone='UTC'
    )
    
    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
                
    celery_app.Task = ContextTask

    # Static uploads serving route
    @app.route('/uploads/resumes/<filename>')
    def serve_resume(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Wildcard catch-all route for SPA router serving templates/index.html
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        # Ignore static requests that fall through
        if path.startswith('frontend/') or path.startswith('api/') or path.startswith('uploads/'):
            return jsonify({"success": False, "error": "Not Found"}), 404
        return render_template('index.html')

    # Automatically create tables and seed default admin on startup if they don't exist
    with app.app_context():
        db.create_all()
        from backend.models import User
        admin_exists = User.query.filter_by(role='admin').first()
        if not admin_exists:
            from werkzeug.security import generate_password_hash
            admin_user = User(
                name='Portal Administrator',
                email='admin@ppa.com',
                password_hash=generate_password_hash('admin123'),
                role='admin',
                is_active=True,
                is_blacklisted=False
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Auto-seeded default admin account: admin@ppa.com / admin123")

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
