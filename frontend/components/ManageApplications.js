window.ManageApplicationsComponent = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Placement Applications Log</h2>
          <p class="text-muted mb-0">Browse and monitor student submissions across all active drives</p>
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="card border-0 shadow-sm p-4 mb-4" style="border-radius: 12px;">
        <div class="row g-3 align-items-center">
          <div class="col-md-4">
            <label class="form-label text-secondary small fw-semibold">Filter by Status</label>
            <select class="form-select" v-model="statusFilter" @change="fetchApplications">
              <option value="">All Statuses</option>
              <option value="applied">Applied (Pending Review)</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Applications Table -->
      <div class="card border-0 shadow-sm" style="border-radius: 12px;">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr style="cursor: pointer;">
                  <th @click="sort('student_name')">Student Name <i class="bi" :class="getSortIcon('student_name')"></i></th>
                  <th @click="sort('roll_no')">Roll No <i class="bi" :class="getSortIcon('roll_no')"></i></th>
                  <th @click="sort('company_name')">Company <i class="bi" :class="getSortIcon('company_name')"></i></th>
                  <th @click="sort('drive_title')">Job Title <i class="bi" :class="getSortIcon('drive_title')"></i></th>
                  <th @click="sort('applied_at')">Applied Date <i class="bi" :class="getSortIcon('applied_at')"></i></th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="app in sortedApplications" :key="app.id">
                  <td>
                    <div class="fw-bold text-dark">{{ app.student_name }}</div>
                  </td>
                  <td><span class="font-monospace fw-semibold">{{ app.roll_no }}</span></td>
                  <td>{{ app.company_name }}</td>
                  <td>{{ app.drive_title }}</td>
                  <td class="small">{{ formatDate(app.applied_at) }}</td>
                  <td class="text-center">
                    <span class="badge" :class="getStatusBadgeClass(app.status)">
                      {{ app.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="loading && sortedApplications.length === 0">
                  <td colspan="6" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2"></span>Loading applications log...
                  </td>
                </tr>
                <tr v-if="!loading && sortedApplications.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">No applications matching current selection.</td>
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
      applications: [],
      statusFilter: '',
      loading: false,
      sortBy: 'applied_at',
      sortDesc: true
    };
  },
  computed: {
    sortedApplications() {
      return [...this.applications].sort((a, b) => {
        let valA = a[this.sortBy];
        let valB = b[this.sortBy];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        
        if (valA < valB) return this.sortDesc ? 1 : -1;
        if (valA > valB) return this.sortDesc ? -1 : 1;
        return 0;
      });
    }
  },
  mounted() {
    this.fetchApplications();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    fetchApplications() {
      this.loading = true;
      axios.get('/api/admin/applications', {
        params: {
          status: this.statusFilter
        }
      })
      .then(response => {
        this.applications = response.data.data;
      })
      .catch(err => {
        alert('Failed to load applications log');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    getStatusBadgeClass(status) {
      if (status === 'selected') return 'bg-success';
      if (status === 'shortlisted') return 'bg-warning text-dark';
      if (status === 'rejected') return 'bg-danger';
      return 'bg-primary';
    },
    sort(field) {
      if (this.sortBy === field) {
        this.sortDesc = !this.sortDesc;
      } else {
        this.sortBy = field;
        this.sortDesc = false;
      }
    },
    getSortIcon(field) {
      if (this.sortBy !== field) return 'bi-arrow-down-up text-muted small';
      return this.sortDesc ? 'bi-sort-down-alt' : 'bi-sort-up';
    }
  }
};
