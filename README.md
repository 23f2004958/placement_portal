# Placement Portal Application V2 (PPA V2)

PPA V2 is a full-stack campus placement management application featuring Admin, Company, and Student roles.

## Collaborator Setup (Milestone 0)
- **Collaborator Account:** `MADII-cs2006` has been documented and requested to be added as a collaborator for evaluation on the project repository.

## Tech Stack
- **Backend:** Python Flask API with SQLAlchemy ORM and SQLite.
- **Frontend:** Vue.js 3 via CDN, Axios, and Bootstrap 5 for styling.
- **Caching:** Redis.
- **Background Jobs:** Celery (message broker: Redis) & Celery Beat (scheduler).

## How to Run & Test
### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Redis Server
```bash
redis-server
```

### 3. Initialize DB and Seed Admin
```bash
python backend/seed.py
```

### 4. Start Flask Backend
```bash
python backend/app.py
```

### 5. Start Celery Worker
From `backend` directory:
```bash
celery -A tasks.celery_worker.celery worker --loglevel=info
```

### 6. Start Celery Beat
From `backend` directory:
```bash
celery -A tasks.celery_worker.celery beat --loglevel=info
```
