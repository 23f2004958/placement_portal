import sys
import os

# Add the base directory of the project to the path to enable absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app import create_app
from backend.extensions import celery_app
from celery.schedules import crontab

# Initialize the Flask application
flask_app = create_app()

# Expose 'celery' instance so running: celery -A tasks.celery_worker.celery works
celery = celery_app

# Configure Celery Beat schedule
celery.conf.beat_schedule = {
    'send-daily-deadline-reminders': {
        'task': 'send_deadline_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    'send-monthly-activity-report': {
        'task': 'send_monthly_report',
        'schedule': crontab(day_of_month=1, hour=6, minute=0),
    },
}

# Auto-import tasks modules so they are registered on startup
celery.conf.imports = (
    'backend.tasks.reminders',
    'backend.tasks.monthly_report',
    'backend.tasks.export_csv',
)
