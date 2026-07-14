window.PlacementHistoryComponent = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark mb-1">Placement Timeline</h2>
          <p class="text-muted mb-0">Chronological history of your recruitment steps</p>
        </div>
      </div>

      <div class="card border-0 shadow-sm p-5" style="border-radius: 16px;">
        <!-- Timeline container -->
        <div class="position-relative" style="padding-left: 30px;" v-if="history.length > 0">
          
          <!-- Chronological vertical line -->
          <div class="position-absolute" style="top: 0; bottom: 0; left: 10px; width: 2px; background-color: #e2e8f0;"></div>

          <!-- Timeline entries -->
          <div class="mb-5 position-relative" v-for="(entry, index) in history" :key="entry.id">
            <!-- Timeline dot -->
            <div 
              class="position-absolute rounded-circle bg-white d-flex align-items-center justify-content-center border"
              :style="{ 
                left: '-29px', 
                top: '0', 
                width: '18px', 
                height: '18px',
                borderColor: getTimelineColor(entry.status) + ' !important',
                borderWidth: '3px !important'
              }"
            ></div>

            <!-- Content Card -->
            <div class="card border border-light-subtle shadow-sm p-4 ms-2" style="border-radius: 12px; transition: transform 0.2s;">
              <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <div class="d-flex align-items-center mb-1">
                    <h5 class="fw-bold text-dark mb-0 me-2">{{ entry.company_name }}</h5>
                    <span class="badge py-1 px-2 text-uppercase fs-7" :class="getStatusBadgeClass(entry.status)">
                      {{ entry.status }}
                    </span>
                  </div>
                  <h6 class="text-primary fw-semibold mb-2">{{ entry.job_title }}</h6>
                </div>
                <div class="text-end">
                  <span class="badge bg-light text-dark border py-2 px-3 fw-bold fs-6">{{ entry.package_lpa }} LPA</span>
                  <div class="text-muted small mt-1">Applied: {{ formatDate(entry.applied_at) }}</div>
                </div>
              </div>
              
              <div v-if="entry.remarks" class="mt-3 p-3 bg-light rounded-3 small border-start border-primary" style="border-left-width: 4px !important;">
                <strong class="text-dark d-block mb-1">Recruiter Notes:</strong>
                <p class="mb-0 text-secondary">{{ entry.remarks }}</p>
              </div>

            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="text-center py-5 text-muted" v-else>
          <i class="bi bi-calendar2-x fs-1 text-secondary mb-3 d-block"></i>
          <h5>No application history yet</h5>
          <p class="small mb-0">Apply to placement drives to build your recruitment history.</p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      history: [],
      loading: false
    };
  },
  mounted() {
    this.fetchHistory();
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    fetchHistory() {
      this.loading = true;
      axios.get('/api/student/history')
      .then(response => {
        this.history = response.data.data;
      })
      .catch(err => {
        alert('Failed to load placement history');
      })
      .finally(() => {
        this.loading = false;
      });
    },
    getTimelineColor(status) {
      if (status === 'selected') return '#10b981'; // green
      if (status === 'shortlisted') return '#f59e0b'; // orange
      if (status === 'rejected') return '#ef4444'; // red
      return '#3b82f6'; // blue (applied)
    },
    getStatusBadgeClass(status) {
      if (status === 'selected') return 'bg-success text-white';
      if (status === 'shortlisted') return 'bg-warning text-dark';
      if (status === 'rejected') return 'bg-danger text-white';
      return 'bg-primary text-white';
    }
  }
};
