<template>
  <div class="d-flex flex-column align-items-center">
    <div v-if="errorMessage" class="alert alert-danger w-100" role="alert">
      {{ errorMessage }}
    </div>
    <div v-if="isLoading" class="text-center my-2" role="status" aria-live="polite">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      <span class="ms-2">Grafiek laden...</span>
    </div>
    <div class="d-flex justify-content-center overflow-auto w-100">
      <canvas
        ref="chartRef"
        :aria-label="`Grafiek van station ${stationName}`"
        role="img"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { data as initialData } from '@/data/variable.js';
import { getColor } from '@/utils/samenMetenColors';

const props = defineProps({
  station: {
    type: Object,
    default: () => ({}),
  },
});

const chartRef = ref(null);
const chartInstance = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');

const stationName = computed(() => props.station?.station_name ?? '');

const dayColors = initialData.dayColors ?? [];

function destroyChart() {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
}

async function fetchData(url) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    keepalive: true,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return await response.json();
}

function processData(observationData) {
  const dataByDate = {};
  (observationData.features ?? observationData.Features ?? []).forEach((feature) => {
    const dateObj = new Date(feature.properties.measured_time ?? '');
    const dateString = dateObj.toISOString().split('T')[0];
    const hourIndex = dateObj.getUTCHours();
    if (!dataByDate[dateString]) {
      dataByDate[dateString] = {
        times: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00 GMT`),
        values: Array(24).fill(null),
      };
    }
    dataByDate[dateString].values[hourIndex] = feature.properties.value;
  });
  return dataByDate;
}

function createDatasets(property, dataByDate) {
  const keys = Object.keys(dataByDate);
  return keys
    .map((date, index) => {
      const { values } = dataByDate[date];
      const backgroundColors = values.map((val) => getColor(val ?? 0, property, '0.4'));
      const dateObj = new Date(date);
      return {
        label: dateObj.toLocaleDateString('nl-NL', {
          weekday: 'long',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        dateString: date,
        data: values,
        originalBackgroundColor: [...backgroundColors],
        backgroundColor: backgroundColors,
        borderColor: dayColors[dateObj.getDay()],
        borderWidth: 2,
        borderRadius: { topLeft: 3, topRight: 3 },
        hidden: index !== keys.length - 1,
      };
    })
    .sort((a, b) => new Date(a.dateString).getTime() - new Date(b.dateString).getTime());
}

function handleHover(evt, item, legend) {
  legend.chart.data.datasets.forEach((dataset, datasetIndex) => {
    dataset.backgroundColor = datasetIndex === item.datasetIndex
      ? dataset.originalBackgroundColor.map((color) => {
        const rgba = color.slice(0, -1).split(',');
        rgba[3] = '0.8)';
        return rgba.join(',');
      })
      : dataset.originalBackgroundColor.map((color) => {
        const rgba = color.slice(0, -1).split(',');
        rgba[3] = '0.1)';
        return rgba.join(',');
      });
  });
  legend.chart.update();
}

function handleLeave(evt, item, legend) {
  legend.chart.data.datasets.forEach((dataset) => {
    dataset.backgroundColor = dataset.originalBackgroundColor;
  });
  legend.chart.update();
}

function createChart(canvas, property, dataByDate, datasets) {
  const yMin = property === 'pm25' ? 25 : 40;
  chartInstance.value = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: dataByDate[Object.keys(dataByDate)[0]].times,
      datasets,
    },
    options: {
      ...initialData.chartOptions,
      plugins: {
        ...initialData.chartOptions?.plugins,
        annotation: {
          annotations: [
            {
              type: 'box',
              yMin,
              backgroundColor: 'rgba(230, 25, 75, 0.1)',
              borderColor: 'rgba(230, 25, 75, 1)',
              label: {
                content: 'Bad',
                enabled: true,
                position: 'center',
              },
            },
          ],
        },
        legend: {
          display: true,
          onHover: (evt, item, legend) => handleHover(evt, item, legend),
          onLeave: (evt, item, legend) => handleLeave(evt, item, legend),
        },
      },
    },
  });
}

async function loadChartForStation() {
  if (!props.station?.station_name || !props.station?.property || !props.station?.location_uuid) {
    destroyChart();
    return;
  }

  destroyChart();
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const url = new URL(
      `https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${encodeURIComponent(
        props.station.station_name ?? '',
      )}&property=${encodeURIComponent(props.station.property ?? '')}&location=${encodeURIComponent(
        props.station.location_uuid ?? '',
      )}`,
    );
    const observationData = await fetchData(url.toString());
    const dataByDate = processData(observationData);
    const datasets = createDatasets(props.station.property ?? '', dataByDate);
    if (chartRef.value) {
      createChart(chartRef.value, props.station.property ?? '', dataByDate, datasets);
    }
  } catch (error) {
    console.error('Error while loading chart', error);
    errorMessage.value = 'Het laden van de grafiek is mislukt. Probeer het later opnieuw.';
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => props.station,
  () => {
    loadChartForStation();
  },
  { immediate: true, deep: true },
);

onBeforeUnmount(() => {
  destroyChart();
});
</script>
