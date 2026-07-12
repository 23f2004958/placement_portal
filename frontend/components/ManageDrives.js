window.ManageDrivesComponent = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Manage Placement Drives</h2>
          <p class="text-muted mb-0">Approve, close, and review job postings</p>
        </div>
      </div>

      <div class="card border-0 shadow-sm p-4 mb-4" style="border-radius: 12px;">
        <div class="row align-items-center justify-content-between">
          <div class="col-md-6">
            <!-- Filter Tabs -->
            <div class="btn-group" role="group">
              <button 
                v-for="status in ['all', 'pending', 'approved', 'closed']" 
                :key="status"
                type="button" 
                class="btn btn-sm btn-outline-secondary text-capitalize"
                :class="{ active: currentTab === status }"
                @click="changeTab(status)"
              >
                {{ status }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Drives Table -->
      <div class="card border-0 shadow-sm" style="border-radius: 12px;">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th @click="sort('job_title')" style="cursor: pointer;">
                    Job Title <i class="bi" :class="getSortIcon('job_title')"></i>
                  </th>
                  <th @click="sort('company_name')" style="cursor: pointer;">
                    Company <i class="bi" :class="getSortIcon('company_name')"></i>
                  </th>
                  <th @click="sort('package_lpa')" style="cursor: pointer;">
                    Package (LPA) <i class="bi" :class="getSortIcon('package_lpa')"></i>
                  </th>
                  <th @click="sort('min_cgpa')" style="cursor: pointer;">
                    Min CGPA <i class="bi" :class="getSortIcon('min_cgpa')"></i>
                  </th>
                  <th @click="sort('application_deadline')" style="cursor: pointer;">
                    Deadline <i class="bi" :class="getSortIcon('application_deadline')"></i>
                  </th>
                  <th class="text-center">Status</th>
                  <th class="text-center" style="width: 220px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dr in sortedDrives" :key="dr.id">
                  <td>
                    <a href="#" class="fw-bold text-primary text-decoration-none" @click.prevent="openDetailsModal(dr)">
                      {{ dr.job_title }}
                    </a>
                  </td>
                  <td>{{ dr.company_name }}</td>
                  <td class="fw-bold text-dark">{{ dr.package_lpa.toFixed(1) }} LPA</td>
                  <td>{{ dr.min_cgpa.toFixed(2) }}</td>
                  <td class="small" :class="isDeadlinePassed(dr.application_deadline) ? 'text-danger fw-semibold' : ''">
                    {{ formatDate(dr.application_deadline) }}
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="getStatusBadgeClass(dr.status)">
                      {{ dr.status }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="d-flex justify-content-center gap-2">
                      <button 
                        class="btn btn-sm btn-success py-1 px-2" 
                        v-if="dr.status === 'pending'" 
                        @click="approveDrive(dr.id)"
                      >Approve</button>
                      <button 
                        class="btn btn-sm btn-danger py-1 px-2" 
                        v-if="dr.status === 'pending'" 
                        @click="rejectDrive(dr.id)"
                      >Reject</button>
                      <button 
                        class="btn btn-sm btn-outline-danger py-1 px-2" 
                        v-if="dr.status === 'approved'" 
                        @click="rejectDrive(dr.id)"
                      >Close</button>
                      <span v-if="dr.status === 'closed'" class="text-muted small">No Actions</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="loading && sortedDrives.length === 0">
                  <td colspan="7" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading...
                  </td>
                </tr>
                <tr v-if="!loading && sortedDrives.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">No placement drives found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Drive Detail Modal -->
      <div class="modal fade" id="driveDetailModal" tabindex="-1" aria-labelledby="driveDetailModalLabel" aria-hidden="true" ref="detailModal">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0" style="border-radius: 16px;">
            <div class="modal-header bg-light border-0 py-3" style="border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <h5 class="modal-title fw-bold text-dark" id="driveDetailModalLabel">Placement Drive Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4" v-if="selectedDrive">
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="text-secondary small fw-semibold">Company</label>
                  <h5 class="fw-bold text-dark mb-1">{{ selectedDrive.company_name }}</h5>
                </div>
                <div class="col-md-6">
                  <label class="text-secondary small fw-semibold">Job Title</label>
                  <h5 class="fw-semibold text-primary mb-1">{{ selectedDrive.job_title }}</h5>
                </div>
              </div>

              <div class="mb-4">
                <label class="text-secondary small fw-semibold">Job Description</label>
                <div class="border rounded p-3 bg-light text-dark" style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                  {{ selectedDrive.job_description || 'No description provided.' }}
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-4 mb-3">
                  <label class="text-secondary small fw-semibold">Package (LPA)</label>
                  <p class="text-dark fw-bold mb-0 text-success fs-5">{{ selectedDrive.package_lpa.toFixed(1) }} LPA</p>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="text-secondary small fw-semibold">Minimum CGPA</label>
                  <p class="text-dark fw-bold mb-0 fs-5 text-indigo">{{ selectedDrive.min_cgpa.toFixed(2) }}</p>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="text-secondary small fw-semibold">Eligible Passing Year</label>
                  <p class="text-dark fw-bold mb-0 fs-5">
                    {{ selectedDrive.eligible_year === 0 ? 'All Years' : 'Year ' + selectedDrive.eligible_year }}
                  </p>
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Eligible Branches</label>
                  <div>
                    <span v-for="br in getBranchesArray(selectedDrive.eligible_branches)" :key="br" class="badge bg-primary me-1 mb-1">
                      {{ br }}
                    </span>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Application Deadline</label>
                  <p class="text-dark mb-0 fw-semibold" :class="isDeadlinePassed(selectedDrive.application_deadline) ? 'text-danger' : ''">
                    {{ formatDate(selectedDrive.application_deadline) }}
                    <span v-if="isDeadlinePassed(selectedDrive.application_deadline)" class="badge bg-danger ms-1 small">Closed</span>
                  </p>
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Tentative Drive Date</label>
                  <p class="text-dark mb-0">{{ formatDate(selectedDrive.drive_date) }}</p>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Drive Status</label>
                  <p class="mb-0">
                    <span class="badge" :class="getStatusBadgeClass(selectedDrive.status)">
                      {{ selectedDrive.status }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 bg-light py-3" style="border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
              <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drives: [],
      currentTab: 'all',
      loading: false,
      selectedDrive: null,
      sortBy: 'job_title',
      sortDesc: false,
      modalInstance: null
    };
  },
  computed: {
    sortedDrives() {
      return [...this.drives].sort((a, b) => {
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
    this.fetchDrives();
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
    isDeadlinePassed(dateStr) {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d < new Date();
    },
    fetchDrives() {
      this.loading = true;
      const statusParam = this.currentTab === 'all' ? '' : this.currentTab;
      
      axios.get('/api/admin/drives', {
        params: {
          status: statusParam
        }
      })
      .then(response => {
        this.drives = response.data.data;
      })
      .catch(err => {
        alert('Failed to load drives list');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    changeTab(tab) {
      this.currentTab = tab;
      this.fetchDrives();
    },
    approveDrive(id) {
      axios.put(`/api/admin/drives/${id}/approve`)
      .then(() => {
        this.fetchDrives();
        if (this.selectedDrive && this.selectedDrive.id === id) {
          this.selectedDrive.status = 'approved';
        }
      })
      .catch(err => {
        alert('Failed to approve placement drive');
      });
    },
    rejectDrive(id) {
      const msg = 'Are you sure you want to reject/close this placement drive?';
      if (confirm(msg)) {
        axios.put(`/api/admin/drives/${id}/reject`)
        .then(() => {
          this.fetchDrives();
          if (this.selectedDrive && this.selectedDrive.id === id) {
            this.selectedDrive.status = 'closed';
          }
        })
        .catch(err => {
          alert('Failed to close placement drive');
        });
      }
    },
    getBranchesArray(branches) {
      if (!branches) return [];
      return branches.split(',').map(b => b.trim()).filter(b => b.length > 0);
    },
    getStatusBadgeClass(status) {
      if (status === 'approved') return 'bg-success';
      if (status === 'closed') return 'bg-dark';
      return 'bg-warning text-dark';
    },
    openDetailsModal(dr) {
      this.selectedDrive = dr;
      this.$nextTick(() => {
        if (!this.modalInstance) {
          this.modalInstance = new bootstrap.Modal(this.$refs.detailModal);
        }
        this.modalInstance.show();
      });
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
