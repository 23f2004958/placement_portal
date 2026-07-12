window.CreateDriveComponent = {
  template: `
    <div>
      <!-- Back button -->
      <div class="mb-4">
        <a href="#company-dashboard" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
        </a>
      </div>

      <div class="card border-0 shadow-sm mx-auto" style="max-width: 720px; border-radius: 16px;">
        <div class="card-body p-5">
          <h3 class="fw-bold text-dark mb-1">Post Placement Drive</h3>
          <p class="text-muted mb-4">Post a new job profile. Postings are pending admin approval before going live to students.</p>

          <div v-if="error" class="alert alert-danger py-2 small" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
          </div>

          <div v-if="successMsg" class="alert alert-success py-3" role="alert" style="border-radius: 8px;">
            <i class="bi bi-check-circle-fill me-2 fs-5"></i>
            <strong>Success!</strong> {{ successMsg }}
          </div>

          <form @submit.prevent="handleSubmit" class="needs-validation" novalidate v-if="!successMsg">
            <div class="mb-3">
              <label class="form-label text-secondary fw-semibold small">Job Title *</label>
              <input type="text" class="form-control" v-model="form.job_title" required placeholder="Software Engineer (Backend)">
            </div>

            <div class="mb-3">
              <label class="form-label text-secondary fw-semibold small">Job Description *</label>
              <textarea class="form-control" rows="4" v-model="form.job_description" required placeholder="Describe responsibilities, role scope, and expectations..."></textarea>
            </div>

            <!-- Branch multi-select checkboxes -->
            <div class="mb-3">
              <label class="form-label text-secondary fw-semibold small d-block">Eligible Branches *</label>
              <div class="d-flex flex-wrap gap-3 mt-1">
                <div class="form-check" v-for="br in branchesList" :key="br">
                  <input class="form-check-input" type="checkbox" :id="'chk_' + br" :value="br" v-model="selectedBranches">
                  <label class="form-check-label text-dark" :for="'chk_' + br">{{ br }}</label>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Minimum CGPA (0.0-10.0) *</label>
                <input type="number" step="0.1" min="0" max="10" class="form-control" v-model.number="form.min_cgpa" required placeholder="7.5">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Eligible Year *</label>
                <select class="form-select" v-model="form.eligible_year" required>
                  <option value="All">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Package Offered (in LPA) *</label>
                <input type="number" step="0.1" min="0.1" class="form-control" v-model.number="form.package_lpa" required placeholder="12.5">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Tentative Drive Date (Optional)</label>
                <input type="datetime-local" class="form-control" v-model="form.drive_date">
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label text-secondary fw-semibold small">Application Deadline *</label>
              <input type="datetime-local" class="form-control" v-model="form.application_deadline" required>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center" 
              :disabled="loading"
              style="border-radius: 8px; font-weight: 600;"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
              <span>{{ loading ? 'Submitting Drive...' : 'Submit Placement Drive' }}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        job_title: '',
        job_description: '',
        min_cgpa: '',
        eligible_year: 'All',
        package_lpa: '',
        drive_date: '',
        application_deadline: ''
      },
      selectedBranches: [],
      branchesList: ['CSE', 'ECE', 'IT', 'EEE', 'MECH', 'CIVIL'],
      error: '',
      successMsg: '',
      loading: false
    };
  },
  methods: {
    handleSubmit() {
      this.error = '';
      const f = this.form;
      
      // Validations
      if (!f.job_title || !f.job_description || this.selectedBranches.length === 0 || f.min_cgpa === '' || !f.eligible_year || f.package_lpa === '' || !f.application_deadline) {
        this.error = 'All required fields (*) must be non-empty.';
        return;
      }

      if (f.min_cgpa < 0.0 || f.min_cgpa > 10.0) {
        this.error = 'CGPA must be between 0.0 and 10.0.';
        return;
      }

      if (f.package_lpa <= 0) {
        this.error = 'Package in LPA must be a positive number.';
        return;
      }

      const deadlineDate = new Date(f.application_deadline);
      if (deadlineDate <= new Date()) {
        this.error = 'Application deadline must be a future date.';
        return;
      }

      this.loading = true;
      
      // Parse branches to comma-separated string
      const branchesString = this.selectedBranches.join(',');
      
      // Parse eligible year
      const eligibleYearVal = f.eligible_year === 'All' ? 'All' : parseInt(f.eligible_year);

      axios.post('/api/company/drives', {
        job_title: f.job_title,
        job_description: f.job_description,
        eligible_branches: branchesString,
        min_cgpa: f.min_cgpa,
        eligible_year: eligibleYearVal,
        package_lpa: f.package_lpa,
        application_deadline: f.application_deadline,
        drive_date: f.drive_date || null
      })
      .then(() => {
        this.successMsg = 'Placement drive posted successfully! Coordinators will review and approve it shortly.';
        setTimeout(() => {
          window.location.hash = '#company-dashboard';
        }, 3000);
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = 'Failed to create placement drive. Please try again.';
        }
      })
      .finally(() => {
        this.loading = false;
      });
    }
  }
};
