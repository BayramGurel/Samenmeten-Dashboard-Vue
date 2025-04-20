<template>
  <div
      id="stationDetailModal"
      ref="modalElement"
      class="modal fade"
      tabindex="-1"
      aria-labelledby="stationDetailModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static" data-bs-keyboard="false"  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable" id="modalDialogContent">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="stationDetailModalLabel" class="modal-title">
            Station Details: {{ stationProperties?.station_name || 'N/A' }}
          </h5>
          <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeModal"
          ></button>
        </div>

        <div class="modal-body">
          <div v-if="stationProperties" class="station-details mb-4 px-md-3">
            <p class="lead fs-6">
              Locatie: Gemeente {{ stationProperties.Gemeente || 'Onbekend' }}, Regio {{ stationProperties.regio || 'Onbekend' }}.
              <br />
              Component: <strong>{{ formattedProperty }}</strong>
              <span v-if="stationProperties.value != null">
                (Laatste waarde: {{ stationProperties.value?.toFixed(2) || 'N/A' }} {{ stationProperties.unit || '' }})
              </span>
            </p>
            <hr>
          </div>

          <div class="chart-container px-md-2">
            <h6 class="text-center pt-1 mb-3 fw-semibold">
              Metingen per uur: {{ formattedProperty }} (µg/m³)
            </h6>
            <div v-if="isLoading" class="loading-placeholder text-center p-5">
              <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Grafiek laden...</span>
              </div>
              <p class="mt-3 text-muted">Grafiekgegevens laden...</p>
            </div>
            <div v-else-if="chartDataError" class="alert alert-warning text-center" role="alert">
              <i class="bi bi-exclamation-triangle-fill me-2"></i> Kon grafiekgegevens niet laden: {{ chartDataError }}
            </div>
            <div v-else class="d-flex justify-content-center chart-canvas-wrapper">
              <canvas ref="chartCanvasRef"></canvas>
            </div>
          </div>

        </div> <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="closeModal">
          Sluiten
        </button>
      </div>
      </div> </div> </div> </template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, inject, computed } from 'vue';
// Import Chart.js and necessary components
// Make sure to install: npm install chart.js chartjs-plugin-annotation
import { Chart, registerables } from 'chart.js';
import ChartAnnotationsPlugin from 'chartjs-plugin-annotation';
// Optional: Import Bootstrap's Modal JS if programmatic control is needed
// import { Modal } from 'bootstrap';

// Register Chart.js components and plugins
Chart.register(...registerables, ChartAnnotationsPlugin);

// --- Props ---
const props = defineProps({
  // Expects the 'properties' object from a clicked GeoJSON feature
  stationProperties: {
    type: Object,
    required: true,
    default: () => ({}), // Provide default empty object
    validator: (value) => value && typeof value === 'object' // Basic validation
  },
  // Array of colors for chart borders, likely based on day of week index
  dayColors: {
    type: Array,
    default: () => ['#0d6efd', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754'] // Example default colors
  },
  // Base chart options passed from parent (e.g., for styling, common plugins)
  chartOptions: {
    type: Object,
    default: () => ({
      plugins: { // Ensure plugins object exists for merging
        legend: {},
        tooltip: {},
        annotation: {}
      }
    })
  },
  // getColorFunction is injected below instead of passed as prop
});

// --- Emits ---
const emit = defineEmits([
  'close-modal',      // Emitted when the modal should be closed
  'fetch-chart-data' // Emitted to request chart data from the parent
]);

// --- Inject Dependencies ---
// Inject the getColor function provided by the parent AirQualityDashboard
// Provides default function for safety, though parent should always provide it
const getColor = inject('getColor', () => 'rgba(128, 128, 128, 0.4)'); // Default grey color if not provided

// --- Local State ---
const modalElement = ref(null); // Template ref for the modal root element
const chartCanvasRef = ref(null); // Template ref for the canvas element
const chartInstance = ref(null); // Holds the Chart.js instance
const isLoading = ref(false);    // Flag for loading state
const chartDataError = ref(null); // Holds error message if data loading fails
// let bootstrapModalInstance = null; // To store Bootstrap Modal instance if needed

// --- Computed ---
// Compute formatted property name locally based on received stationProperties
const formattedProperty = computed(() => {
  if (!props.stationProperties?.property) return 'N/A';
  const propertyMap = { 'pm25': 'PM2,5', 'pm10': 'PM10', 'no2': 'NO2' };
  return propertyMap[props.stationProperties.property] || props.stationProperties.property;
});

// --- Methods ---

// Fetch data via parent and render chart
const loadChartDataAndRender = async () => {
  // Ensure required data and functions are available
  if (!props.stationProperties?.station_name || !props.stationProperties?.property || typeof getColor !== 'function') {
    console.warn("Modal: Missing station properties or getColor function for chart.", props.stationProperties);
    chartDataError.value = "Vereiste configuratiegegevens ontbreken.";
    isLoading.value = false; // Ensure loading stops
    return;
  }

  isLoading.value = true;
  chartDataError.value = null;
  destroyChart(); // Clear previous chart instance before loading new data

  try {
    console.log("Modal: Emitting fetch-chart-data with payload:", {
      station_name: props.stationProperties.station_name,
      property: props.stationProperties.property,
      location_uuid: props.stationProperties.location_uuid,
    });

    // Emit event to parent and wait for data via callback
    // This pattern assumes parent listens and calls the callback
    const observationData = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for chart data from parent.")), 15000); // 15s timeout
      emit('fetch-chart-data',
          { // Payload
            station_name: props.stationProperties.station_name,
            property: props.stationProperties.property,
            location_uuid: props.stationProperties.location_uuid, // Pass if available
          },
          (data) => { // Callback function expected from parent
            clearTimeout(timeout); // Clear timeout on successful callback
            resolve(data);
          }
      );
    });


    // Validate received data structure
    if (!observationData || !Array.isArray(observationData.features)) { // Standard is .features
      throw new Error("Ongeldige of lege data ontvangen voor grafiek.");
    }

    console.log(`Modal: Received ${observationData.features.length} observation features.`);
    const dataByDate = processData(observationData); // Process data

    if (Object.keys(dataByDate).length === 0) {
      // Handle case where data is valid but contains no processable entries for the period
      console.warn("Modal: Geen observeerbare gegevens gevonden voor de geselecteerde periode.");
      chartDataError.value = "Geen gegevens gevonden voor de geselecteerde periode."; // User-friendly message
      // Do not throw error here, just show the message
    } else {
      const datasets = createDatasets(props.stationProperties.property, dataByDate); // Create datasets

      await nextTick(); // Ensure canvas is ready in the DOM
      renderChart(dataByDate, datasets); // Render the chart
    }

  } catch (error) {
    console.error(`Modal: Error loading or processing chart data:`, error);
    chartDataError.value = error.message || "Onbekende fout bij laden grafiek.";
  } finally {
    isLoading.value = false; // Ensure loading state is reset
    console.log("Modal: Chart loading process finished.");
  }
};

// Process raw observation data into a structure suitable for Chart.js
const processData = (observationData) => {
  const features = observationData.features || []; // Use standard .features
  return features.reduce((acc, feature) => {
    // Ensure necessary properties exist and value is valid
    if (!feature.properties?.measured_time || feature.properties?.value == null) {
      // console.warn("Skipping feature due to missing time or value:", feature.properties);
      return acc;
    }
    try {
      const date = new Date(feature.properties.measured_time);
      // Validate date before proceeding
      if (isNaN(date.getTime())) {
        console.warn("Invalid date found:", feature.properties.measured_time);
        return acc;
      }
      const dateString = date.toISOString().split('T')[0]; // Group by UTC date string YYYY-MM-DD
      const hourIndex = date.getUTCHours(); // Use UTC hour (0-23)

      // Initialize entry for the date if it doesn't exist
      if (!acc[dateString]) {
        acc[dateString] = {
          times: Array.from({length: 24}, (_, i) => i < 10 ? `0${i}:00 UTC` : `${i}:00 UTC`), // Labels for X-axis
          values: Array(24).fill(null) // Initialize values array with nulls
        };
      }
      // Assign value to the correct hour slot (handles potential duplicates by taking the first one)
      if (acc[dateString].values[hourIndex] === null) {
        acc[dateString].values[hourIndex] = feature.properties.value;
      } else {
        // console.warn(`Duplicate value for ${dateString} hour ${hourIndex}. Keeping first value.`);
      }
    } catch (e) {
      console.warn("Error processing feature date/value:", feature.properties?.measured_time, feature.properties?.value, e);
    }
    return acc;
  }, {});
};

// Create Chart.js dataset objects from processed data
const createDatasets = (property, dataByDate) => {
  const datasets = Object.entries(dataByDate).map(([date, data]) => {
    const values = data.values;
    // Use injected getColor function for background colors
    const backgroundColors = values.map(value => value != null ? getColor(value, property, 0.6) : 'rgba(200, 200, 200, 0.4)'); // Slightly more opaque bars
    const dateObj = new Date(date + 'T00:00:00Z'); // Ensure date string is treated as UTC
    // Get border color based on UTC day of the week
    const borderColor = props.dayColors?.[dateObj.getUTCDay()] || '#6c757d'; // Default grey

    return {
      label: dateObj.toLocaleDateString('nl-NL', { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }), // Format label using UTC date
      dateString: date, // Store original date string for sorting
      data: values,
      backgroundColor: backgroundColors,
      borderColor: borderColor,
      borderWidth: 1, // Slightly thinner border
      borderRadius: { topLeft: 3, topRight: 3 }, // Rounded corners for bars
      hidden: true // Initially hide all datasets except the last one
    };
  });
  // Sort datasets chronologically by date string
  datasets.sort((a, b) => a.dateString.localeCompare(b.dateString));
  // Show the most recent dataset by default
  if (datasets.length > 0) {
    datasets[datasets.length - 1].hidden = false;
  }
  return datasets;
};

// Render the chart using Chart.js
const renderChart = (dataByDate, datasets) => {
  if (!chartCanvasRef.value) {
    console.error("Modal: Canvas element not found for chart rendering.");
    return;
  }
  // Ensure there's data to render
  if (Object.keys(dataByDate).length === 0 || datasets.length === 0) {
    console.warn("Modal: No data available to render chart.");
    chartDataError.value = "Geen verwerkbare gegevens gevonden."; // Update error state
    return;
  }

  const ctx = chartCanvasRef.value.getContext('2d');
  const property = props.stationProperties.property;
  // Determine Y-axis threshold for annotation based on property
  const yLimit = property === "pm25" ? 25 : 40;
  // Find max value across all datasets for dynamic annotation height
  const maxValue = Math.max(...datasets.flatMap(ds => ds.data.filter(v => v !== null)), 0); // Include 0 in case all values are null

  // Prepare labels for the X-axis from the first available date
  const firstDateKey = Object.keys(dataByDate)[0];
  const chartLabels = dataByDate[firstDateKey]?.times || [];

  // Define annotation configuration
  const annotationOptions = {
    annotations: [{
      type: 'box',
      yMin: yLimit, // Start annotation at the threshold
      yMax: Math.max(maxValue, yLimit) + 5, // Extend slightly above the max data value or threshold
      backgroundColor: 'rgba(230, 25, 75, 0.08)',
      borderColor: 'rgba(230, 25, 75, 0.5)',
      borderWidth: 1,
      borderDash: [6, 6], // Dashed line
      label: {
        content: 'GGD Adviesgrens', // Label text
        display: true,
        position: 'start', // Position label at the start of the box (left)
        yAdjust: -5, // Adjust label position slightly above the line
        font: { size: 10 },
        color: 'rgba(230, 25, 75, 0.9)'
      }
    }]
  };

  // Create the Chart.js instance
  chartInstance.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: datasets
    },
    options: {
      ...props.chartOptions, // Spread base options from prop
      responsive: true,
      maintainAspectRatio: false, // Allow chart aspect ratio to change
      interaction: { // Improve hover/tooltip interaction
        intersect: false,
        mode: 'index',
      },
      plugins: {
        ...(props.chartOptions?.plugins || {}), // Merge base plugins
        legend: { // Configure legend
          ...(props.chartOptions?.plugins?.legend || {}),
          display: datasets.length > 1, // Only display legend if multiple datasets exist
          position: 'bottom',
          labels: { boxWidth: 12, padding: 15 }, // Adjust label styling
          onHover: handleHover, // Attach hover handler
          onLeave: handleLeave // Attach leave handler
        },
        annotation: { // Configure annotation plugin
          ...(props.chartOptions?.plugins?.annotation || {}),
          ...annotationOptions
        },
        tooltip: { // Configure tooltips
          ...(props.chartOptions?.plugins?.tooltip || {}),
          callbacks: { // Custom label format
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2) + ' µg/m³'; // Add unit
              } else {
                label += 'N/A'; // Display N/A for null values
              }
              return label;
            }
          }
        }
      },
      scales: { // Configure axes
        y: {
          beginAtZero: true,
          title: { display: true, text: `Concentratie (${formattedProperty.value} µg/m³)` }
        },
        x: {
          title: { display: true, text: 'Uur (UTC)' }
        }
      }
    }
  });
};

// Destroy existing chart instance to prevent memory leaks
const destroyChart = () => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
};

// --- Chart Legend Interaction Handlers ---
// Highlight dataset on legend hover
const handleHover = (evt, item, legend) => {
  if (!legend.chart?.data?.datasets) return;
  const hoveredDatasetIndex = item.datasetIndex;
  legend.chart.data.datasets.forEach((dataset, index) => {
    // Store original colors if not already stored
    if (!dataset.originalBackgroundColor) dataset.originalBackgroundColor = [...dataset.backgroundColor];
    if (!dataset.originalBorderColor) dataset.originalBorderColor = dataset.borderColor; // Store border color too

    const isActive = index === hoveredDatasetIndex;
    // Adjust background alpha and border width
    dataset.backgroundColor = dataset.originalBackgroundColor.map(color => color.replace(/,[^,]+\)/, `, ${isActive ? '0.8' : '0.1'})`));
    dataset.borderColor = isActive ? dataset.originalBorderColor : 'rgba(0,0,0,0)'; // Hide border for non-hovered
    dataset.borderWidth = isActive ? 2 : 1; // Thicker border for hovered
  });
  legend.chart.update('none'); // Update without re-animating
};

// Restore original appearance on legend leave
const handleLeave = (evt, item, legend) => {
  if (!legend.chart?.data?.datasets) return;
  legend.chart.data.datasets.forEach(dataset => {
    // Restore original colors and border if stored
    if (dataset.originalBackgroundColor) dataset.backgroundColor = [...dataset.originalBackgroundColor];
    if (dataset.originalBorderColor) dataset.borderColor = dataset.originalBorderColor;
    dataset.borderWidth = 1; // Reset border width
  });
  legend.chart.update('none'); // Update without re-animating
};


// --- Modal Control ---
// Emit close event to parent
const closeModal = () => {
  emit('close-modal');
};

// --- Lifecycle Hooks ---
onMounted(() => {
  // Load chart data when the component mounts and becomes visible (due to parent's v-if)
  console.log("Modal: Mounted, loading chart data...");
  loadChartDataAndRender();

  // Optional: Hook into Bootstrap modal events if programmatic control needed
  // Requires importing Modal from 'bootstrap'
  // if (modalElement.value) {
  //   bootstrapModalInstance = new Modal(modalElement.value); // Do NOT call .show() here, parent controls visibility
  //   // Listen for Bootstrap's hidden event to ensure parent knows
  //   modalElement.value.addEventListener('hidden.bs.modal', closeModal);
  // }
});

onBeforeUnmount(() => {
  console.log("Modal: Unmounting, destroying chart.");
  destroyChart(); // Ensure chart is destroyed
  // Optional: Cleanup Bootstrap instance and listeners
  // if (modalElement.value) {
  //    modalElement.value.removeEventListener('hidden.bs.modal', closeModal);
  // }
  // bootstrapModalInstance?.dispose();
});

// Watch for changes in stationProperties to reload the chart
watch(() => props.stationProperties, (newProps, oldProps) => {
  // Check if essential properties for reloading have changed
  if (newProps && oldProps && (newProps.station_name !== oldProps.station_name || newProps.property !== oldProps.property)) {
    console.log("Modal: Station properties changed, reloading chart.");
    // Ensure the modal is actually visible (relevant if parent doesn't use v-if)
    if (modalElement.value && modalElement.value.classList.contains('show')) {
      loadChartDataAndRender();
    }
  } else if (newProps && !oldProps) {
    // Handle initial load if props were initially null/undefined (less likely with required prop)
    if (modalElement.value && modalElement.value.classList.contains('show')) {
      loadChartDataAndRender();
    }
  }
}, { deep: true }); // Deep watch needed for object comparison

</script>

<style scoped>
/* Apply zoom using CSS transform for better rendering, optional */
/* #modalDialogContent { */
/* transform: scale(1.13); */
/* transform-origin: center center; */
/* } */

.modal-body {
  /* Ensure body allows scrolling */
  padding-bottom: 1rem; /* Add some padding at the bottom */
}

.chart-container {
  min-height: 300px; /* Ensure minimum height for chart area */
  position: relative; /* Needed for absolute positioning of overlays if any */
}

.chart-canvas-wrapper {
  position: relative;
  /* Define chart height, maintainAspectRatio: false allows this */
  height: 45vh; /* Use viewport height units */
  min-height: 300px; /* Minimum pixel height */
  max-height: 450px; /* Maximum pixel height */
  width: 100%; /* Fill available width */
}

/* Ensure canvas itself fits within the wrapper */
canvas {
  max-width: 100%;
  max-height: 100%;
}

.station-details {
  background-color: #f8f9fa; /* Light background for details section */
  padding: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #dee2e6;
}

.station-details p {
  font-size: 0.95em; /* Slightly smaller font */
  line-height: 1.6; /* Improve readability */
  margin-bottom: 0.5rem; /* Adjust spacing */
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px; /* Match chart container min-height */
  color: #6c757d; /* Muted text color */
}
</style>