window.DriveListComponent = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Browse Placement Drives</h2>
          <p class="text-muted mb-0">Discover and apply to active job postings</p>
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="card border-0 shadow-sm p-4 mb-4" style="border-radius: 16px;">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label text-secondary small fw-semibold">Search Keywords</label>
            <div class="input-group">
              <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-search"></i></span>
              <input 
                type="text" 
                class="form-control border-start-0 ps-0" 
                placeholder="Search job title or company name..." 
                v-model="search"
                @input="fetchDrives"
              >
            </div>
          </div>
          
          <div class="col-md-3">
            <label class="form-label text-secondary small fw-semibold">Filter by Branch</label>
            <select class="form-select" v-model="branch" @change="fetchDrives">
              <option value="">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="IT">IT</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>
          </div>

          <div class="col-md-5">
            <label class="form-label text-secondary small fw-semibold d-flex justify-content-between">
              <span>Maximum CGPA Requirement</span>
              <strong class="text-primary">{{ minCgpa }} CGPA</strong>
            </label>
            <div class="d-flex align-items-center mt-2">
              <span class="text-muted small me-2">0.0</span>
              <input 
                type="range" 
                class="form-range" 
                min="0" 
                max="10" 
                step="0.5" 
                v-model.number="minCgpa" 
                @input="fetchDrives"
              >
              <span class="text-muted small ms-2">10.0</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Drives Grid -->
      <div class="row g-4">
        <div class="col-md-6 col-lg-4" v-for="dr in drives" :key="dr.id">
          <div class="card border-0 shadow-sm h-100 p-4 d-flex flex-column" style="border-radius: 16px;">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span class="badge bg-success text-white py-1 px-2 rounded mb-2">{{ dr.package_lpa }} LPA</span>
                <h5 class="fw-bold text-dark mb-0">{{ dr.job_title }}</h5>
                <span class="text-secondary small">{{ dr.company_name }}</span>
              </div>
              <div class="text-end">
                <span class="badge" :class="dr.is_eligible ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'">
                  {{ dr.is_eligible ? 'Eligible' : 'Not Eligible' }}
                </span>
              </div>
            </div>

            <!-- Description summary -->
            <p class="text-muted small my-2 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; height: 55px; line-height: 1.5;">
              {{ dr.job_description || 'No description provided.' }}
            </p>

            <hr class="my-3 border-light">

            <div class="small text-secondary mb-3">
              <div class="d-flex justify-content-between mb-1">
                <span>Branch:</span>
                <strong class="text-dark">{{ dr.eligible_branches || 'All' }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span>Min CGPA:</span>
                <strong class="text-dark">{{ dr.min_cgpa }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span>Passing Year:</span>
                <strong class="text-dark">{{ dr.eligible_year === 0 ? 'All Years' : 'Year ' + dr.eligible_year }}</strong>
              </div>
              <div class="d-flex justify-content-between mt-2 pt-2 border-top border-light-subtle">
                <span class="fw-semibold text-danger"><i class="bi bi-clock-fill me-1"></i>{{ getCountdown(dr.application_deadline) }}</span>
                <span class="text-muted">Deadline: {{ formatDate(dr.application_deadline) }}</span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="mt-auto">
              <div v-if="!dr.is_eligible" class="alert alert-danger py-1 px-2 small text-center mb-0" style="border-radius: 6px;">
                <i class="bi bi-x-circle me-1"></i> {{ dr.eligibility_reason }}
              </div>
              
              <button 
                class="btn btn-secondary w-100 py-2" 
                disabled 
                v-else-if="dr.already_applied"
                style="border-radius: 8px; font-weight: 500;"
              >
                <i class="bi bi-check-all me-1"></i> Already Applied
              </button>

              <button 
                class="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center" 
                @click="apply(dr.id)" 
                v-else
                :disabled="applyingId === dr.id || !hasResume"
                style="border-radius: 8px; font-weight: 500;"
              >
                <span v-if="applyingId === dr.id" class="spinner-border spinner-border-sm me-1" role="status"></span>
                <i class="bi bi-send-fill me-1" v-else></i>
                <span>{{ !hasResume ? 'Upload Resume to Apply' : 'Apply Now' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="col-12 text-center py-5 text-muted" v-if="!loading && drives.length === 0">
          <i class="bi bi-emoji-frown fs-1 mb-3 d-block"></i>
          <h5>No placement drives found</h5>
          <p class="small">Try adjusting search query filters or sliding the CGPA bar.</p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drives: [],
      search: '',
      branch: '',
      minCgpa: 10,
      loading: false,
      applyingId: null,
      hasResume: false
    };
  },
  mounted() {
    this.checkResumeStatus();
    this.fetchDrives();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    },
    getCountdown(dateStr) {
      if (!dateStr) return '';
      const diff = new Date(dateStr) - new Date();
      if (diff <= 0) return 'Closed';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days > 0) return `${days}d remaining`;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 0) return `${hours}h remaining`;
      
      return 'Closes soon';
    },
    checkResumeStatus() {
      // Check if student has a resume uploaded
      axios.get('/api/auth/me')
      .then(response => {
        const p = response.data.data.profile;
        this.hasResume = !!(p && p.resume_filename);
      })
      .catch(() => {});
    },
    fetchDrives() {
      this.loading = true;
      axios.get('/api/student/drives', {
        params: {
          search: this.search,
          branch: this.branch,
          min_cgpa: this.minCgpa
        }
      })
      .then(response => {
        this.drives = response.data.data;
      })
      .catch(err => {
        alert('Failed to load eligible drives');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    apply(id) {
      this.applyingId = id;
      axios.post(`/api/student/drives/${id}/apply`)
      .then(() => {
        alert('Applied successfully!');
        this.fetchDrives();
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          alert('Application failed: ' + err.response.data.error);
        } else {
          alert('Failed to apply.');
        }
      })
      .finally(() => {
        this.applyingId = null;
      });
    }
  }
};
