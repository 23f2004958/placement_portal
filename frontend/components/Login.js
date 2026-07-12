window.LoginComponent = {
  template: `
    <div class="container d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card shadow-lg border-0" style="max-width: 960px; width: 100%; border-radius: 20px; overflow: hidden;">
        <div class="row g-0">
          
          <!-- Left side: Marketing panel (hidden on mobile, show on large) -->
          <div class="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white" 
               style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
            <div>
              <div class="d-flex align-items-center gap-2 mb-4">
                <i class="bi bi-mortarboard-fill text-primary fs-2"></i>
                <span class="fs-4 fw-bold">PPA <span class="text-primary">Cell</span></span>
              </div>
              <h2 class="fw-bold mb-3" style="line-height: 1.3;">Institute Recruitment & Placement Hub</h2>
              <p class="text-white text-opacity-75 mb-4">Connecting IIT-M students with leading recruitment partners for summer internships and final placements.</p>
              
              <div class="d-flex flex-column gap-3 mb-4">
                <div class="d-flex align-items-start gap-3">
                  <div class="bg-primary bg-opacity-20 text-primary rounded p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                    <i class="bi bi-rocket-takeoff-fill"></i>
                  </div>
                  <div>
                    <h6 class="fw-bold mb-1">Instant Drive Discovery</h6>
                    <p class="text-white text-opacity-50 small mb-0">Browse drives filtered dynamically by your CGPA and branch eligibility.</p>
                  </div>
                </div>
                
                <div class="d-flex align-items-start gap-3">
                  <div class="bg-primary bg-opacity-20 text-primary rounded p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                    <i class="bi bi-shield-check"></i>
                  </div>
                  <div>
                    <h6 class="fw-bold mb-1">Gated Registrations</h6>
                    <p class="text-white text-opacity-50 small mb-0">Admin approved recruiter accounts ensure verified drive listings.</p>
                  </div>
                </div>
                
                <div class="d-flex align-items-start gap-3">
                  <div class="bg-primary bg-opacity-20 text-primary rounded p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                    <i class="bi bi-file-earmark-pdf-fill"></i>
                  </div>
                  <div>
                    <h6 class="fw-bold mb-1">Automated Placements</h6>
                    <p class="text-white text-opacity-50 small mb-0">Instant placement logging, status trackers, and offer downloads.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="border-top border-white border-opacity-10 pt-4 d-flex justify-content-between align-items-center">
              <div>
                <span class="d-block fw-bold fs-5 text-primary">150+</span>
                <span class="text-white text-opacity-50 small">Recruiters</span>
              </div>
              <div>
                <span class="d-block fw-bold fs-5 text-primary">98%</span>
                <span class="text-white text-opacity-50 small">Placement Rate</span>
              </div>
              <div>
                <span class="d-block fw-bold fs-5 text-primary">Celery</span>
                <span class="text-white text-opacity-50 small">Background Jobs</span>
              </div>
            </div>
          </div>

          <!-- Right side: Login form -->
          <div class="col-lg-6 p-5 bg-white d-flex flex-column justify-content-center">
            <div class="text-center mb-4">
              <h3 class="fw-bold text-dark mb-1">Welcome Back</h3>
              <p class="text-muted small">Sign in to access your dashboard</p>
            </div>

            <!-- Visual Role Toggle -->
            <div class="btn-group w-100 mb-4" role="group" aria-label="Visual Role Toggle">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-primary py-2" 
                :class="{ active: selectedRole === 'student' }"
                @click="selectedRole = 'student'"
                style="border-radius: 8px 0 0 8px; font-weight: 500;"
              >Student</button>
              <button 
                type="button" 
                class="btn btn-sm btn-outline-primary py-2" 
                :class="{ active: selectedRole === 'company' }"
                @click="selectedRole = 'company'"
                style="font-weight: 500;"
              >Company</button>
              <button 
                type="button" 
                class="btn btn-sm btn-outline-primary py-2" 
                :class="{ active: selectedRole === 'admin' }"
                @click="selectedRole = 'admin'"
                style="border-radius: 0 8px 8px 0; font-weight: 500;"
              >Admin</button>
            </div>

            <div v-if="error" class="alert alert-danger d-flex align-items-center py-2 mb-3" role="alert" style="border-radius: 8px; font-size: 0.85rem;">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{{ error }}</div>
            </div>

            <form @submit.prevent="handleLogin" class="needs-validation" novalidate>
              <div class="form-floating mb-3">
                <input 
                  type="email" 
                  class="form-control" 
                  id="loginEmail" 
                  placeholder="name@example.com" 
                  v-model="email" 
                  required
                  style="border-radius: 8px;"
                >
                <label for="loginEmail">Email address</label>
              </div>
              <div class="form-floating mb-4">
                <input 
                  type="password" 
                  class="form-control" 
                  id="loginPassword" 
                  placeholder="Password" 
                  v-model="password" 
                  required
                  style="border-radius: 8px;"
                >
                <label for="loginPassword">Password</label>
              </div>

              <button 
                type="submit" 
                class="btn btn-primary w-100 py-3 mb-3 d-flex align-items-center justify-content-center" 
                :disabled="loading"
                style="border-radius: 8px; font-weight: 600;"
              >
                <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
              </button>
            </form>

            <div class="text-center mt-3" style="font-size: 0.9rem;">
              <div class="text-muted small">Don't have an account?</div>
              <div class="mt-2 d-flex justify-content-center gap-3">
                <a href="#register/student" class="text-primary text-decoration-none fw-semibold">Register as Student</a>
                <span class="text-muted">|</span>
                <a href="#register/company" class="text-primary text-decoration-none fw-semibold">Register as Company</a>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      email: '',
      password: '',
      selectedRole: 'student', // purely visual toggle
      error: '',
      loading: false
    };
  },
  methods: {
    handleLogin() {
      this.error = '';
      
      // Basic HTML5 validation
      if (!this.email || !this.password) {
        this.error = 'All fields are required';
        return;
      }
      if (this.password.length < 8) {
        this.error = 'Password must be at least 8 characters';
        return;
      }

      this.loading = true;
      
      axios.post('/api/auth/login', {
        email: this.email,
        password: this.password
      })
      .then(response => {
        const data = response.data.data;
        // Save token and user details
        localStorage.setItem('ppa_token', data.access_token);
        localStorage.setItem('ppa_user', JSON.stringify({
          id: data.user_id,
          name: data.name,
          role: data.role,
          email: this.email
        }));
        
        // Setup axios defaults headers dynamically
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + data.access_token;
        
        // Update App root state
        this.$emit('auth-success', {
          token: data.access_token,
          user: {
            id: data.user_id,
            name: data.name,
            role: data.role,
            email: this.email
          }
        });
        
        // Route to dashboard
        if (data.role === 'admin') {
          window.location.hash = '#admin-dashboard';
        } else if (data.role === 'company') {
          window.location.hash = '#company-dashboard';
        } else {
          window.location.hash = '#student-dashboard';
        }
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = 'Failed to sign in. Please try again.';
        }
      })
      .finally(() => {
        this.loading = false;
      });
    }
  }
};
