window.LoginComponent = {
  template: `
    <div class="container d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card shadow-lg border-0" style="max-width: 960px; width: 100%; border-radius: 20px; overflow: hidden;">
        <div class="row g-0">
          
          <!-- Left side: Clean minimal brand panel (hidden on mobile) -->
          <div class="col-lg-6 d-none d-lg-flex flex-column justify-content-center align-items-center p-5 text-white text-center" 
               style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
            <div class="d-flex flex-column align-items-center gap-3">
              <i class="bi bi-mortarboard-fill text-primary" style="font-size: 3.5rem;"></i>
              <h1 class="fw-bold mb-1" style="font-size: 2.5rem; letter-spacing: -0.5px;">PPA <span class="text-primary">Cell</span></h1>
              <p class="text-white text-opacity-75 fs-5 mb-0" style="font-weight: 300;">Institute Recruitment & Placement Hub</p>
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
                  placeholder=" " 
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
                  placeholder=" " 
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
