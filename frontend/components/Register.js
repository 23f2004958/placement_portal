window.RegisterComponent = {
  props: ['type'], // 'student' or 'company'
  template: `
    <div class="container d-flex align-items-center justify-content-center py-5" style="min-height: 80vh;">
      <div class="card shadow-lg border-0" style="max-width: 580px; width: 100%; border-radius: 16px;">
        <div class="card-body p-5">
          <div class="text-center mb-4">
            <div class="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style="width: 60px; height: 60px;">
              <i class="bi" :class="type === 'student' ? 'bi-person-badge-fill' : 'bi-building-fill'"></i>
            </div>
            <h2 class="fw-bold text-dark">{{ type === 'student' ? 'Student Registration' : 'Company Registration' }}</h2>
            <p class="text-muted">Create an account to access the Placement Portal</p>
          </div>

          <div v-if="error" class="alert alert-danger d-flex align-items-center py-2" role="alert" style="border-radius: 8px; font-size: 0.9rem;">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{{ error }}</div>
          </div>

          <div v-if="successMsg" class="alert alert-success d-flex align-items-center py-3" role="alert" style="border-radius: 8px;">
            <i class="bi bi-check-circle-fill me-2 fs-4"></i>
            <div>
              <h6 class="alert-heading fw-bold mb-1">Registration Successful</h6>
              <p class="mb-0" style="font-size: 0.9rem;">{{ successMsg }}</p>
            </div>
          </div>

          <!-- STUDENT FORM -->
          <form v-if="type === 'student' && !successMsg" @submit.prevent="registerStudent" class="needs-validation" novalidate>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Full Name *</label>
                <input type="text" class="form-control" v-model="student.name" required placeholder=" ">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Work/Personal Email *</label>
                <input type="email" class="form-control" v-model="student.email" required placeholder=" ">
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Password * (Min 8 chars)</label>
                <input type="password" class="form-control" v-model="student.password" required placeholder=" ">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Confirm Password *</label>
                <input type="password" class="form-control" v-model="student.confirm_password" required placeholder=" ">
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Roll Number *</label>
                <input type="text" class="form-control" v-model="student.roll_number" required placeholder=" ">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Branch *</label>
                <select class="form-select" v-model="student.branch" required>
                  <option value="">Select Branch</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>
            </div>

            <div class="row">
              <div class="col-md-4 mb-3">
                <label class="form-label text-secondary fw-semibold small">Current Year (1-4) *</label>
                <input type="number" class="form-control" min="1" max="4" v-model.number="student.year" required placeholder=" ">
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label text-secondary fw-semibold small">CGPA (0.0-10.0) *</label>
                <input type="number" step="0.01" min="0" max="10" class="form-control" v-model.number="student.cgpa" required placeholder=" ">
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label text-secondary fw-semibold small">Phone (10 digits) *</label>
                <input type="tel" class="form-control" v-model="student.phone" required placeholder=" ">
              </div>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary w-100 py-3 mt-3 d-flex align-items-center justify-content-center" 
              :disabled="loading"
              style="border-radius: 8px; font-weight: 600;"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <span>{{ loading ? 'Creating Account...' : 'Register Student' }}</span>
            </button>
          </form>

          <!-- COMPANY FORM -->
          <form v-if="type === 'company' && !successMsg" @submit.prevent="registerCompany" class="needs-validation" novalidate>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Contact Person Name *</label>
                <input type="text" class="form-control" v-model="company.name" required placeholder=" ">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Work Email *</label>
                <input type="email" class="form-control" v-model="company.email" required placeholder=" ">
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Password * (Min 8 chars)</label>
                <input type="password" class="form-control" v-model="company.password" required placeholder=" ">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Confirm Password *</label>
                <input type="password" class="form-control" v-model="company.confirm_password" required placeholder=" ">
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">Company Name *</label>
                <input type="text" class="form-control" v-model="company.company_name" required placeholder=" ">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label text-secondary fw-semibold small">HR Contact Number *</label>
                <input type="tel" class="form-control" v-model="company.hr_contact" required placeholder=" ">
              </div>
            </div>

            <div class="row">
              <div class="col-md-4 mb-3">
                <label class="form-label text-secondary fw-semibold small">Website URL *</label>
                <input type="url" class="form-control" v-model="company.website" required placeholder=" ">
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label text-secondary fw-semibold small">Location *</label>
                <input type="text" class="form-control" v-model="company.location" required placeholder=" ">
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label text-secondary fw-semibold small">Industry *</label>
                <select class="form-select" v-model="company.industry" required>
                  <option value="">Select Industry</option>
                  <option value="IT / Software">IT / Software</option>
                  <option value="Electronics / Core">Electronics / Core</option>
                  <option value="Consulting / Finance">Consulting / Finance</option>
                  <option value="Automobile / Mechanical">Automobile / Mechanical</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="EdTech / Research">EdTech / Research</option>
                </select>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label text-secondary fw-semibold small">Company Description *</label>
              <textarea class="form-control" rows="3" v-model="company.description" required placeholder="Describe the company's domain, vision and team..."></textarea>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary w-100 py-3 mt-2 d-flex align-items-center justify-content-center" 
              :disabled="loading"
              style="border-radius: 8px; font-weight: 600;"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <span>{{ loading ? 'Submitting Application...' : 'Register Company' }}</span>
            </button>
          </form>

          <hr class="my-4">

          <div class="text-center" style="font-size: 0.9rem;">
            <span class="text-muted">Already have an account?</span>
            <a href="#login" class="text-primary text-decoration-none fw-semibold ms-1">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      student: {
        name: '',
        email: '',
        password: '',
        confirm_password: '',
        roll_number: '',
        branch: '',
        year: '',
        cgpa: '',
        phone: ''
      },
      company: {
        name: '',
        email: '',
        password: '',
        confirm_password: '',
        company_name: '',
        location: '',
        hr_contact: '',
        website: '',
        industry: '',
        description: ''
      },
      error: '',
      successMsg: '',
      loading: false
    };
  },
  watch: {
    // Reset state when toggling registration types
    type() {
      this.error = '';
      this.successMsg = '';
      this.loading = false;
    }
  },
  methods: {
    validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    registerStudent() {
      this.error = '';
      const s = this.student;
      
      // Validations
      if (!s.name || !s.email || !s.password || !s.confirm_password || !s.roll_number || !s.branch || !s.year || s.cgpa === '' || !s.phone) {
        this.error = 'All fields marked with * are required';
        return;
      }
      if (!this.validateEmail(s.email)) {
        this.error = 'Please enter a valid email address';
        return;
      }
      if (s.password.length < 8) {
        this.error = 'Password must be at least 8 characters long';
        return;
      }
      if (s.password !== s.confirm_password) {
        this.error = 'Passwords do not match';
        return;
      }
      if (s.cgpa < 0.0 || s.cgpa > 10.0) {
        this.error = 'CGPA must be between 0.0 and 10.0';
        return;
      }
      if (s.year < 1 || s.year > 4) {
        this.error = 'Year must be between 1 and 4';
        return;
      }
      if (s.phone.length !== 10 || !/^\d+$/.test(s.phone)) {
        this.error = 'Phone number must be exactly 10 digits';
        return;
      }

      this.loading = true;
      axios.post('/api/auth/register/student', s)
      .then(response => {
        this.successMsg = 'Account created successfully! You can now log in.';
        setTimeout(() => {
          window.location.hash = '#login';
        }, 3000);
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = 'Registration failed. Please check inputs and try again.';
        }
      })
      .finally(() => {
        this.loading = false;
      });
    },
    registerCompany() {
      this.error = '';
      const c = this.company;

      if (!c.name || !c.email || !c.password || !c.confirm_password || !c.company_name || !c.location || !c.hr_contact || !c.website || !c.industry || !c.description) {
        this.error = 'All fields marked with * are required';
        return;
      }
      if (!this.validateEmail(c.email)) {
        this.error = 'Please enter a valid email address';
        return;
      }
      if (c.password.length < 8) {
        this.error = 'Password must be at least 8 characters long';
        return;
      }
      if (c.password !== c.confirm_password) {
        this.error = 'Passwords do not match';
        return;
      }
      if (c.hr_contact.length !== 10 || !/^\d+$/.test(c.hr_contact)) {
         this.error = 'HR Contact Number must be exactly 10 digits';
         return;
      }

      this.loading = true;
      axios.post('/api/auth/register/company', c)
      .then(response => {
        this.successMsg = 'Your registration request has been submitted successfully. It is currently under review. The Admin will approve it shortly.';
        setTimeout(() => {
          window.location.hash = '#login';
        }, 5000);
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = 'Registration failed. Please check inputs and try again.';
        }
      })
      .finally(() => {
        this.loading = false;
      });
    }
  }
};
