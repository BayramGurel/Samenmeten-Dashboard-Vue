<template>
  <!-- Sidebar with map-specific information -->
  <MapSidebarInfo
    :geojson="geojson"
    :formatted-property="formattedProperty"
    :description="description"
  />
  <!-- Map container -->
  <div class="container-fluid" id="czoom">
    <!-- Control panel anchored above the map. Use responsive classes rather than zoom hacks -->
    <div class="position-absolute start-0 shadow mt-3 ms-3 col-md-4 col-8 custom-div">
      <!-- Legend and time slider controls -->
      <DashboardLegendTabs
        v-model:timeValue="timeValue"
        v-model:selectedDay="selectedDay"
        v-model:selectedProperty="selectedProperty"
        :day-names="dayNames"
        :is-playing="isPlaying"
        :button-class="buttonClass"
        :formatted-property="formattedProperty"
        :legenda-values="legendaValues"
        :colors="colors"
        :concentration-values="concentrationValues"
        :is-from="isFrom"
        @reload-page="reloadPage"
        @update-layer="updateLayer"
        @stop-slider="stopSlider"
        @toggle-slider="toggleSlider"
        @clear-input="clearInput"
      />

      <!-- Data tools (filters, downloads) -->
      <DashboardDataTools
        ref="dataTools"
        :regio="regio"
        :gemeente="gemeente"
        :station-name="stationName"
        :search="search"
        :interpolation-status="interpolationStatus"
        :is-local-file="isLocalFile"
        :file-name="fileName"
        @update-layer="updateLayer"
        @select-matching-stations="selectMatchingStations"
        @update:regio="updateRegio"
        @update:gemeente="updateGemeente"
        @update:station-name="updateStationName"
        @update:search="updateSearch"
        @update:interpolation-status="updateInterpolationStatus"
        @clear-input="clearInput"
        @download-geojson="downloadGeoJSON"
        @download-csv="downloadCSV"
      />
    </div>
    <!-- Modal for station details -->
    <DashboardStationModal
      :formatted-property="formattedProperty"
      :properties="properties"
    />
    <!-- Toast for download notifications -->
    <DashboardToast ref="toastPanel" :time-string="timeString" />
  </div>
</template>

<!--
  This component renders the main dashboard for the Samen Meten application.
  The logic has been refactored into composables and subcomponents to improve
  maintainability. Map-specific logic lives in useMap, data fetching and
  filtering lives in useData, and chart rendering lives in StationChart.
-->
<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
} from 'vue';
import MapSidebarInfo from '@/components/samen-meten/MapSidebarInfo.vue';
import DashboardLegendTabs from '@/components/samen-meten/DashboardLegendTabs.vue';
import DashboardDataTools from '@/components/samen-meten/DashboardDataTools.vue';
import DashboardStationModal from '@/components/samen-meten/DashboardStationModal.vue';
import DashboardToast from '@/components/samen-meten/DashboardToast.vue';
import { data as initialData } from '@/data/variable.js';
import { useData } from '@/composables/useData';
import { useMap } from '@/composables/useMap';
import { getColor } from '@/utils/samenMetenColors';

/**
 * Deep clone initial state to avoid mutating imported data directly.
 */
const state = reactive(JSON.parse(JSON.stringify(initialData)));

const timeValue = ref(state.timeValue ?? 0);
const selectedDay = ref('');
const selectedProperty = ref(state.property ?? 'pm25');
const search = ref(state.search ?? '');
const interpolationStatus = ref(state.interpolationStatus ?? 'disable');
const isPlaying = ref(state.isPlaying ?? false);
const properties = ref({});
const timeString = ref('');

const colors = ref(state.colors ?? []);

const {
  geojson,
  regio,
  gemeente,
  stationName,
  description,
  legendaValues,
  concentrationValues,
  isFrom,
  isLocalFile,
  fileName,
  dayNames,
  timeOptions,
  applyPropertyDefinition,
  fetchData,
  updateUniqueItems,
  createCheckboxes,
  getSelectedValues,
  reloadLayer,
  formatDate,
} = useData(state);

const {
  map,
  initializeMap,
  addControls,
  updateMapSourceAndLayer,
  idwInterpolation,
  hideInterpolationLayer,
} = useMap({
  mapContainerId: 'map',
  apiKey: state.API_KEY,
  styleUrls: state.STYLE_URLS,
  styleNames: state.STYLE_NAMES,
  bbox: state.bbox,
  getColor,
  onStationSelect: (props) => {
    properties.value = props;
  },
  onStationDetails: async (props) => {
    properties.value = props;
  },
});

const dataTools = ref(null);
const toastPanel = ref(null);

const buttonClass = computed(() => {
  return isPlaying.value ? 'btn-outline-danger' : 'btn-outline-primary';
});

const formattedProperty = computed(() => {
  const propertyMap = {
    pm25: 'PM2,5',
    pm10: 'PM10',
    no2: 'NO₂',
  };
  const rawProperty = state.property ?? selectedProperty.value;
  return propertyMap[rawProperty] ?? rawProperty;
});

watch(
  () => selectedDay.value,
  (newDay) => {
    if (dayNames.value.includes(newDay)) {
      updateLayer().catch((err) => console.error('Failed to update layer', err));
    }
  },
);

let timeDebounce = null;
watch(
  () => timeValue.value,
  () => {
    if (timeDebounce) clearTimeout(timeDebounce);
    timeDebounce = setTimeout(() => {
      updateLayer().catch((err) => console.error('Failed to update layer', err));
    }, 200);
  },
);

watch(
  () => interpolationStatus.value,
  () => {
    updateLayer().catch((err) => console.error('Failed to update layer', err));
  },
);

let searchDebounce = null;
watch(
  () => search.value,
  () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      selectMatchingStations();
    }, 150);
  },
);

onMounted(async () => {
  const styleUrl = `https://api.maptiler.com/maps/dataviz/style.json?key=${state.API_KEY}`;
  initializeMap(styleUrl);
  addControls(() => {
    updateLayer().catch((err) => console.error('Layer update failed', err));
  });

  geojson.value = await fetchData(
    'https://dta-samenmeten-api.azurewebsites.net/api/data/stations',
  );

  await Promise.all([
    updateUniqueItems(geojson.value, 'regio'),
    updateUniqueItems(geojson.value, 'Gemeente'),
    updateUniqueItems(geojson.value, 'station_name'),
  ]);

  createCheckboxes('regio', regio.value.map((r) => r.id));
  createCheckboxes('Gemeente', gemeente.value.map((g) => g.id));
  createCheckboxes('station_name', stationName.value.map((s) => s.id));

  selectedDay.value = dayNames.value[0];
  await updateLayer();
});

onUnmounted(() => {
  stopSlider();
  if (map.value) {
    map.value.remove();
  }
});

function updateRegio(list) {
  regio.value = list;
}

function updateGemeente(list) {
  gemeente.value = list;
}

function updateStationName(list) {
  stationName.value = list;
}

function updateSearch(value) {
  search.value = value;
}

function updateInterpolationStatus(value) {
  interpolationStatus.value = value;
}

function getLocalFileInput() {
  return dataTools.value?.localFileRef?.value ?? null;
}

function clearInput(refName) {
  if (refName === 'sDate') {
    selectedDay.value = '';
    return;
  }
  if (refName === 'localFile') {
    const localFileInput = getLocalFileInput();
    if (localFileInput) {
      localFileInput.value = '';
    }
    updateLayer().catch((err) => console.error('Layer update failed', err));
    return;
  }
  updateLayer().catch((err) => console.error('Layer update failed', err));
}

function reloadPage() {
  window.location.reload();
}

function toggleSlider() {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    startSlider();
  } else {
    stopSlider();
  }
}

let sliderInterval = null;

function startSlider() {
  stopSlider();
  const today = formatDate(new Date(), state.days);
  const maxHour = selectedDay.value === today ? new Date().getHours() : 23;
  timeValue.value = 0;
  updateLayer().catch((err) => console.error('Layer update failed', err));
  sliderInterval = setInterval(() => {
    if (timeValue.value < maxHour) {
      timeValue.value++;
      updateLayer().catch((err) => console.error('Layer update failed', err));
    } else {
      stopSlider();
      isPlaying.value = false;
    }
  }, 1550);
}

function stopSlider() {
  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }
}

function selectMatchingStations() {
  const lowerCaseSearch = search.value.toLowerCase();
  stationName.value.forEach((station) => {
    station.checked = station.label.toLowerCase() === lowerCaseSearch;
  });
  updateLayer().catch((err) => console.error('Layer update failed', err));
}

async function updateLayer() {
  const property = applyPropertyDefinition(selectedProperty.value);
  const selectedRegio = getSelectedValues('regio');
  const selectedGemeente = getSelectedValues('Gemeente');
  const selectedStName = getSelectedValues('station_name');

  await reloadLayer({
    hour: String(timeValue.value),
    selectedProperty: property,
    selectedDateIndex: Math.max(dayNames.value.indexOf(selectedDay.value), 0),
    selectedRegio,
    selectedGemeente,
    selectedStName,
    interpolationStatus: interpolationStatus.value,
    idwInterpolation,
    hideInterpolationLayer,
    localFileInput: getLocalFileInput(),
  });

  updateMapSourceAndLayer(geojson.value);
}

function toast() {
  const toastElement = toastPanel.value?.toastRef?.value;
  if (!toastElement) return;
  const toastInstance = window.bootstrap.Toast.getOrCreateInstance(toastElement);
  const now = new Date();
  timeString.value = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  toastInstance.show();
}

function downloadGeoJSON() {
  if (!geojson.value) return;
  const dataStr = JSON.stringify(geojson.value);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = `PZH-Luchtkwaliteit_${state.property}.geojson`;
  toast();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCSV() {
  if (!geojson.value) return;
  const header = 'Station naam;Datum en tijd;Property;Regio;Gemeente;Value;Unit\n';
  let csv = header;
  (geojson.value.features ?? geojson.value.Features ?? []).forEach((feature) => {
    const props = feature.properties;
    const stationNameStr = props.station_name ?? 'N/A';
    const measuredTime = props.measured_time
      ? new Date(props.measured_time).toISOString()
      : 'N/A';
    const propertyStr = props.property ?? 'N/A';
    const regioStr = props.regio ?? 'N/A';
    const gemeenteStr = props.Gemeente ?? 'N/A';
    const valueStr = props.value !== undefined ? props.value.toFixed(2) : 'N/A';
    const unitStr = props.unit ?? 'N/A';
    csv += `${stationNameStr}; ${measuredTime}; ${propertyStr}; ${regioStr}; ${gemeenteStr}; ${valueStr}; ${unitStr}\n`;
  });
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
  link.download = 'Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.csv';
  toast();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<!-- Scoped styles to ensure the CSS only applies to this component -->
<style scoped>
/* Hide the native file input */
.input-group input[type='file'] {
  display: none;
}

/* Style the custom file upload button */
.input-group .custom-file-upload {
  color: #fff;
  background-color: #20c997;
}

/* Make the control panel scrollable without affecting the map */
.custom-div {
  position: relative;
  max-height: 97%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
}

/* Slim scrollbars */
*::-webkit-scrollbar {
  width: 0.5vw;
}
*::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 0.5vw;
}
*::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Selection colour */
* ::selection {
  font-family: Arial !important;
  background-color: #d11f3d;
  color: white;
}

/* Focused input label colour */
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
</style>
