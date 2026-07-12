window.LoginComponent = {
  template: `
    <div class="container d-flex align-items-center justify-content-center" style="min-height: 80vh;">
      <div class="card shadow-lg border-0" style="max-width: 420px; width: 100%; border-radius: 16px;">
        <div class="card-body p-5">
          <div class="text-center mb-4">
            <div class="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style="width: 60px; height: 60px;">
              <i class="bi bi-shield-lock-fill fs-2"></i>
            </div>
            <h2 class="fw-bold text-dark">Welcome Back</h2>
            <p class="text-muted">Sign in to your Placement Portal account</p>
          </div>

          <!-- Visual Role Toggle -->
          <div class="btn-group w-100 mb-4" role="group" aria-label="Visual Role Toggle">
            <button 
              type="button" 
              class="btn btn-sm btn-outline-primary" 
              :class="{ active: selectedRole === 'student' }"
              @click="selectedRole = 'student'"
            >Student</button>
            <button 
              type="button" 
              class="btn btn-sm btn-outline-primary" 
              :class="{ active: selectedRole === 'company' }"
              @click="selectedRole = 'company'"
            >Company</button>
            <button 
              type="button" 
              class="btn btn-sm btn-outline-primary" 
              :class="{ active: selectedRole === 'admin' }"
              @click="selectedRole = 'admin'"
            >Admin</button>
          </div>

          <div v-if="error" class="alert alert-danger d-flex align-items-center py-2" role="alert" style="border-radius: 8px; font-size: 0.9rem;">
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
            <div class="form-floating mb-3">
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
            <div class="text-muted">Don't have an account?</div>
            <div class="mt-1">
              <a href="#register/student" class="text-primary text-decoration-none fw-semibold">Register as Student</a>
              <span class="mx-2 text-muted">|</span>
              <a href="#register/company" class="text-primary text-decoration-none fw-semibold">Register as Company</a>
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
