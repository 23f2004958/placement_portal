window.CompanyDashboardComponent = {
  template: `
    <div>
      <!-- Welcome Section -->
      <div class="card border-0 shadow-sm mb-4 bg-primary text-white" style="border-radius: 16px; background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%) !important;">
        <div class="card-body p-4 d-flex justify-content-between align-items-center flex-wrap">
          <div class="mb-2 mb-md-0">
            <h2 class="fw-bold mb-1">Welcome, {{ dashboardData.profile.company_name }}</h2>
            <p class="mb-0 text-white text-opacity-75">Industry Segment: {{ dashboardData.profile.industry }}</p>
          </div>
          <div>
            <span class="badge py-2 px-3 fs-6" :class="dashboardData.profile.approval_status === 'approved' ? 'bg-success' : 'bg-warning text-dark'">
              <i class="bi" :class="dashboardData.profile.approval_status === 'approved' ? 'bi-check-circle-fill' : 'bi-hourglass-split'"></i>
              Status: {{ dashboardData.profile.approval_status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Helper info for unapproved company -->
      <div v-if="dashboardData.profile.approval_status !== 'approved'" class="alert alert-warning border-0 shadow-sm p-4 mb-4" style="border-radius: 12px;">
        <h5 class="fw-bold mb-2"><i class="bi bi-exclamation-triangle-fill me-2"></i>Registration Under Review</h5>
        <p class="mb-0">Your profile registration is currently pending review by the Institute Placement Coordinator. Once approved, you will be able to create new placement drives, schedule interviews, and select students. This process usually takes 24 hours.</p>
      </div>

      <!-- Stats Row -->
      <div class="row g-3 mb-4" v-if="dashboardData.stats">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px;">
            <div class="card-body py-3 d-flex align-items-center">
              <div class="bg-primary bg-opacity-10 text-primary p-3 rounded me-3">
                <i class="bi bi-briefcase-fill fs-3"></i>
              </div>
              <div>
                <h6 class="text-muted small text-uppercase mb-1">Drives Created</h6>
                <h3 class="fw-bold mb-0 text-dark">{{ dashboardData.stats.total_drives }}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px;">
            <div class="card-body py-3 d-flex align-items-center">
              <div class="bg-info bg-opacity-10 text-info p-3 rounded me-3">
                <i class="bi bi-people-fill fs-3"></i>
              </div>
              <div>
                <h6 class="text-muted small text-uppercase mb-1">Total Applicants</h6>
                <h3 class="fw-bold mb-0 text-dark">{{ dashboardData.stats.total_applicants }}</h3>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px;">
            <div class="card-body py-3 d-flex align-items-center">
              <div class="bg-warning bg-opacity-10 text-warning p-3 rounded me-3">
                <i class="bi bi-list-stars fs-3"></i>
              </div>
              <div>
                <h6 class="text-muted small text-uppercase mb-1">Shortlisted</h6>
                <h3 class="fw-bold mb-0 text-dark">{{ dashboardData.stats.shortlisted }}</h3>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px;">
            <div class="card-body py-3 d-flex align-items-center">
              <div class="bg-success bg-opacity-10 text-success p-3 rounded me-3">
                <i class="bi bi-patch-check-fill fs-3"></i>
              </div>
              <div>
                <h6 class="text-muted small text-uppercase mb-1">Selected Offers</h6>
                <h3 class="fw-bold mb-0 text-dark text-success">{{ dashboardData.stats.selected }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Drive Management -->
      <div class="card border-0 shadow-sm mb-4" style="border-radius: 12px;">
        <div class="card-header bg-transparent border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
          <h5 class="fw-bold text-dark mb-0">Your Placement Drives</h5>
          <a 
            href="#company-create-drive" 
            class="btn btn-primary d-flex align-items-center"
            :class="{ disabled: dashboardData.profile.approval_status !== 'approved' }"
            style="border-radius: 8px; font-weight: 500;"
          >
            <i class="bi bi-plus-lg me-1"></i> Create New Drive
          </a>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 mt-3">
              <thead class="table-light">
                <tr>
                  <th>Job Title</th>
                  <th>Application Deadline</th>
                  <th>Status</th>
                  <th class="text-center">Applicant Count</th>
                  <th class="text-center" style="width: 180px;">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="drv in dashboardData.drives" :key="drv.id">
                  <td>
                    <div class="fw-bold text-dark">{{ drv.job_title }}</div>
                  </td>
                  <td class="small">{{ formatDate(drv.application_deadline) }}</td>
                  <td>
                    <span class="badge" :class="getStatusBadgeClass(drv.status)">
                      {{ drv.status }}
                    </span>
                  </td>
                  <td class="text-center fw-semibold text-primary fs-5">{{ drv.applicant_count }}</td>
                  <td class="text-center">
                    <a :href="'#company-applications/' + drv.id" class="btn btn-sm btn-outline-primary py-1 px-3">
                      <i class="bi bi-eye me-1"></i> View Applicants
                    </a>
                  </td>
                </tr>
                <tr v-if="loading">
                  <td colspan="5" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2"></span>Loading dashboard details...
                  </td>
                </tr>
                <tr v-if="!loading && dashboardData.drives.length === 0">
                  <td colspan="5" class="text-center text-muted py-5">You haven't posted any placement drives yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      dashboardData: {
        profile: { company_name: '', industry: '', approval_status: 'pending' },
        stats: { total_drives: 0, total_applicants: 0, shortlisted: 0, selected: 0 },
        drives: []
      },
      loading: false
    };
  },
  mounted() {
    this.fetchDashboard();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    fetchDashboard() {
      this.loading = true;
      axios.get('/api/company/dashboard')
      .then(response => {
        this.dashboardData = response.data.data;
      })
      .catch(err => {
        alert('Failed to load company dashboard data');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    getStatusBadgeClass(status) {
      if (status === 'approved') return 'bg-success';
      if (status === 'closed') return 'bg-dark';
      return 'bg-warning text-dark';
    }
  }
};
