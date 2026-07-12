window.ManageStudentsComponent = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Manage Students</h2>
          <p class="text-muted mb-0">View profiles, placement history, and account actions</p>
        </div>
      </div>

      <div class="card border-0 shadow-sm p-4 mb-4" style="border-radius: 12px;">
        <div class="row align-items-center">
          <div class="col-md-6">
            <div class="input-group">
              <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-search"></i></span>
              <input 
                type="text" 
                class="form-control border-start-0 ps-0" 
                placeholder="Search by student name or roll number..." 
                v-model="search"
                @input="fetchStudents"
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Students Table -->
      <div class="card border-0 shadow-sm" style="border-radius: 12px;">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th @click="sort('name')" style="cursor: pointer;">
                    Name <i class="bi" :class="getSortIcon('name')"></i>
                  </th>
                  <th @click="sort('roll_number')" style="cursor: pointer;">
                    Roll Number <i class="bi" :class="getSortIcon('roll_number')"></i>
                  </th>
                  <th @click="sort('branch')" style="cursor: pointer;">
                    Branch <i class="bi" :class="getSortIcon('branch')"></i>
                  </th>
                  <th @click="sort('year')" style="cursor: pointer;">
                    Year <i class="bi" :class="getSortIcon('year')"></i>
                  </th>
                  <th @click="sort('cgpa')" style="cursor: pointer;">
                    CGPA <i class="bi" :class="getSortIcon('cgpa')"></i>
                  </th>
                  <th class="text-center">Status</th>
                  <th class="text-center" style="width: 200px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="st in sortedStudents" :key="st.id">
                  <td>
                    <a href="#" class="fw-bold text-primary text-decoration-none" @click.prevent="openDetailsModal(st)">
                      {{ st.name }}
                    </a>
                    <div class="text-muted small">{{ st.email }}</div>
                  </td>
                  <td><span class="font-monospace fw-semibold">{{ st.roll_number }}</span></td>
                  <td>{{ st.branch }}</td>
                  <td>{{ st.year }}</td>
                  <td class="fw-semibold">{{ st.cgpa.toFixed(2) }}</td>
                  <td class="text-center">
                    <span class="badge" :class="st.is_blacklisted ? 'bg-danger' : 'bg-success'">
                      {{ st.is_blacklisted ? 'Blacklisted' : 'Active' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="d-flex justify-content-center gap-2">
                      <button 
                        class="btn btn-sm btn-outline-danger py-1 px-2" 
                        v-if="!st.is_blacklisted" 
                        @click="blacklistStudent(st.id)"
                      >Blacklist</button>
                      <button 
                        class="btn btn-sm btn-success py-1 px-2" 
                        v-if="st.is_blacklisted" 
                        @click="activateStudent(st.id)"
                      >Activate</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="loading && sortedStudents.length === 0">
                  <td colspan="7" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading...
                  </td>
                </tr>
                <tr v-if="!loading && sortedStudents.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">No students found matching search.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Student Detail & History Modal -->
      <div class="modal fade" id="studentDetailModal" tabindex="-1" aria-labelledby="studentDetailModalLabel" aria-hidden="true" ref="detailModal">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0" style="border-radius: 16px;">
            <div class="modal-header bg-light border-0 py-3" style="border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <h5 class="modal-title fw-bold text-dark" id="studentDetailModalLabel">Student Profile & Applications</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4" v-if="selectedStudent">
              <div class="row mb-4">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Full Name</label>
                  <h5 class="fw-bold text-dark">{{ selectedStudent.name }}</h5>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Roll Number</label>
                  <h5 class="fw-semibold text-dark font-monospace">{{ selectedStudent.roll_number }}</h5>
                </div>
              </div>
              <div class="row mb-4">
                <div class="col-md-3 col-6 mb-3">
                  <label class="text-secondary small fw-semibold">Branch</label>
                  <p class="text-dark fw-semibold mb-0">{{ selectedStudent.branch }}</p>
                </div>
                <div class="col-md-3 col-6 mb-3">
                  <label class="text-secondary small fw-semibold">Year</label>
                  <p class="text-dark fw-semibold mb-0">{{ selectedStudent.year }}</p>
                </div>
                <div class="col-md-3 col-6 mb-3">
                  <label class="text-secondary small fw-semibold">CGPA</label>
                  <p class="text-dark fw-bold mb-0 text-primary">{{ selectedStudent.cgpa.toFixed(2) }}</p>
                </div>
                <div class="col-md-3 col-6 mb-3">
                  <label class="text-secondary small fw-semibold">Phone</label>
                  <p class="text-dark mb-0">{{ selectedStudent.phone }}</p>
                </div>
              </div>
              
              <div class="row mb-4">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Email address</label>
                  <p class="text-dark mb-0">{{ selectedStudent.email }}</p>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">LinkedIn Profile</label>
                  <p class="mb-0">
                    <a :href="selectedStudent.linkedin_url" target="_blank" v-if="selectedStudent.linkedin_url" class="text-decoration-none">
                      {{ selectedStudent.linkedin_url }} <i class="bi bi-box-arrow-up-right ms-1"></i>
                    </a>
                    <span v-else class="text-muted">Not provided</span>
                  </p>
                </div>
              </div>

              <div class="row mb-4">
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Skills</label>
                  <div>
                    <span v-for="tag in getSkillsArray(selectedStudent.skills)" :key="tag" class="badge bg-light text-dark border me-1 mb-1">
                      {{ tag }}
                    </span>
                    <span v-if="!selectedStudent.skills" class="text-muted">None listed</span>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="text-secondary small fw-semibold">Resume File</label>
                  <p class="mb-0">
                    <a :href="'/uploads/resumes/' + selectedStudent.resume_filename" target="_blank" v-if="selectedStudent.resume_filename" class="btn btn-sm btn-outline-primary py-1 px-3">
                      <i class="bi bi-file-earmark-pdf me-1"></i> View Resume
                    </a>
                    <span v-else class="text-muted"><i class="bi bi-x-circle me-1"></i> No resume uploaded</span>
                  </p>
                </div>
              </div>

              <!-- Application History -->
              <h5 class="fw-bold text-dark mt-4 mb-3 border-bottom pb-2">Placement Application History</h5>
              <div class="table-responsive">
                <table class="table table-sm table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Company</th>
                      <th>Job Title</th>
                      <th>Applied Date</th>
                      <th>Package</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="app in selectedStudent.applications" :key="app.id">
                      <td class="fw-semibold text-dark">{{ app.company_name }}</td>
                      <td>{{ app.job_title }}</td>
                      <td class="small">{{ formatDate(app.applied_at) }}</td>
                      <td class="fw-semibold text-primary">{{ app.package_lpa }} LPA</td>
                      <td>
                        <span class="badge" :class="getStatusBadgeClass(app.status)">
                          {{ app.status }}
                        </span>
                      </td>
                    </tr>
                    <tr v-if="selectedStudent.applications.length === 0">
                      <td colspan="5" class="text-center text-muted py-3">No placement applications submitted yet.</td>
                    </tr>
                  </tbody>
                </table>
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
      students: [],
      search: '',
      loading: false,
      selectedStudent: null,
      sortBy: 'name',
      sortDesc: false,
      modalInstance: null
    };
  },
  computed: {
    sortedStudents() {
      return [...this.students].sort((a, b) => {
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
    this.fetchStudents();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    fetchStudents() {
      this.loading = true;
      axios.get('/api/admin/students', {
        params: {
          search: this.search
        }
      })
      .then(response => {
        this.students = response.data.data;
      })
      .catch(err => {
        alert('Failed to load students list');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    blacklistStudent(id) {
      if (confirm('Are you sure you want to blacklist this student? This will prevent student login.')) {
        axios.put(`/api/admin/students/${id}/blacklist`)
        .then(() => {
          this.fetchStudents();
          if (this.selectedStudent && this.selectedStudent.id === id) {
            this.selectedStudent.is_blacklisted = true;
            this.selectedStudent.is_active = false;
          }
        })
        .catch(err => {
          alert('Failed to blacklist student');
        });
      }
    },
    activateStudent(id) {
      axios.put(`/api/admin/students/${id}/activate`)
      .then(() => {
        this.fetchStudents();
        if (this.selectedStudent && this.selectedStudent.id === id) {
          this.selectedStudent.is_blacklisted = false;
          this.selectedStudent.is_active = true;
        }
      })
      .catch(err => {
        alert('Failed to activate student');
      });
    },
    getSkillsArray(skills) {
      if (!skills) return [];
      return skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    },
    getStatusBadgeClass(status) {
      if (status === 'selected') return 'bg-success';
      if (status === 'shortlisted') return 'bg-warning text-dark';
      if (status === 'rejected') return 'bg-danger';
      return 'bg-primary';
    },
    openDetailsModal(st) {
      this.selectedStudent = st;
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
