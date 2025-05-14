<template>
  <div class="modal fade" :id="modalId" tabindex="-1" :aria-labelledby="`${modalId}Label`" aria-hidden="true" ref="stationModal">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" :id="`${modalId}Label`">
            Station: {{ stationProperties.station_name || 'N/A' }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="close"></button>
        </div>
        <div class="modal-body">
          <div v-if="stationProperties && Object.keys(stationProperties).length > 0">
            <p class="text-muted small">
              Locatie: Gemeente {{ stationProperties.Gemeente || 'N/A' }}, Regio {{ stationProperties.regio || 'N/A' }}.<br>
              Meting voor: {{ formattedStationProperty }}
              <span v-if="stationProperties.value != null">
                | Huidige waarde: {{ parseFloat(stationProperties.value).toFixed(1) }} {{ stationProperties.unit || '' }}
              </span>
              <span v-if="stationProperties.measured_time">
                | Tijdstip: {{ formatDate(stationProperties.measured_time) }}
              </span>
            </p>
            <hr>
            <h6>Historische gegevens voor {{ stationProperties.station_name }} ({{ formattedStationProperty }})</h6>
            <div class="chart-container mt-3" style="height: 400px; position: relative;">
              <canvas ref="stationChartCanvas"></canvas>
            </div>
          </div>
          <div v-else class="text-center p-5">
            <p>Geen station details beschikbaar.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="close">Sluiten</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns'; // Adapter for date/time scales
import { nl } from 'date-fns/locale';   // Dutch locale for date-fns
import annotationPlugin from 'chartjs-plugin-annotation';

// Register the annotation plugin with Chart.js
Chart.register(annotationPlugin);

export default {
  name: 'StationDetailModal',
  props: {
    showModal: Boolean,
    stationProperties: {
      type: Object,
      default: () => ({}) // Default to an empty object
    },
    chartConfig: {
      type: Object,
      default: () => ({ // Default to an empty object, or a basic structure if preferred
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {}
      })
    },
  },
  data() {
    return {
      modalInstance: null,
      chartInstance: null,
      modalId: 'stationDetailModalUniqueId' // Static ID for simplicity, ensure it's unique if multiple modals of this type could exist (though unlikely here)
    };
  },
  computed: {
    formattedStationProperty() {
      if (!this.stationProperties || !this.stationProperties.property) return 'N/A';
      const map = { 'pm25': 'PM2,5', 'pm10': 'PM10', 'no2': 'NO2' };
      return map[this.stationProperties.property.toLowerCase()] || this.stationProperties.property;
    }
  },
  watch: {
    showModal(newValue) {
      if (this.modalInstance) { // Ensure modalInstance is initialized
        if (newValue) {
          this.modalInstance.show();
        } else {
          this.modalInstance.hide();
        }
      }
    },
    chartConfig: {
      handler(newConfig) {
        // Only attempt to render if the modal is supposed to be visible and config is valid
        if (newConfig && this.showModal && this.$refs.stationChartCanvas) {
          this.$nextTick(() => { // Ensure canvas element is in DOM and ready
            this.renderChart(newConfig);
          });
        } else if (!newConfig && this.chartInstance) {
          // If config is cleared, destroy the chart
          this.chartInstance.destroy();
          this.chartInstance = null;
        }
      },
      deep: true // Watch for nested changes in chartConfig
    }
  },
  mounted() {
    // Initialize Bootstrap modal instance
    if (window.bootstrap && this.$refs.stationModal) {
      this.modalInstance = new window.bootstrap.Modal(this.$refs.stationModal);
      // Listen for the Bootstrap event when the modal is hidden
      this.$refs.stationModal.addEventListener('hidden.bs.modal', () => {
        this.$emit('close-modal'); // Inform parent component
        if (this.chartInstance) {
          this.chartInstance.destroy(); // Clean up chart instance
          this.chartInstance = null;
        }
      });
    }
  },
  beforeUnmount() {
    // Clean up Bootstrap modal instance and event listener
    if (this.$refs.stationModal && this.modalInstance) {
      // Bootstrap 5.1+ might have a dispose method.
      if (typeof this.modalInstance.dispose === 'function') {
        this.modalInstance.dispose();
      }
      // Remove event listener if added, though Bootstrap's dispose should handle this.
    }
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  },
  methods: {
    close() {
      this.$emit('close-modal'); // Also explicitly emit if closed via button
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      // Check if date is valid
      return isNaN(date.getTime()) ? 'Ongeldige datum' : date.toLocaleString('nl-NL', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Amsterdam' // Display in local Dutch time
      });
    },
    renderChart(config) {
      // Destroy existing chart instance before rendering a new one
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }

      const canvas = this.$refs.stationChartCanvas;
      // Proceed only if canvas exists and config with data is provided
      if (canvas && config && config.data && config.data.datasets) {
        // Default options for the chart, can be overridden by config.options
        const defaultChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              adapters: { date: { locale: nl } }, // Apply Dutch locale for date-fns adapter
              time: {
                unit: 'hour',
                tooltipFormat: 'dd MMM yyyy HH:mm', // Example: 14 May 2025 15:30
                displayFormats: {
                  hour: 'HH:mm', // Display format for hour unit on the axis
                  day: 'dd MMM'   // Display format for day unit
                }
              },
              title: { display: true, text: 'Tijd (uur, GMT)' }, // X-axis title
              grid: { display: false } // Hide grid lines for X-axis
            },
            y: {
              beginAtZero: true, // Start Y-axis at zero
              title: { display: true, text: `Concentratie (${this.stationProperties.unit || 'µg/m³'})` }, // Y-axis title
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top', // Position of the legend
              labels: { font: { size: 10 } } // Font size for legend labels
            },
            tooltip: {
              mode: 'index', // Show tooltips for all datasets at the same X-axis index
              intersect: false, // Tooltip will display even if not hovering directly over point
              callbacks: {
                title: function(tooltipItems) {
                  // Custom title for tooltip using the date of the first item
                  if (tooltipItems.length > 0) {
                    const date = new Date(tooltipItems[0].parsed.x);
                    // Format date to a readable string (e.g., "14 mei 2025, 15:30")
                    return date.toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Amsterdam' });
                  }
                  return '';
                }
              }
            },
            // Annotation plugin options would be part of the passed 'config.options.plugins.annotation'
          }
        };

        // Merge default options with options from chartConfig prop
        const finalOptions = { ...defaultChartOptions, ...config.options };
        // Deep merge for scales and plugins if necessary, or ensure parent sends complete structures
        if (config.options && config.options.scales) {
          finalOptions.scales = { ...defaultChartOptions.scales, ...config.options.scales};
          if(config.options.scales.x) finalOptions.scales.x = {...defaultChartOptions.scales.x, ...config.options.scales.x};
          if(config.options.scales.y) finalOptions.scales.y = {...defaultChartOptions.scales.y, ...config.options.scales.y};
        }
        if (config.options && config.options.plugins) {
          finalOptions.plugins = { ...defaultChartOptions.plugins, ...config.options.plugins };
          if(config.options.plugins.legend) finalOptions.plugins.legend = {...defaultChartOptions.plugins.legend, ...config.options.plugins.legend};
          if(config.options.plugins.tooltip) finalOptions.plugins.tooltip = {...defaultChartOptions.plugins.tooltip, ...config.options.plugins.tooltip};
          // Annotation plugin options should be passed within config.options.plugins.annotation
        }


        this.chartInstance = new Chart(canvas, {
          type: config.type || 'bar', // Default to 'bar' chart if type not specified
          data: config.data,
          options: finalOptions
        });

      } else if (canvas && config && config.data && config.data.labels && config.data.labels[0] && config.data.labels[0].startsWith("Geen data")) {
        // If "Geen data" message is in labels, display it on the canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Arial';
        ctx.fillText(config.data.labels[0], canvas.width / 2, canvas.height / 2);
      }
    }
  },
  emits: ['close-modal'] // Declare emitted events
};
</script>

<style scoped>
.modal-xl {
  max-width: 90%; /* Allow modal to be wider on large screens */
}
.chart-container {
  min-height: 300px; /* Ensure canvas has a minimum height for chart visibility */
  /* position: relative; is already in template style, good for chart.js responsiveness */
}
.modal-body p.small {
  font-size: 0.85rem; /* Slightly smaller text for details */
}
.modal-title {
  font-size: 1.1rem; /* Slightly smaller modal title */
}
</style>