import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ppa-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///placement_portal.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ppa-jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_TYPE = 'RedisCache'
    CACHE_REDIS_URL = REDIS_URL
    CACHE_DEFAULT_TIMEOUT = 300
    
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/1')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
    
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'your-email@gmail.com')   # replace with env var
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'your-app-password')       # replace with env var
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', f'PPA System <{MAIL_USERNAME}>')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@ppa.com')
    
    # We want these relative to the workspace, but we will handle full resolution in app.py
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads/resumes')
    EXPORT_FOLDER = os.environ.get('EXPORT_FOLDER', 'exports')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
