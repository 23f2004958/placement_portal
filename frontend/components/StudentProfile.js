window.StudentProfileComponent = {
  template: `
    <div class="container py-4">
      <div class="row g-4">
        <!-- Profile Summary Card -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm text-center p-4 h-100" style="border-radius: 16px;">
            <div class="card-body">
              <div class="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style="width: 80px; height: 80px;">
                <i class="bi bi-person-fill fs-1"></i>
              </div>
              <h4 class="fw-bold text-dark mb-1">{{ studentName }}</h4>
              <p class="text-secondary small mb-3">Student Portal account active</p>
              
              <hr class="my-3">

              <div class="text-start">
                <div class="mb-2">
                  <span class="text-secondary small d-block">Academic Branch</span>
                  <span class="fw-semibold text-dark">{{ profile.branch }}</span>
                </div>
                <div class="mb-2">
                  <span class="text-secondary small d-block">Current Year</span>
                  <span class="fw-semibold text-dark">Year {{ profile.year }} of 4</span>
                </div>
                <div class="mb-2">
                  <span class="text-secondary small d-block">Verified CGPA</span>
                  <span class="fw-bold text-primary">{{ profile.cgpa }} / 10.00</span>
                </div>
                <div class="mb-2">
                  <span class="text-secondary small d-block">Roll Number</span>
                  <span class="font-monospace fw-semibold text-dark">{{ profile.roll_number }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Form Card -->
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm p-4 h-100" style="border-radius: 16px;">
            <div class="card-body">
              <h4 class="fw-bold text-dark mb-4">Edit Profile Settings</h4>

              <div v-if="error" class="alert alert-danger py-2 small" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
              </div>

              <div v-if="success" class="alert alert-success py-2 small" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i>Profile details saved successfully!
              </div>

              <form @submit.prevent="saveProfile">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label text-secondary fw-semibold small">Contact Phone (10 digits) *</label>
                    <input type="tel" class="form-control" v-model="profile.phone" required placeholder=" ">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label text-secondary fw-semibold small">LinkedIn Profile URL</label>
                    <input type="url" class="form-control" v-model="profile.linkedin_url" placeholder=" ">
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label text-secondary fw-semibold small">Skills (Comma-separated tags)</label>
                  <input type="text" class="form-control" v-model="profile.skills" placeholder=" ">
                  <div class="form-text small">Enter skills separated by commas. They will display as tags in your resume summary.</div>
                </div>

                <div class="mb-3">
                  <label class="form-label text-secondary fw-semibold small">Education Details *</label>
                  <textarea class="form-control" rows="3" v-model="profile.education" required placeholder="Describe your academic degrees, schools, and years..."></textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label text-secondary fw-semibold small">Experience Details *</label>
                  <textarea class="form-control" rows="3" v-model="profile.experience" required placeholder="Describe your internships, projects, or work history..."></textarea>
                </div>

                <!-- Resume Upload Section -->
                <div class="mb-4 p-3 bg-light rounded-3">
                  <label class="form-label text-dark fw-bold mb-2">Resume Document</label>
                  
                  <div class="d-flex align-items-center mb-3">
                    <div class="me-3 text-secondary">
                      <i class="bi bi-file-earmark-pdf-fill text-danger fs-1" v-if="profile.resume_filename"></i>
                      <i class="bi bi-file-earmark-arrow-up fs-1" v-else></i>
                    </div>
                    <div>
                      <span class="d-block fw-semibold text-dark" v-if="profile.resume_filename">
                        {{ profile.resume_filename }}
                      </span>
                      <span class="d-block text-secondary small" v-else>
                        No resume uploaded. Upload a PDF/DOCX resume file (Max 5MB).
                      </span>
                      <a :href="'/uploads/resumes/' + profile.resume_filename" target="_blank" class="small text-primary text-decoration-none fw-semibold" v-if="profile.resume_filename">
                        <i class="bi bi-eye"></i> View Current Resume
                      </a>
                    </div>
                  </div>

                  <div class="input-group">
                    <input type="file" class="form-control" id="resumeFileInput" @change="uploadResume" accept=".pdf,.docx">
                    <label class="input-group-text btn-outline-secondary" for="resumeFileInput">
                      <span v-if="uploading" class="spinner-border spinner-border-sm me-1" role="status"></span>
                      {{ uploading ? 'Uploading...' : 'Upload File' }}
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  class="btn btn-primary px-4 py-2 d-flex align-items-center justify-content-center" 
                  :disabled="loading"
                  style="border-radius: 8px; font-weight: 600;"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <span>{{ loading ? 'Saving Settings...' : 'Save Profile Details' }}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      profile: {
        phone: '',
        linkedin_url: '',
        skills: '',
        resume_filename: '',
        branch: '',
        year: 1,
        cgpa: 0,
        roll_number: '',
        education: '',
        experience: ''
      },
      studentName: '',
      loading: false,
      uploading: false,
      error: '',
      success: false
    };
  },
  mounted() {
    this.fetchProfile();
  },
  methods: {
    fetchProfile() {
      // Get self details
      axios.get('/api/auth/me')
      .then(response => {
        const u = response.data.data.user;
        const p = response.data.data.profile;
        this.studentName = u.name;
        if (p) {
          this.profile = {
            phone: p.phone,
            linkedin_url: p.linkedin_url || '',
            skills: p.skills || '',
            resume_filename: p.resume_filename || '',
            branch: p.branch,
            year: p.year,
            cgpa: p.cgpa,
            roll_number: p.roll_number,
            education: p.education || '',
            experience: p.experience || ''
          };
        }
      })
      .catch(err => {
        alert('Failed to load profile details');
      });
    },
    saveProfile() {
      this.error = '';
      this.success = false;

      // Validation
      if (this.profile.phone.length !== 10 || !/^\d+$/.test(this.profile.phone)) {
        this.error = 'Phone number must be exactly 10 digits.';
        return;
      }
      if (!this.profile.education || !this.profile.experience) {
        this.error = 'Education and experience fields are required.';
        return;
      }

      this.loading = true;
      axios.put('/api/student/profile', {
        phone: this.profile.phone,
        linkedin_url: this.profile.linkedin_url,
        skills: this.profile.skills,
        education: this.profile.education,
        experience: this.profile.experience
      })
      .then(() => {
        this.success = true;
        this.fetchProfile();
        setTimeout(() => {
          this.success = false;
        }, 3000);
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = 'Failed to update profile settings.';
        }
      })
      .finally(() => {
        this.loading = false;
      });
    },
    uploadResume(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the limit of 5MB.');
        return;
      }

      const ext = file.name.rsplit ? file.name.rsplit('.', 1)[1].lower() : file.name.split('.').pop().toLowerCase();
      if (ext !== 'pdf' && ext !== 'docx') {
        alert('Only PDF and DOCX documents are supported.');
        return;
      }

      this.uploading = true;
      const formData = new FormData();
      formData.append('resume', file);

      axios.post('/api/student/profile/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(response => {
        this.profile.resume_filename = response.data.data.resume_filename;
        alert('Resume document uploaded successfully!');
        this.fetchProfile();
      })
      .catch(err => {
        alert('Failed to upload resume document.');
      })
      .finally(() => {
        this.uploading = false;
        // reset input
        e.target.value = '';
      });
    }
  }
};
