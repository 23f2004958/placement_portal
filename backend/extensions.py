from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_caching import Cache
from celery import Celery

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
cache = Cache()

# Create a Celery instance that can be imported by tasks and configured in app factory.
celery_app = Celery("placement_portal")
