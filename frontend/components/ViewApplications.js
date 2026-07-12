window.ViewApplicationsComponent = {
  props: ['param'], // Drive ID
  template: `
    <div>
      <!-- Back button -->
      <div class="mb-4">
        <a href="#company-dashboard" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
        </a>
      </div>

      <!-- Drive details card -->
      <div class="card border-0 shadow-sm mb-4" style="border-radius: 12px;" v-if="drive">
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="badge bg-primary mb-2 text-uppercase">{{ drive.status }}</span>
              <h3 class="fw-bold text-dark mb-1">{{ drive.job_title }}</h3>
              <p class="text-muted mb-0">Posted by your company</p>
            </div>
            <button class="btn btn-outline-primary d-flex align-items-center" @click="downloadCSV" :disabled="applications.length === 0">
              <i class="bi bi-download me-2"></i> Export Candidates CSV
            </button>
          </div>
          <hr class="my-3">
          <div class="row g-3">
            <div class="col-md-3 col-6">
              <span class="text-secondary small d-block">Package Offered</span>
              <strong class="text-dark">{{ drive.package_lpa }} LPA</strong>
            </div>
            <div class="col-md-3 col-6">
              <span class="text-secondary small d-block">Minimum CGPA</span>
              <strong class="text-dark">{{ drive.min_cgpa }}</strong>
            </div>
            <div class="col-md-3 col-6">
              <span class="text-secondary small d-block">Application Deadline</span>
              <strong class="text-dark">{{ formatDate(drive.application_deadline) }}</strong>
            </div>
            <div class="col-md-3 col-6">
              <span class="text-secondary small d-block">Total Applicants</span>
              <strong class="text-dark">{{ applications.length }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Applicants List -->
      <div class="card border-0 shadow-sm" style="border-radius: 12px;">
        <div class="card-header bg-transparent border-0 pt-4 px-4 pb-0">
          <h5 class="fw-bold text-dark">Candidates List</h5>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Branch</th>
                  <th class="text-center">CGPA</th>
                  <th>Applied On</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Interview Date</th>
                  <th>Remarks</th>
                  <th class="text-center" style="width: 150px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="app in applications" :key="app.id">
                  <td>
                    <div class="fw-bold text-dark">{{ app.student.name }}</div>
                    <div class="text-muted small">
                      <a :href="'mailto:' + app.student.email" class="text-decoration-none text-muted">{{ app.student.email }}</a>
                      <span class="mx-1">|</span>
                      <span>{{ app.student.phone }}</span>
                    </div>
                    <div class="mt-1" v-if="app.student.linkedin_url || app.student.resume_filename">
                      <a :href="app.student.linkedin_url" target="_blank" v-if="app.student.linkedin_url" class="btn btn-sm btn-light py-0 px-2 me-1 border" style="font-size: 0.75rem;">
                        <i class="bi bi-linkedin text-primary"></i> LinkedIn
                      </a>
                      <a :href="'/uploads/resumes/' + app.student.resume_filename" target="_blank" v-if="app.student.resume_filename" class="btn btn-sm btn-light py-0 px-2 border" style="font-size: 0.75rem;">
                        <i class="bi bi-file-earmark-pdf text-danger"></i> Resume
                      </a>
                    </div>
                  </td>
                  <td class="font-monospace fw-semibold">{{ app.student.roll_number }}</td>
                  <td>{{ app.student.branch }}</td>
                  <td class="text-center fw-semibold">{{ app.student.cgpa }}</td>
                  <td class="small">{{ formatDate(app.applied_at) }}</td>
                  <td class="text-center">
                    <span class="badge" :class="getStatusBadgeClass(app.status)">
                      {{ app.status }}
                    </span>
                  </td>
                  <td class="small text-muted text-center">{{ formatDate(app.interview_date) }}</td>
                  <td class="small text-muted">{{ app.remarks || '-' }}</td>
                  <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary py-1 px-2" @click="openStatusModal(app)">
                      <i class="bi bi-pencil-square me-1"></i> Update Status
                    </button>
                  </td>
                </tr>
                <tr v-if="loading">
                  <td colspan="9" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading applicants...
                  </td>
                </tr>
                <tr v-if="!loading && applications.length === 0">
                  <td colspan="9" class="text-center text-muted py-5">No applications received for this drive yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Update Status Modal -->
      <div class="modal fade" id="statusUpdateModal" tabindex="-1" aria-labelledby="statusUpdateModalLabel" aria-hidden="true" ref="statusModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0" style="border-radius: 16px;">
            <div class="modal-header bg-light border-0 py-3" style="border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <h5 class="modal-title fw-bold text-dark" id="statusUpdateModalLabel">Update Application Status</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form @submit.prevent="updateStatus">
              <div class="modal-body p-4" v-if="selectedApp">
                <div class="mb-3">
                  <span class="text-secondary small d-block">Candidate</span>
                  <h6 class="fw-bold text-dark">{{ selectedApp.student.name }} ({{ selectedApp.student.roll_number }})</h6>
                </div>
                
                <div class="mb-3">
                  <label class="form-label text-secondary fw-semibold small">Application Status *</label>
                  <select class="form-select" v-model="form.status" required>
                    <option value="shortlisted">Shortlisted (Schedule Interview)</option>
                    <option value="selected">Selected (Place Offer)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div class="mb-3" v-if="form.status === 'shortlisted'">
                  <label class="form-label text-secondary fw-semibold small">Interview Date & Time (Optional)</label>
                  <input type="datetime-local" class="form-control" v-model="form.interview_date">
                </div>

                <div class="mb-3">
                  <label class="form-label text-secondary fw-semibold small">Remarks / Feedback (Optional)</label>
                  <textarea class="form-control" rows="3" v-model="form.remarks" placeholder="Enter interview notes or reason..."></textarea>
                </div>

                <div v-if="modalError" class="alert alert-danger py-2 small" role="alert">
                  {{ modalError }}
                </div>
              </div>
              <div class="modal-footer border-0 bg-light py-3" style="border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary px-4" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner-border spinner-border-sm me-2"></span>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drive: null,
      applications: [],
      loading: false,
      selectedApp: null,
      form: {
        status: 'shortlisted',
        interview_date: '',
        remarks: ''
      },
      modalError: '',
      modalLoading: false,
      modalInstance: null
    };
  },
  mounted() {
    this.fetchData();
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
    fetchData() {
      this.loading = true;
      // Get all drives of the company to find this specific drive details
      axios.get('/api/company/drives')
      .then(response => {
        const matchingDrives = response.data.data.filter(d => d.id === parseInt(this.param));
        if (matchingDrives.length > 0) {
          this.drive = matchingDrives[0];
        }
      })
      .catch(err => {
        alert('Failed to load drive details');
      });

      // Get applications
      axios.get(`/api/company/drives/${this.param}/applications`)
      .then(response => {
        this.applications = response.data.data;
      })
      .catch(err => {
        alert('Failed to load applicants');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    openStatusModal(app) {
      this.selectedApp = app;
      this.form.status = app.status === 'applied' ? 'shortlisted' : app.status;
      this.form.remarks = app.remarks || '';
      
      // format date for datetime-local: YYYY-MM-DDThh:mm
      if (app.interview_date) {
        const d = new Date(app.interview_date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        this.form.interview_date = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      } else {
        this.form.interview_date = '';
      }
      
      this.modalError = '';
      this.$nextTick(() => {
        if (!this.modalInstance) {
          this.modalInstance = new bootstrap.Modal(this.$refs.statusModal);
        }
        this.modalInstance.show();
      });
    },
    updateStatus() {
      this.modalLoading = true;
      this.modalError = '';

      axios.put(`/api/company/applications/${this.selectedApp.id}/status`, {
        status: this.form.status,
        remarks: this.form.remarks,
        interview_date: this.form.interview_date || null
      })
      .then(() => {
        this.modalInstance.hide();
        this.fetchData();
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.modalError = err.response.data.error;
        } else {
          this.modalError = 'Failed to update status. Please try again.';
        }
      })
      .finally(() => {
        this.modalLoading = false;
      });
    },
    getStatusBadgeClass(status) {
      if (status === 'selected') return 'bg-success';
      if (status === 'shortlisted') return 'bg-warning text-dark';
      if (status === 'rejected') return 'bg-danger';
      return 'bg-secondary';
    },
    downloadCSV() {
      if (this.applications.length === 0) return;
      
      let csvContent = "\uFEFF"; // Byte Order Mark for UTF-8 compatibility with Excel
      csvContent += "Roll Number,Student Name,Email,Phone,Branch,CGPA,Applied Date,Status,Remarks\n";
      
      this.applications.forEach(app => {
        const student = app.student;
        const row = [
          `"${student.roll_number}"`,
          `"${student.name.replace(/"/g, '""')}"`,
          `"${student.email}"`,
          `"${student.phone}"`,
          `"${student.branch}"`,
          student.cgpa,
          `"${this.formatDate(app.applied_at)}"`,
          `"${app.status}"`,
          `"${(app.remarks || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ].join(",");
        csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `applicants_drive_${this.param}_${this.drive ? this.drive.job_title.replace(/\s+/g, '_') : 'list'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
