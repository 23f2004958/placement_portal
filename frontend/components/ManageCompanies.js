window.ManageCompaniesComponent = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Manage Companies</h2>
          <p class="text-muted mb-0">View profiles and manage registrations</p>
        </div>
      </div>

      <div class="card border-0 shadow-sm p-4 mb-4" style="border-radius: 12px;">
        <!-- Search and Filter Bar -->
        <div class="row g-3 align-items-center justify-content-between">
          <div class="col-md-5">
            <div class="input-group">
              <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-search"></i></span>
              <input 
                type="text" 
                class="form-control border-start-0 ps-0" 
                placeholder="Search by company name..." 
                v-model="search"
                @input="fetchCompanies"
              >
            </div>
          </div>
          <div class="col-md-6 d-flex justify-content-md-end">
            <!-- Filter Tabs -->
            <div class="btn-group" role="group">
              <button 
                v-for="status in ['all', 'pending', 'approved', 'rejected']" 
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

      <!-- Companies Table -->
      <div class="card border-0 shadow-sm" style="border-radius: 12px;">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th @click="sort('company_name')" style="cursor: pointer;">
                    Company Name <i class="bi" :class="getSortIcon('company_name')"></i>
                  </th>
                  <th @click="sort('industry')" style="cursor: pointer;">
                    Industry <i class="bi" :class="getSortIcon('industry')"></i>
                  </th>
                  <th @click="sort('hr_contact')" style="cursor: pointer;">
                    HR Contact <i class="bi" :class="getSortIcon('hr_contact')"></i>
                  </th>
                  <th>Website</th>
                  <th @click="sort('approval_status')" style="cursor: pointer;" class="text-center">
                    Status <i class="bi" :class="getSortIcon('approval_status')"></i>
                  </th>
                  <th class="text-center" style="width: 250px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="co in sortedCompanies" :key="co.id">
                  <td>
                    <a href="#" class="fw-bold text-primary text-decoration-none" @click.prevent="openDetailsModal(co)">
                      {{ co.company_name }}
                    </a>
                    <div class="text-muted small">{{ co.email }}</div>
                  </td>
                  <td>{{ co.industry }}</td>
                  <td>{{ co.hr_contact || 'N/A' }}</td>
                  <td>
                    <a :href="co.website" target="_blank" class="text-decoration-none text-secondary small" v-if="co.website">
                      {{ co.website }} <i class="bi bi-box-arrow-up-right ms-1"></i>
                    </a>
                    <span v-else>N/A</span>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="getStatusBadgeClass(co.approval_status, co.is_blacklisted)">
                      {{ co.is_blacklisted ? 'Blacklisted' : co.approval_status }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="d-flex justify-content-center gap-2">
                      <button 
                        class="btn btn-sm btn-success py-1 px-2" 
                        v-if="co.approval_status !== 'approved' && !co.is_blacklisted" 
                        @click="approveCompany(co.id)"
                      >Approve</button>
                      <button 
                        class="btn btn-sm btn-danger py-1 px-2" 
                        v-if="co.approval_status === 'pending'" 
                        @click="rejectCompany(co.id)"
                      >Reject</button>
                      <button 
                        class="btn btn-sm btn-outline-danger py-1 px-2" 
                        v-if="!co.is_blacklisted" 
                        @click="blacklistCompany(co.id)"
                      >Blacklist</button>
                      <span v-if="co.is_blacklisted" class="text-muted small">No Actions</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="loading && sortedCompanies.length === 0">
                  <td colspan="6" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading...
                  </td>
                </tr>
                <tr v-if="!loading && sortedCompanies.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">No companies found matching the criteria.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div class="modal fade" id="companyDetailModal" tabindex="-1" aria-labelledby="companyDetailModalLabel" aria-hidden="true" ref="detailModal">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0" style="border-radius: 16px;">
            <div class="modal-header bg-light border-0 py-3" style="border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <h5 class="modal-title fw-bold text-dark" id="companyDetailModalLabel">Company Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4" v-if="selectedCompany">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Company Name</label>
                  <h5 class="fw-bold text-dark">{{ selectedCompany.company_name }}</h5>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Industry</label>
                  <h5><span class="badge bg-secondary">{{ selectedCompany.industry }}</span></h5>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">HR Contact</label>
                  <p class="text-dark">{{ selectedCompany.hr_contact || 'N/A' }}</p>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Contact Email</label>
                  <p class="text-dark">{{ selectedCompany.email }}</p>
                </div>
              </div>
              <div class="row">
                <div class="col-md-12 mb-3">
                  <label class="text-secondary small fw-semibold">Website</label>
                  <p>
                    <a :href="selectedCompany.website" target="_blank" v-if="selectedCompany.website" class="text-decoration-none">
                      {{ selectedCompany.website }} <i class="bi bi-box-arrow-up-right ms-1"></i>
                    </a>
                    <span v-else>N/A</span>
                  </p>
                </div>
              </div>
              <div class="row">
                <div class="col-md-12 mb-3">
                  <label class="text-secondary small fw-semibold">Description</label>
                  <p class="text-dark" style="white-space: pre-wrap;">{{ selectedCompany.description || 'No description provided.' }}</p>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Registered On</label>
                  <p class="text-dark">{{ formatDate(selectedCompany.registered_at) }}</p>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Status</label>
                  <p>
                    <span class="badge" :class="getStatusBadgeClass(selectedCompany.approval_status, selectedCompany.is_blacklisted)">
                      {{ selectedCompany.is_blacklisted ? 'Blacklisted' : selectedCompany.approval_status }}
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
      companies: [],
      search: '',
      currentTab: 'all',
      loading: false,
      selectedCompany: null,
      sortBy: 'company_name',
      sortDesc: false,
      modalInstance: null
    };
  },
  computed: {
    sortedCompanies() {
      return [...this.companies].sort((a, b) => {
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
    this.fetchCompanies();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    fetchCompanies() {
      this.loading = true;
      const statusParam = this.currentTab === 'all' ? '' : this.currentTab;
      
      axios.get('/api/admin/companies', {
        params: {
          status: statusParam,
          search: this.search
        }
      })
      .then(response => {
        this.companies = response.data.data;
      })
      .catch(err => {
        alert('Failed to load companies list');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    changeTab(tab) {
      this.currentTab = tab;
      this.fetchCompanies();
    },
    approveCompany(id) {
      axios.put(`/api/admin/companies/${id}/approve`)
      .then(() => {
        this.fetchCompanies();
        if (this.selectedCompany && this.selectedCompany.id === id) {
          this.selectedCompany.approval_status = 'approved';
          this.selectedCompany.is_active = true;
        }
      })
      .catch(err => {
        alert('Failed to approve company');
      });
    },
    rejectCompany(id) {
      if (confirm('Are you sure you want to reject this company?')) {
        axios.put(`/api/admin/companies/${id}/reject`)
        .then(() => {
          this.fetchCompanies();
          if (this.selectedCompany && this.selectedCompany.id === id) {
            this.selectedCompany.approval_status = 'rejected';
          }
        })
        .catch(err => {
          alert('Failed to reject company');
        });
      }
    },
    blacklistCompany(id) {
      if (confirm('Are you sure you want to blacklist this company? This will disable HR login.')) {
        axios.put(`/api/admin/companies/${id}/blacklist`)
        .then(() => {
          this.fetchCompanies();
          if (this.selectedCompany && this.selectedCompany.id === id) {
            this.selectedCompany.is_blacklisted = true;
            this.selectedCompany.is_active = false;
          }
        })
        .catch(err => {
          alert('Failed to blacklist company');
        });
      }
    },
    getStatusBadgeClass(status, isBlacklisted) {
      if (isBlacklisted) return 'bg-danger';
      if (status === 'approved') return 'bg-success';
      if (status === 'rejected') return 'bg-dark';
      return 'bg-warning text-dark';
    },
    openDetailsModal(co) {
      this.selectedCompany = co;
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
