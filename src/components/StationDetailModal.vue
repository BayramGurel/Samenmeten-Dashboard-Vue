<template>
  <div
      class="modal fade"
      ref="modalRef"
      id="stationDetailModal"
      tabindex="-1"
      aria-labelledby="stationDetailModalLabel"
      aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable" id="czoom-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title text-primary-emphasis" id="stationDetailModalLabel">
            Details Station: {{ stationProperties?.station_name || 'Laden...' }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="stationProperties" class="mb-3">
            <p class="text-muted small">
              Locatie: Gemeente {{ stationProperties.Gemeente || 'N/A' }} - Regio {{ stationProperties.regio || 'N/A' }}.<br>
              Geselecteerde parameter: <strong class="text-primary">{{ stationProperties.property?.toUpperCase() || 'N/A' }}</strong>
            </p>
          </div>
          <hr v-if="stationProperties">

          <h6 class="text-center pt-1 pb-2">Historische data (laatste 30 dagen, per uur UTC)</h6>

          <div class="chart-container position-relative">
            <div v-if="isLoadingChart" class="chart-overlay d-flex justify-content-center align-items-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Grafiek laden...</span>
              </div>
            </div>
            <div v-if="chartError" class="chart-overlay text-center text-danger bg-light p-3 rounded">
              <i class="bi bi-exclamation-triangle-fill me-2"></i> Fout bij laden grafiek:<br>
              <small>{{ chartError }}</small>
            </div>
            <div :class="{ 'opacity-25': isLoadingChart || chartError }">
              <canvas ref="chartCanvasRef"></canvas>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" @click="closeModal">Sluiten</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, inject, defineExpose } from 'vue';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

const props = defineProps({
  showModal: {
    type: Boolean,
    required: true
  },
  stationProperties: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['request-chart-data', 'close-modal']);

const getColor = inject('getColor');
const dayColors = inject('dayColors');

const modalRef = ref(null);
const chartCanvasRef = ref(null);
const chartInstance = ref(null);
const isLoadingChart = ref(false);
const chartError = ref(null);
const modal = ref(null);

onMounted(() => {
  if (modalRef.value) {
    modal.value = new window.bootstrap.Modal(modalRef.value);
    modalRef.value.addEventListener('hidden.bs.modal', () => {
      emit('close-modal');
      destroyChart();
    });
  }
});

onBeforeUnmount(() => {
  destroyChart();
  modal.value?.dispose();
});

watch(() => props.showModal, (newValue) => {
  if (newValue) {
    modal.value?.show();
    if (props.stationProperties) {
      requestDataForChart();
    }
  } else {
    modal.value?.hide();
  }
});

watch(() => props.stationProperties, (newProps) => {
  if (props.showModal && newProps) {
    requestDataForChart();
  } else if (!newProps) {
    destroyChart();
    chartError.value = null;
    isLoadingChart.value = false;
  }
}, { deep: true });

function closeModal() {
  emit('close-modal');
}

function requestDataForChart() {
  if (!props.stationProperties) return;
  console.log('Requesting chart data...');
  isLoadingChart.value = true;
  chartError.value = null;
  destroyChart();
  emit('request-chart-data', {
    stationName: props.stationProperties.station_name,
    property: props.stationProperties.property,
    locationUuid: props.stationProperties.location_uuid
  });
}

function createChart(chartData) {
  if (!chartCanvasRef.value || !chartData || !chartData.labels || !chartData.datasets) {
    console.error("Cannot create chart: canvas reference or data missing.", chartData);
    chartError.value = "Kon grafiekdata niet verwerken.";
    isLoadingChart.value = false;
    return;
  }
  if (chartInstance.value) {
    destroyChart();
  }

  const ctx = chartCanvasRef.value.getContext('2d');
  const currentProperty = props.stationProperties?.property || 'pm25';
  const yMinAnnotation = currentProperty === "pm25" ? 25 : 40;

  chartInstance.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: chartData.datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          stacked: false,
          title: { display: true, text: 'Uur van de dag (UTC)' },
          grid: { display: false }
        },
        y: {
          stacked: false,
          beginAtZero: true,
          title: { display: true, text: `Concentratie (${chartData.datasets[0]?.unit || 'µg/m³'})` },
          suggestedMax: yMinAnnotation * 1.5
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 15,
            font: { size: 10 },
          },
        },
        tooltip: {
          enabled: true,
          boxPadding: 3,
          callbacks: {
            title: function(tooltipItems) {
              const datasetLabel = tooltipItems[0]?.dataset.label || '';
              const timeLabel = tooltipItems[0]?.label || '';
              return `${datasetLabel} - ${timeLabel}`;
            },
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) { label += ': '; }
              if (context.parsed.y !== null) {
                label += `${context.parsed.y.toFixed(1)} ${context.dataset.unit || 'µg/m³'}`;
              } else {
                label = 'Geen data';
              }
              return label;
            }
          }
        },
        annotation: {
          annotations: {
            thresholdLine: {
              type: 'line',
              yMin: yMinAnnotation,
              yMax: yMinAnnotation,
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                content: currentProperty === "pm25" ? 'WHO Advies (PM2.5 > 25)' : 'WHO Advies (PM10/NO2 > 40)',
                enabled: true,
                position: 'end',
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                font: { size: 9 },
                color: 'white',
                xAdjust: -50
              }
            }
          }
        }
      }
    }
  });
}

function destroyChart() {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
}

function receiveChartData(data) {
  isLoadingChart.value = false;
  chartError.value = null;
  nextTick(() => {
    createChart(data);
  });
}

function handleChartError(error) {
  console.error("Handling chart error:", error);
  isLoadingChart.value = false;
  chartError.value = error?.message || "Kon grafiek data niet ophalen.";
  destroyChart();
}

defineExpose({
  receiveChartData,
  handleChartError
});

</script>

<style scoped>
.modal-body {
}

.chart-container {
  min-height: 300px;
  height: 50vh;
  position: relative;
  width: 100%;
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

#czoom-modal {
}

.modal-dialog-scrollable .modal-body {
  overflow-y: auto;
}

canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>