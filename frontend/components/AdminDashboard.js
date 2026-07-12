window.AdminDashboardComponent = {
  template: `
    <div>
      <!-- Header banner -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Admin Control Center</h2>
          <p class="text-muted mb-0">Overview of activities and moderation queues</p>
        </div>
        <button class="btn btn-outline-secondary" @click="fetchDashboardData" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1" :class="{ 'spinner-border spinner-border-sm border-0': loading }"></i>
          Refresh Data
        </button>
      </div>

      <div v-if="error" class="alert alert-danger" role="alert" style="border-radius: 8px;">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
      </div>

      <!-- Stats Row -->
      <div class="row g-3 mb-4">
        <div class="col-md-4 col-lg-2">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 4px solid #3b82f6 !important;">
            <div class="card-body py-3">
              <div class="d-flex align-items-center">
                <div class="bg-primary bg-opacity-10 text-primary p-3 rounded me-3">
                  <i class="bi bi-people-fill fs-4"></i>
                </div>
                <div>
                  <h6 class="text-muted small text-uppercase mb-1">Students</h6>
                  <h4 class="fw-bold mb-0">{{ stats.total_students }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-lg-2">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 4px solid #10b981 !important;">
            <div class="card-body py-3">
              <div class="d-flex align-items-center">
                <div class="bg-success bg-opacity-10 text-success p-3 rounded me-3">
                  <i class="bi bi-building-fill fs-4"></i>
                </div>
                <div>
                  <h6 class="text-muted small text-uppercase mb-1">Companies</h6>
                  <h4 class="fw-bold mb-0">{{ stats.total_companies }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-lg-2">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 4px solid #6366f1 !important;">
            <div class="card-body py-3">
              <div class="d-flex align-items-center">
                <div class="bg-indigo bg-opacity-10 text-indigo p-3 rounded me-3" style="color: #6366f1; background-color: rgba(99, 102, 241, 0.1);">
                  <i class="bi bi-briefcase-fill fs-4"></i>
                </div>
                <div>
                  <h6 class="text-muted small text-uppercase mb-1">Drives</h6>
                  <h4 class="fw-bold mb-0">{{ stats.total_drives }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-lg-2">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 4px solid #f59e0b !important;">
            <div class="card-body py-3">
              <div class="d-flex align-items-center">
                <div class="bg-warning bg-opacity-10 text-warning p-3 rounded me-3">
                  <i class="bi bi-file-earmark-text-fill fs-4"></i>
                </div>
                <div>
                  <h6 class="text-muted small text-uppercase mb-1">Applications</h6>
                  <h4 class="fw-bold mb-0">{{ stats.total_applications }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-lg-2">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 4px solid #ef4444 !important;">
            <div class="card-body py-3">
              <div class="d-flex align-items-center">
                <div class="bg-danger bg-opacity-10 text-danger p-3 rounded me-3">
                  <i class="bi bi-clock-history fs-4"></i>
                </div>
                <div>
                  <h6 class="text-muted small text-uppercase mb-1">Pending Co.</h6>
                  <h4 class="fw-bold mb-0">{{ stats.pending_companies_count }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-lg-2">
          <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; border-left: 4px solid #8b5cf6 !important;">
            <div class="card-body py-3">
              <div class="d-flex align-items-center">
                <div class="bg-purple bg-opacity-10 text-purple p-3 rounded me-3" style="color: #8b5cf6; background-color: rgba(139, 92, 246, 0.1);">
                  <i class="bi bi-journal-check fs-4"></i>
                </div>
                <div>
                  <h6 class="text-muted small text-uppercase mb-1">Pending Drv.</h6>
                  <h4 class="fw-bold mb-0">{{ stats.pending_drives_count }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="row g-4 mb-4">
        <div class="col-md-4">
          <div class="card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body">
              <h5 class="card-title fw-bold text-dark mb-3">Applications (Last 6 Months)</h5>
              <div style="position: relative; height:250px;">
                <canvas id="monthChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body">
              <h5 class="card-title fw-bold text-dark mb-3">Application Status Distribution</h5>
              <div style="position: relative; height:250px;">
                <canvas id="statusChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body">
              <h5 class="card-title fw-bold text-dark mb-3">Top 5 Companies</h5>
              <div style="position: relative; height:250px;">
                <canvas id="companyChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Approvals Lists -->
      <div class="row g-4">
        <!-- Pending Companies -->
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-title fw-bold text-dark mb-0">Pending Company Approvals</h5>
                <span class="badge bg-danger rounded-pill">{{ stats.pending_companies.length }}</span>
              </div>
              <div class="table-responsive" style="max-height: 350px;">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Company</th>
                      <th>Industry</th>
                      <th>Registered On</th>
                      <th class="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="co in stats.pending_companies" :key="co.id">
                      <td>
                        <div class="fw-semibold text-dark">{{ co.company_name }}</div>
                        <div class="text-muted small">{{ co.email }}</div>
                      </td>
                      <td><span class="badge bg-secondary">{{ co.industry }}</span></td>
                      <td class="small">{{ formatDate(co.registered_at) }}</td>
                      <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                          <button class="btn btn-sm btn-success px-2 py-1" @click="approveCompany(co.id)" title="Approve">
                            <i class="bi bi-check-lg"></i>
                          </button>
                          <button class="btn btn-sm btn-danger px-2 py-1" @click="rejectCompany(co.id)" title="Reject">
                            <i class="bi bi-x-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="stats.pending_companies.length === 0">
                      <td colspan="4" class="text-center text-muted py-4">No pending company registrations.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Drives -->
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-title fw-bold text-dark mb-0">Pending Drive Approvals</h5>
                <span class="badge bg-danger rounded-pill">{{ stats.pending_drives.length }}</span>
              </div>
              <div class="table-responsive" style="max-height: 350px;">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Drive / Company</th>
                      <th>Package (LPA)</th>
                      <th>Deadline</th>
                      <th class="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="dr in stats.pending_drives" :key="dr.id">
                      <td>
                        <div class="fw-semibold text-dark">{{ dr.job_title }}</div>
                        <div class="text-muted small">{{ dr.company_name }}</div>
                      </td>
                      <td class="fw-bold text-primary">{{ dr.package_lpa }} LPA</td>
                      <td class="small">{{ formatDate(dr.application_deadline) }}</td>
                      <td class="text-center">
                        <div class="d-flex justify-content-center gap-2">
                          <button class="btn btn-sm btn-success px-2 py-1" @click="approveDrive(dr.id)" title="Approve">
                            <i class="bi bi-check-lg"></i>
                          </button>
                          <button class="btn btn-sm btn-danger px-2 py-1" @click="rejectDrive(dr.id)" title="Reject">
                            <i class="bi bi-x-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="stats.pending_drives.length === 0">
                      <td colspan="4" class="text-center text-muted py-4">No pending placement drives.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      stats: {
        total_students: 0,
        total_companies: 0,
        total_drives: 0,
        total_applications: 0,
        pending_companies_count: 0,
        pending_drives_count: 0,
        pending_companies: [],
        pending_drives: [],
        applications_per_month: {},
        status_distribution: { applied: 0, shortlisted: 0, selected: 0, rejected: 0 },
        top_companies: []
      },
      loading: false,
      error: '',
      charts: {
        monthChart: null,
        statusChart: null,
        companyChart: null
      }
    };
  },
  mounted() {
    this.fetchDashboardData();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    fetchDashboardData() {
      this.loading = true;
      this.error = '';
      
      axios.get('/api/admin/dashboard')
      .then(response => {
        this.stats = response.data.data;
        this.initCharts();
      })
      .catch(err => {
        this.error = 'Failed to load dashboard data. Please try again.';
      })
      .finally(() => {
        this.loading = false;
      });
    },
    initCharts() {
      this.$nextTick(() => {
        // Destroy existing instances
        if (this.charts.monthChart) this.charts.monthChart.destroy();
        if (this.charts.statusChart) this.charts.statusChart.destroy();
        if (this.charts.companyChart) this.charts.companyChart.destroy();

        // Month chart
        const ctxMonth = document.getElementById('monthChart').getContext('2d');
        this.charts.monthChart = new Chart(ctxMonth, {
          type: 'bar',
          data: {
            labels: Object.keys(this.stats.applications_per_month),
            datasets: [{
              label: 'Applications',
              data: Object.values(this.stats.applications_per_month),
              backgroundColor: 'rgba(59, 130, 246, 0.85)',
              borderColor: '#3b82f6',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
          }
        });

        // Status Chart
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        this.charts.statusChart = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: ['Applied', 'Shortlisted', 'Selected', 'Rejected'],
            datasets: [{
              data: [
                this.stats.status_distribution.applied,
                this.stats.status_distribution.shortlisted,
                this.stats.status_distribution.selected,
                this.stats.status_distribution.rejected
              ],
              backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } } }
          }
        });

        // Company Chart
        const ctxCompany = document.getElementById('companyChart').getContext('2d');
        this.charts.companyChart = new Chart(ctxCompany, {
          type: 'bar',
          data: {
            labels: this.stats.top_companies.map(c => c.company_name),
            datasets: [{
              label: 'Applicants',
              data: this.stats.top_companies.map(c => c.applicant_count),
              backgroundColor: 'rgba(99, 102, 241, 0.85)',
              borderColor: '#6366f1',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
          }
        });
      });
    },
    approveCompany(id) {
      axios.put(`/api/admin/companies/${id}/approve`)
      .then(() => {
        this.fetchDashboardData();
      })
      .catch(err => {
        alert('Failed to approve company');
      });
    },
    rejectCompany(id) {
      if (confirm('Are you sure you want to reject this company?')) {
        axios.put(`/api/admin/companies/${id}/reject`)
        .then(() => {
          this.fetchDashboardData();
        })
        .catch(err => {
          alert('Failed to reject company');
        });
      }
    },
    approveDrive(id) {
      axios.put(`/api/admin/drives/${id}/approve`)
      .then(() => {
        this.fetchDashboardData();
      })
      .catch(err => {
        alert('Failed to approve drive');
      });
    },
    rejectDrive(id) {
      if (confirm('Are you sure you want to reject/close this placement drive?')) {
        axios.put(`/api/admin/drives/${id}/reject`)
        .then(() => {
          this.fetchDashboardData();
        })
        .catch(err => {
          alert('Failed to reject drive');
        });
      }
    }
  }
};
