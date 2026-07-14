window.StudentDashboardComponent = {
  template: `
    <div>
      <div v-if="error" class="alert alert-danger" role="alert">
        {{ error }}
      </div>

      <div class="row g-4 mb-4">
        <!-- Student Profile Quick Card -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm p-4 h-100" style="border-radius: 16px;">
            <div class="card-body p-2 d-flex flex-column justify-content-between h-100">
              <div>
                <div class="d-flex align-items-center mb-3">
                  <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-3 me-3" style="width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-mortarboard-fill fs-3"></i>
                  </div>
                  <div>
                    <h5 class="fw-bold text-dark mb-0">{{ name }}</h5>
                    <span class="text-muted small">Roll No: {{ profile.roll_number }}</span>
                  </div>
                </div>

                <div class="small mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-secondary">Branch:</span>
                    <strong class="text-dark">{{ profile.branch }}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-secondary">Academic Year:</span>
                    <strong class="text-dark">Year {{ profile.year }}</strong>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-secondary">CGPA Rank:</span>
                    <strong class="text-primary">{{ profile.cgpa }} / 10.00</strong>
                  </div>
                </div>
              </div>

              <!-- Resume Upload Inline -->
              <div class="p-3 bg-light rounded-3 mt-3">
                <div class="d-flex align-items-center mb-2 justify-content-between">
                  <span class="small fw-semibold text-secondary">Verify Resume Document</span>
                  <span v-if="profile.resume_filename" class="badge bg-success small">Uploaded</span>
                  <span v-else class="badge bg-warning text-dark small">Missing</span>
                </div>
                <div class="text-truncate text-dark small mb-2" v-if="profile.resume_filename">
                  <i class="bi bi-file-earmark-pdf-fill text-danger me-1"></i> {{ profile.resume_filename }}
                </div>
                <div class="input-group input-group-sm">
                  <input type="file" class="form-control" id="dashResumeFile" @change="uploadResume" accept=".pdf,.docx">
                  <label class="input-group-text" for="dashResumeFile">
                    <span v-if="uploading" class="spinner-border spinner-border-sm me-1" role="status"></span>
                    {{ uploading ? 'Uploading...' : 'Upload' }}
                  </label>
                </div>
              </div>

              <!-- Export History Button -->
              <div class="mt-3">
                <button 
                  class="btn btn-sm btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center" 
                  @click="exportHistory"
                  :disabled="exporting"
                  style="border-radius: 8px; font-weight: 500;"
                >
                  <span v-if="exporting" class="spinner-border spinner-border-sm me-1" role="status"></span>
                  <i class="bi bi-file-earmark-arrow-down-fill me-1" v-else></i>
                  <span>{{ exporting ? 'Exporting...' : 'Export History (CSV)' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Counters Stats -->
        <div class="col-lg-8" v-if="stats">
          <div class="row g-3 h-100">
            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm text-center py-4 h-100" style="border-radius: 12px; border-top: 3px solid #3b82f6;">
                <h6 class="text-secondary small text-uppercase mb-2">Total Applied</h6>
                <h2 class="fw-bold mb-0 text-dark">{{ stats.applied }}</h2>
              </div>
            </div>

            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm text-center py-4 h-100" style="border-radius: 12px; border-top: 3px solid #f59e0b;">
                <h6 class="text-secondary small text-uppercase mb-2">Shortlisted</h6>
                <h2 class="fw-bold mb-0 text-warning">{{ stats.shortlisted }}</h2>
              </div>
            </div>

            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm text-center py-4 h-100" style="border-radius: 12px; border-top: 3px solid #10b981;">
                <h6 class="text-secondary small text-uppercase mb-2">Selected</h6>
                <h2 class="fw-bold mb-0 text-success">{{ stats.selected }}</h2>
              </div>
            </div>

            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm text-center py-4 h-100" style="border-radius: 12px; border-top: 3px solid #ef4444;">
                <h6 class="text-secondary small text-uppercase mb-2">Rejected</h6>
                <h2 class="fw-bold mb-0 text-danger">{{ stats.rejected }}</h2>
              </div>
            </div>
            
            <div class="col-12 mt-3">
              <div class="card border-0 shadow-sm p-4 h-100" style="border-radius: 12px;" v-if="recent_applications.length > 0">
                <h6 class="fw-bold text-dark mb-3"><i class="bi bi-lightning-charge-fill text-warning me-1"></i> Recent Applications</h6>
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0 py-2 border-light" v-for="app in recent_applications" :key="app.id">
                    <div>
                      <span class="fw-bold text-dark d-block" style="font-size: 0.95rem;">{{ app.job_title }}</span>
                      <span class="text-muted small">{{ app.company_name }}</span>
                    </div>
                    <span class="badge" :class="getStatusBadgeClass(app.status)">{{ app.status }}</span>
                  </div>
                </div>
              </div>
              <div class="card border-0 shadow-sm p-4 h-100 text-center text-muted d-flex align-items-center justify-content-center" style="border-radius: 12px;" v-else>
                <p class="mb-0 small"><i class="bi bi-info-circle me-1"></i> No application updates yet. Browse drives to start applying.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommended Placement Drives -->
      <div class="card border-0 shadow-sm p-4" style="border-radius: 16px;">
        <h5 class="fw-bold text-dark mb-4">
          <i class="bi bi-award-fill text-primary me-2"></i>Recommended Drives for You
        </h5>
        
        <div class="row g-3">
          <div class="col-md-6 col-lg-4" v-for="drv in recommended_drives" :key="drv.id">
            <div class="card border border-light-subtle h-100 p-3" style="border-radius: 12px; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.01);">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 class="fw-bold text-dark mb-0">{{ drv.job_title }}</h6>
                  <span class="text-secondary small">{{ drv.company_name }}</span>
                </div>
                <span class="badge bg-success text-white">{{ drv.package_lpa }} LPA</span>
              </div>
              
              <div class="small my-3 text-secondary">
                <div class="mb-1"><i class="bi bi-mortarboard me-2"></i> Min CGPA: <strong>{{ drv.min_cgpa }}</strong></div>
                <div><i class="bi bi-clock me-2"></i> Closes: <strong>{{ formatDate(drv.application_deadline) }}</strong></div>
              </div>
              
              <div class="mt-auto">
                <button 
                  class="btn btn-sm btn-primary w-100 py-2 d-flex align-items-center justify-content-center" 
                  @click="applyToDrive(drv.id)"
                  :disabled="applyingId === drv.id || !profile.resume_filename"
                  style="border-radius: 6px; font-weight: 500;"
                >
                  <span v-if="applyingId === drv.id" class="spinner-border spinner-border-sm me-1" role="status"></span>
                  <i class="bi bi-send-fill me-1" v-else></i>
                  <span>{{ !profile.resume_filename ? 'Upload Resume to Apply' : 'Easy Apply' }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="col-12 text-center text-muted py-5" v-if="recommended_drives.length === 0">
            <i class="bi bi-check-all fs-2 text-success mb-2 d-block"></i>
            <p class="mb-0">You are all caught up! No new recommended drives match your profile eligibility currently.</p>
            <a href="#student-drives" class="btn btn-sm btn-outline-primary mt-3">Browse All Drives</a>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      name: '',
      profile: { branch: '', year: 1, cgpa: 0.0, roll_number: '', resume_filename: '' },
      stats: { applied: 0, shortlisted: 0, selected: 0, rejected: 0 },
      recent_applications: [],
      recommended_drives: [],
      loading: false,
      uploading: false,
      exporting: false,
      applyingId: null,
      error: ''
    };
  },
  mounted() {
    this.fetchDashboard();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    fetchDashboard() {
      this.loading = true;
      axios.get('/api/student/dashboard')
      .then(response => {
        const d = response.data.data;
        this.name = d.name;
        this.profile = d.profile;
        this.stats = d.stats;
        this.recent_applications = d.recent_applications;
        this.recommended_drives = d.recommended_drives;
      })
      .catch(err => {
        this.error = 'Failed to load student dashboard details.';
      })
      .finally(() => {
        this.loading = false;
      });
    },
    applyToDrive(id) {
      this.applyingId = id;
      axios.post(`/api/student/drives/${id}/apply`)
      .then(() => {
        alert('Applied successfully!');
        this.fetchDashboard();
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          alert('Application error: ' + err.response.data.error);
        } else {
          alert('Failed to apply for drive.');
        }
      })
      .finally(() => {
        this.applyingId = null;
      });
    },
    uploadResume(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the limit of 5MB.');
        return;
      }

      this.uploading = true;
      const formData = new FormData();
      formData.append('resume', file);

      axios.post('/api/student/profile/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then(response => {
        this.profile.resume_filename = response.data.data.resume_filename;
        alert('Resume document uploaded successfully!');
        this.fetchDashboard();
      })
      .catch(err => {
        alert('Failed to upload resume document.');
      })
      .finally(() => {
        this.uploading = false;
        e.target.value = '';
      });
    },
    exportHistory() {
      this.exporting = true;
      axios.post('/api/student/export-csv')
      .then(response => {
        alert(response.data.data.message || 'Export started! You will receive an email shortly.');
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          alert('Export error: ' + err.response.data.error);
        } else {
          alert('Failed to trigger export.');
        }
      })
      .finally(() => {
        this.exporting = false;
      });
    },
    getStatusBadgeClass(status) {
      if (status === 'selected') return 'bg-success text-white';
      if (status === 'shortlisted') return 'bg-warning text-dark';
      if (status === 'rejected') return 'bg-danger text-white';
      return 'bg-secondary text-white';
    }
  }
};
