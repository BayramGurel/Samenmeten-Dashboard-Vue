<template>
  <div class="modal-content">
    <div class="modal-header">
      <h5 class="modal-title text-center" id="modalWithBothOptionsLabel">Informatie over de station: <span v-text="properties?.station_name || 'N/A'"></span></h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      <div class="card-body">
        <p class="text-muted">
          Het station bevindt zich in de gemeente {{ properties?.Gemeente || 'N/A' }}.<br>
          De fijnstofwaarde {{ formattedProperty }} is gemeten op dit station, dat zich in de regio
          {{ properties?.regio || 'N/A' }} bevindt.<br>
        </p>
        <h6 class="text-center pt-3">Grafische representatie van {{ properties?.station_name || 'N/A' }}</h6>
        <div class="d-flex justify-content-center overflow-auto" style="min-height: 300px;"> <canvas ref="myChartRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import Chart from 'chart.js/auto';
// import ChartjsPluginAnnotation from 'chartjs-plugin-annotation';
// Chart.register(ChartjsPluginAnnotation);

const props = defineProps({
  properties: Object,
  formattedProperty: String,
  rawObservationData: Object,
  getColor: Function,
  dayColors: Array,
  chartOptionsFromParent: Object,
});

const myChartRef = ref(null);
const chartInstance = ref(null);

// --- Verbatim Moved Methods ---

function processData(observationData) { /* Verbatim */
  if (!observationData || !observationData.Features) return {};
  return observationData.Features.reduce((dataByDate, feature) => {
    if (!feature?.properties?.measured_time || feature.properties.value === undefined) return dataByDate;
    let date; try { date = new Date(feature.properties.measured_time); if(isNaN(date.getTime())) throw Error(); } catch { return dataByDate; }
    let dateString = date.toISOString().split('T')[0]; let hourIndex = date.getUTCHours();
    if (!dataByDate[dateString]) { dataByDate[dateString] = { times: Array.from({length: 24}, (_, i) => i < 10 ? `0${i}:00 GMT` : `${i}:00 GMT`), values: Array(24).fill(null) }; }
    if (hourIndex >= 0 && hourIndex < 24) { dataByDate[dateString].values[hourIndex] = feature.properties.value; }
    return dataByDate;
  }, {});
}

function createDatasets(property, dataByDate) { /* Verbatim */
  if (!dataByDate || Object.keys(dataByDate).length === 0) return [];
  const datasets = Object.entries(dataByDate).map(([date, data]) => {
    const values = data.values;
    const backgroundColors = values.map(value => props.getColor ? props.getColor(value, property, 0.4) : 'rgba(128,128,128,0.4)');
    const dateObj = new Date(date + 'T00:00:00Z');
    const borderColor = props.dayColors ? props.dayColors[dateObj.getUTCDay()] : '#CCCCCC';
    const labelDate = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
    return { label: labelDate, dateString: date, data: values, originalBackgroundColor: [...backgroundColors], backgroundColor: backgroundColors, borderColor: borderColor, borderWidth: 2, borderRadius: { topLeft: 3, topRight: 3 }, hidden: true };
  });
  datasets.sort((a, b) => a.dateString.localeCompare(b.dateString));
  if (datasets.length > 0) { datasets[datasets.length - 1].hidden = false; }
  return datasets;
}

function createChart(propertyChartCanvas, property, labels, datasets) { /* Verbatim */
  if (!propertyChartCanvas) return null;
  const options = props.chartOptionsFromParent || { responsive: true, maintainAspectRatio: false };
  // --- Original annotation logic - kept verbatim ---
  const yMin = property === "pm25" ? 25 : 40;
  const annotationPluginOptions = { // Define annotation part based on original options structure
    annotation: {
      annotations: [ { type: 'box', yMin: yMin, backgroundColor: 'rgba(230, 25, 75, 0.1)', borderColor: 'rgba(230, 25, 75, 1)', label: { content: 'Bad', enabled: true, position: 'center', } }, ]
    }
  };
  // --- End Original annotation ---
  const validDatasets = Array.isArray(datasets) ? datasets : [];
  if (chartInstance.value) { chartInstance.value.destroy(); }
  chartInstance.value = new Chart(propertyChartCanvas, {
    type: 'bar',
    data: { labels: labels || [], datasets: validDatasets },
    options: {
      ...options, // Spread base options
      plugins: { // Merge plugins carefully
        ...(options.plugins || {}), // Keep existing plugins from base options
        ...annotationPluginOptions, // Add/overwrite annotation plugin config
        legend: { // Ensure local legend handlers are used
          ...(options.plugins?.legend || {}), // Keep existing legend config
          display: true,
          onHover: (evt, item, legend) => handleHover(evt, item, legend), // Use local handler
          onLeave: (evt, item, legend) => handleLeave(evt, item, legend)  // Use local handler
        }
      }
    }
  });
  // Original returned instance, not needed here as we use chartInstance ref
  // return this.myChart; // Original line
}

// async handleHover/handleLeave - Reverted to Verbatim original logic
async function handleHover(evt, item, legend) { // Keep original async keyword
  // Original string manipulation logic
  legend.chart.data.datasets.forEach((dataset, datasetIndex) => {
    dataset.backgroundColor = datasetIndex === item.datasetIndex ?
        dataset.originalBackgroundColor.map(color => {
          let rgba = color.slice(0, -1).split(","); // Original logic
          rgba[3] = '0.8)'; // Original logic
          return rgba.join(","); // Original logic
        }) :
        dataset.originalBackgroundColor.map(color => {
          let rgba = color.slice(0, -1).split(","); // Original logic
          rgba[3] = '0.1)'; // Original logic
          return rgba.join(","); // Original logic
        });
  });
  legend.chart.update(); // Original call
}

async function handleLeave(evt, item, legend) { // Keep original async keyword
  // Original logic
  legend.chart.data.datasets.forEach(dataset => {
    dataset.backgroundColor = dataset.originalBackgroundColor;
  });
  legend.chart.update(); // Original call
}


// --- Watcher ---
watch(() => props.rawObservationData, (newData) => {
  if (newData && myChartRef.value) {
    const dataByDate = processData(newData); // Call local method
    if (Object.keys(dataByDate).length > 0) {
      const datasets = createDatasets(props.properties?.property || '', dataByDate); // Call local method
      const firstDateKey = Object.keys(dataByDate).sort()[0];
      const labels = dataByDate[firstDateKey]?.times || [];
      createChart(myChartRef.value, props.properties?.property || '', labels, datasets); // Call local method
    } else {
      if (chartInstance.value) { chartInstance.value.destroy(); chartInstance.value = null; }
    }
  } else {
    if (chartInstance.value) { chartInstance.value.destroy(); chartInstance.value = null; }
  }
}, { deep: true }); // Keep deep watch

// --- Lifecycle hooks ---
onBeforeUnmount(() => {
  if (chartInstance.value) { chartInstance.value.destroy(); chartInstance.value = null; }
});

</script>

<style scoped>
/* Verbatim styles associated with modal content, chart canvas */
.modal-content { /* Example */ }
canvas { max-width: 100%; }
/* Verbatim modal zoom style - keep commented out as it targets parent element */
/* #czoom2 .modal-content { zoom: 113%; } */
</style>