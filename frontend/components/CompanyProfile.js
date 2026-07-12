window.CompanyProfileComponent = {
  template: `
    <div class="container py-2" style="max-width: 800px;">
      <!-- Back button -->
      <div class="mb-4">
        <a href="#company-dashboard" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
        </a>
      </div>

      <div class="card border-0 shadow-sm" style="border-radius: 16px;">
        <div class="card-body p-5">
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-inline-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
              <i class="bi bi-building fs-2"></i>
            </div>
            <div>
              <h3 class="fw-bold text-dark mb-1">Company Profile</h3>
              <p class="text-muted mb-0">View and update your corporate details and contact info.</p>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger py-2 small" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
          </div>

          <div v-if="successMsg" class="alert alert-success py-2 small" role="alert">
            <i class="bi bi-check-circle-fill me-2"></i>{{ successMsg }}
          </div>

          <form @submit.prevent="updateProfile" class="needs-validation" novalidate>
            <!-- Read-only Company Name and email -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label text-secondary fw-semibold small">Company Name</label>
                <input type="text" class="form-control bg-light" :value="profile.company_name" readonly>
              </div>
              <div class="col-md-6">
                <label class="form-label text-secondary fw-semibold small">Approval Status</label>
                <div class="form-control bg-light fw-semibold" :class="profile.approval_status === 'approved' ? 'text-success' : 'text-warning'">
                  {{ profile.approval_status.toUpperCase() }}
                </div>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label text-secondary fw-semibold small">HR Contact Number *</label>
                <input type="tel" class="form-control" v-model="profile.hr_contact" required placeholder="9876543210">
              </div>
              <div class="col-md-6">
                <label class="form-label text-secondary fw-semibold small">Website URL *</label>
                <input type="url" class="form-control" v-model="profile.website" required placeholder="https://example.com">
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label text-secondary fw-semibold small">Location *</label>
                <input type="text" class="form-control" v-model="profile.location" required placeholder="Mumbai, India">
              </div>
              <div class="col-md-6">
                <label class="form-label text-secondary fw-semibold small">Industry *</label>
                <select class="form-select" v-model="profile.industry" required>
                  <option value="IT / Software">IT / Software</option>
                  <option value="Electronics / Core">Electronics / Core</option>
                  <option value="Consulting / Finance">Consulting / Finance</option>
                  <option value="Automobile / Mechanical">Automobile / Mechanical</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="EdTech / Research">EdTech / Research</option>
                </select>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label text-secondary fw-semibold small">Company Description *</label>
              <textarea class="form-control" rows="4" v-model="profile.description" required></textarea>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center" 
              :disabled="loading"
              style="border-radius: 8px; font-weight: 600;"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
              <span>{{ loading ? 'Saving Profile...' : 'Save Changes' }}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      profile: {
        company_name: '',
        hr_contact: '',
        website: '',
        location: '',
        industry: '',
        description: '',
        approval_status: 'pending'
      },
      loading: false,
      error: '',
      successMsg: ''
    };
  },
  mounted() {
    this.fetchProfile();
  },
  methods: {
    fetchProfile() {
      this.loading = true;
      this.error = '';
      axios.get('/api/company/profile')
      .then(response => {
        this.profile = response.data.data;
      })
      .catch(err => {
        this.error = 'Failed to load profile details.';
      })
      .finally(() => {
        this.loading = false;
      });
    },
    updateProfile() {
      this.error = '';
      this.successMsg = '';
      const p = this.profile;

      if (!p.hr_contact || !p.website || !p.location || !p.industry || !p.description) {
        this.error = 'All fields marked with * are required.';
        return;
      }
      if (p.hr_contact.length !== 10 || !/^\d+$/.test(p.hr_contact)) {
        this.error = 'HR Contact Number must be exactly 10 digits.';
        return;
      }

      this.loading = true;
      axios.put('/api/company/profile', {
        hr_contact: p.hr_contact,
        website: p.website,
        location: p.location,
        industry: p.industry,
        description: p.description
      })
      .then(response => {
        this.successMsg = 'Profile updated successfully!';
        this.profile = response.data.data;
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = 'Failed to update profile details.';
        }
      })
      .finally(() => {
        this.loading = false;
      });
    }
  }
};
