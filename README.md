# Placement Portal Application V2 (PPA V2)

PPA V2 is a campus recruitment platform built with a decoupled architecture featuring a Python Flask REST API backend, a responsive VueJS 3 Single Page Application (SPA) frontend, and background Celery worker engines coordinated via a Redis memory transport layer.

---

## Technical Stack & Frameworks

* **Backend API:** Python Flask (v3.x) with Flask-SQLAlchemy (v3.x)
* **Authentication:** JSON Web Tokens (JWT) via Flask-JWT-Extended
* **Database:** SQLite (SQLAlchemy models constructed programmatically)
* **Frontend UI:** Vue.js 3 SPA (loaded via CDN) with Axios for AJAX transactions
* **Styling System:** Bootstrap 5 (loaded via CDN) with custom CSS components
* **Caching Store:** Redis Cache via Flask-Caching
* **Background Jobs:** Celery Beat (scheduler) and Celery Workers using Redis as the message broker

---

## Core Feature Architecture

### 1. Role-Based Access Control (RBAC) & Gated Auth
* User credentials are encrypted and stored via `werkzeug.security`.
* Authentication uses JWT tokens signed on login. Custom python decorator guards (`@admin_required`, `@company_required`, `@student_required`) check the user's role before processing request payloads.
* Company registrations start as inactive and pending. Recruiters cannot log in until approved by the administrator.

### 2. Admin Moderation Panel
* Tracks system stats, pending registrations, and active drives.
* Provides search filters to discover companies or candidates.
* Allows administrators to approve/reject company requests and placement drives.
* Supports active user blacklisting, immediately invalidating access tokens and active sessions.

### 3. Recruiter Dashboard & 1:1 Placements
* Recruiters can manage profile info, location details, and post recruitment drives (subject to admin approval).
* Displays candidate list and supports selection lifecycle transitions (`Applied` -> `Shortlisted` -> `Interview` -> `Offer` -> `Placed` / `Rejected`).
* Automatically populates a matching row in the `placements` table once an application is set to `Placed`, enforcing a strict 1:1 recruitment constraint.

### 4. Student Panel & Gated Eligibility
* Students manage profile fields (phone, LinkedIn, skills, education, experience) and upload PDF/DOCX resumes (stored securely on the filesystem).
* Drive discoverer performs dynamic checks (CGPA requirements, eligible branches, active deadline, current year) to determine which drives a candidate can apply to.
* Rejects duplicate applications at both database constraint and routing layers.
* Renders a downloadable `.txt` offer letter for candidates who transition to `Offer` or `Placed` status.

### 5. Celery Background Tasks
* **Daily Beat Reminder:** Scans active approved drives closing in 3 days. Resolves which eligible students have not applied yet, issuing in-app notifications and email alerts.
* **Monthly Beat Report:** Executed on the 1st of every month, generating placement summaries (drives conducted, applications submitted, offers issued) and emailing them to the administrator.
* **User-Triggered CSV Export:** Asynchronously compiles a candidate's complete application history into a structured CSV, saving it to `backend/exports/` and emailing it as a secure attachment.

### 6. Redis Caching & Write-Purge Policy
* Caches heavy database GET endpoints (stats summaries, eligible student drives list, admin search arrays, company drives list) in Redis with a 180s/300s TTL.
* Coordinated invalidation clears matching cached keys (using `safe_delete_pattern`) on any database writes (profile edits, drive creation, drive approvals, application submissions, status updates).

---

## Installation & Running Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Initialize Database and Seed Admin Account
Runs the programmatic table setup and seeds the default administrator account (`admin@ppa.com` / `admin123`):
```bash
python backend/seed.py
```

### 3. Start Local Redis Server
Ensure Redis is running locally on port 6379:
```bash
redis-server
```

### 4. Run the Flask Web Application
Runs the server module:
```bash
python -m backend.app
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

### 5. Run Celery worker and scheduler
In separate terminal sessions, execute:
```bash
# Start worker
celery -A backend.tasks.celery_worker.celery worker --loglevel=info

# Start Beat scheduler
celery -A backend.tasks.celery_worker.celery beat --loglevel=info
```

---

## Verification & Test Suites

The application includes automated test suites under `backend/` to verify logic routes:
* **`test_auth.py`:** Asserts student registration, unapproved company blockages, database overrides, and active sessions.
* **`test_admin.py`:** Asserts stats gathering, account search, drive approvals, and blacklisting blocks.
* **`test_company.py`:** Asserts company profile CRUD, drive creations, applicant lifecycle, and 1:1 placement row creation.
* **`test_student.py`:** Asserts student profile updates, resume file handling, eligible drive filtering, and dynamic offer letter downloads.
* **`test_history.py`:** Asserts duplicate application blocks and role-scoped endpoints visibility limits.
* **`test_caching.py`:** Asserts Redis cache write keys, cache hits, and write-purge key invalidations.

Run tests using:
```bash
python backend/test_auth.py
python backend/test_admin.py
python backend/test_company.py
python backend/test_student.py
python backend/test_history.py
python backend/test_caching.py
```
