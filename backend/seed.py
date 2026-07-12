import sys
import os

# Add parent directory to path so we can import backend packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db
from backend.models import User

def seed_database():
    app = create_app()
    with app.app_context():
        print("Dropping all existing tables to refresh V2 schema...")
        db.drop_all()
        
        print("Creating all tables in database...")
        db.create_all()
        
        print("Checking if admin user exists...")
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            print("Admin user not found. Seeding admin user...")
            admin = User(
                name="Admin",
                email="admin@ppa.com",
                role="admin",
                is_active=True,
                is_blacklisted=False
            )
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print("Admin user seeded successfully!")
        else:
            print("Admin user already exists.")
            
        print("Database seeding completed.")

if __name__ == "__main__":
    seed_database()
