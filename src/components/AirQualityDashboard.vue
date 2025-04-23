<template>
  <div id="app-container" class="position-relative w-100 h-100">
    <MapDisplay
        :geojson="geojsonForMap"
        :map-style-url="currentMapStyleUrl"
        :bbox="bbox"
        :interpolation-params="interpolationParams"
        :property="selectedProperty"
        @map-loaded="handleMapReady"
        @station-clicked="handleStationClickFromMap"
        @style-changed="handleMapStyleChange"
        @interpolation-layer-updated="handleInterpolationLayerUpdate"
        @request-map-instance="provideMapInstance"
        class="position-absolute w-100 h-100"
    />

    <div class="container-fluid position-absolute start-0 mt-3 ms-3 col-md-4 col-8 custom-div" id="czoom" style="z-index: 1; max-height: 97vh; overflow-y: auto;">
      <ControlPanel
          :day-names="dayNames"
          :selected-day="selectedDay"
          :time-value="timeValue"
          :is-playing="isPlaying"
          :selected-property="selectedProperty"
          :formatted-property="formattedProperty"
          :legenda-values="legendaValues"
          :concentration-values="concentrationValues"
          :colors="colors"
          :is-from="isFrom"
          :filter-options="filterOptions"
          :is-local-file="isLocalFile"
          :file-name="fileName"
          :interpolation-status="interpolationStatus"
          :is-loading="isLoading"
          @property-change="handlePropertyChange"
          @time-change="handleTimeChange"
          @date-change="handleDateChange"
          @play-toggle="handlePlayToggle"
          @advanced-filter-change="handleFilterChange"
          @station-search-select="handleStationSearchSelect"
          @interpolation-change="handleInterpolationChange"
          @download-request="handleDownloadRequest"
          @file-upload="handleFileUpload"
          @clear-local-file="handleClearLocalFile"
          @refresh-page="reloadPage"
      />
    </div>

    <SidebarPanel
        :geojson="geojson"
        :formatted-property="formattedProperty"
        :description="description"
    />

    <StationDetailModal
        :show-modal="showStationModal"
        :station-properties="selectedStationPropertiesForModal"
        :get-color-utility="getColor"
        @close-modal="handleCloseModal"
        @request-chart-data="handleChartDataRequest"
        ref="stationModalRef"
    />

    <NotificationToast
        :show="toastShow"
        :message="toastMessage"
        :time-string="toastTimeString"
        type="primary"
        @close-toast="toastShow = false"
    />

    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-primary fw-semibold">Loading data...</p>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, provide, nextTick } from 'vue';
import * as maplibregl from 'maplibre-gl';

import MapDisplay from './MapDisplay.vue';
import ControlPanel from './ControlPanel.vue';
import SidebarPanel from './SidebarPanel.vue';
import StationDetailModal from './StationDetailModal.vue';
import NotificationToast from './NotificationToast.vue';

const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';
const STYLE_URLS = [
  `https://api.maptiler.com/maps/dataviz/style.json?key=`,
  `https://api.maptiler.com/maps/streets-v2/style.json?key=`,
  `https://api.maptiler.com/maps/hybrid/style.json?key=`,
  `https://api.maptiler.com/maps/basic-v2/style.json?key=`,
  `https://api.maptiler.com/maps/satellite/style.json?key=`,
];
const STYLE_NAMES = ['DataViz', 'Streets', 'Hybrid', 'Basic', 'Satellite'];
const DEFAULT_STYLE_INDEX = 0;
const BASE_API_URL = 'https://dta-samenmeten-api.azurewebsites.net/api/data';

const propValues = {
  no2: { property: 'no2', description: '<b>Stikstofdioxide (NO₂)</b> is een gas dat voornamelijk vrijkomt bij verbrandingsprocessen, zoals in het verkeer en de industrie. Het kan leiden tot luchtwegproblemen en draagt bij aan de vorming van zure regen en smog.', legendaValues: ['0-13.3', '13.3-26.6', '26.6-40', '>40'], concentrationValues: ['0', '>40'] },
  pm10: { property: 'pm10', description: '<b>Fijnstof (PM10)</b> zijn deeltjes in de lucht kleiner dan 10 micrometer. Deze deeltjes kunnen afkomstig zijn van verkeer, industrie, landbouw en natuurlijke bronnen. Inademing kan schadelijk zijn voor de gezondheid, met name voor de luchtwegen en het hart- en vaatstelsel.', legendaValues: ['0-13.3', '13.3-26.6', '26.6-40', '>40'], concentrationValues: ['0', '>40'] },
  pm25: { property: 'pm25', description: '<b>Fijnstof (PM2.5)</b> zijn zeer kleine deeltjes in de lucht, kleiner dan 2.5 micrometer. Vanwege hun kleine formaat kunnen ze diep in de longen doordringen en gezondheidsproblemen veroorzaken, zoals ademhalingsproblemen en hart- en vaatziekten. Bronnen zijn vergelijkbaar met PM10, maar omvatten ook verbrandingsprocessen zoals houtstook.', legendaValues: ['0-8.3', '8.3-16.7', '16.7-25', '>25'], concentrationValues: ['0', '>25'] },
  default: { property: 'pm25', description: 'Selecteer een component hierboven.', legendaValues: ['0-8.3', '8.3-16.7', '16.7-25', '>25'], concentrationValues: ['0', '>25'] }
};
const colors = ['#1E90FF', '#48D1CC', '#9ACD32', '#DAA520'];
const dayColors = ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)', 'rgba(128, 128, 128, 1)'];
const days = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const bbox = [[3.773675345120739, 51.64377788724585], [5.031415001585676, 52.3325109475691]];

const isLoading = ref(true);
const mapInstance = ref(null);
const currentMapStyleUrl = ref(`${STYLE_URLS[DEFAULT_STYLE_INDEX]}${API_KEY}`);
const geojson = ref({ type: 'FeatureCollection', features: [] });
const geojsonForMap = ref({ type: 'FeatureCollection', features: [] });
const allStationsGeojson = ref({ type: 'FeatureCollection', features: [] });

const timeValue = ref(new Date().getHours());
const selectedDay = ref('');
const selectedProperty = ref('pm25');
const description = ref(propValues.pm25.description);
const legendaValues = ref(propValues.pm25.legendaValues);
const concentrationValues = ref(propValues.pm25.concentrationValues);

const isPlaying = ref(false);
const sliderInterval = ref(null);
const hourlyUpdateInterval = ref(null);

const filterOptions = reactive({
  regio: [],
  Gemeente: [],
  station_name: [],
});
const selectedFilters = reactive({
  regio: [],
  Gemeente: [],
  station_name: [],
});

const isLocalFile = ref(false);
const localFileData = ref(null);
const fileName = ref('Uploaden | Geojson bestand');
const isFrom = ref('');

const interpolationStatus = ref('disable');
const interpolationParams = computed(() => ({
  status: interpolationStatus.value,
  property: selectedProperty.value,
  date: selectedDay.value,
  time: timeValue.value
}));

const showStationModal = ref(false);
const selectedStationPropertiesForModal = ref(null);
const stationModalRef = ref(null);

const toastShow = ref(false);
const toastMessage = ref('');
const toastTimeString = ref('');

const dayNames = computed(() => {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date);
  });
});

const formattedProperty = computed(() => {
  const propertyMap = { 'pm25': 'PM2,5', 'pm10': 'PM10', 'no2': 'NO₂' };
  return propertyMap[selectedProperty.value] || selectedProperty.value;
});

const formatDate = (date) => {
  const dayName = days[date.getDay()];
  const dateString = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${dayName} | ${dateString}`;
};

const parseFormattedDate = (formattedDateString) => {
  if (!formattedDateString || !formattedDateString.includes('|')) return new Date();
  const parts = formattedDateString.split('|');
  const datePart = parts[1]?.trim();
  if (!datePart) return new Date();
  const monthMap = { januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5, juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11 };
  const dateParts = datePart.split(' ');
  if (dateParts.length < 3) return new Date();
  const day = parseInt(dateParts[0], 10);
  const monthName = dateParts[1].toLowerCase();
  const year = parseInt(dateParts[2], 10);
  if (isNaN(day) || isNaN(year) || !(monthName in monthMap)) {
    console.warn("Could not parse date:", formattedDateString);
    return new Date();
  }
  const month = monthMap[monthName];
  return new Date(year, month, day);
};

const fetchData = async (url, options = {}) => {
  try {
    const response = await fetch(url, { method: "GET", credentials: "omit", keepalive: true, ...options });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} fetching ${url}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    showToast(`Error fetching data: ${error.message}`);
    throw error;
  }
};

const getUniqueItems = (geojson, uniqueColumn) => {
  if (!geojson || !geojson.features || !Array.isArray(geojson.features)) {
    console.warn("Cannot get unique items from invalid geojson:", geojson);
    return [];
  }
  const uniqueSet = new Set(geojson.features.map(feature => feature.properties?.[uniqueColumn]).filter(Boolean));
  return [...uniqueSet].sort();
};

const createOrUpdateCheckboxes = (key, items) => {
  const currentChecked = new Set(filterOptions[key].filter(cb => cb.checked).map(cb => cb.id));
  filterOptions[key] = items.map(item => ({
    id: item,
    label: item,
    checked: currentChecked.has(item)
  }));
};

const getColor = (value, property, alpha) => {
  if (value === null || value === undefined) return `rgba(128, 128, 128, ${alpha})`;
  const valueColor = property === "pm25" ? [8.3, 16.7, 25, Infinity] : [13.3, 26.6, 40, Infinity];
  const rgbaColors = ['rgba(30, 144, 255,', 'rgba(72, 209, 204,', 'rgba(154, 205, 50,', 'rgba(218, 165, 32,'];
  const colorIndex = valueColor.findIndex(threshold => value < threshold);
  const colorBase = rgbaColors[colorIndex] !== undefined ? rgbaColors[colorIndex] : rgbaColors[rgbaColors.length - 1];
  return `${colorBase}${alpha})`;
};
provide('getColor', getColor);
provide('dayColors', dayColors);

const updateLayer = async (options = {}) => {
  if (isLoading.value && !options.initialLoad) return;
  isLoading.value = true;
  stopSlider();

  try {
    const prop = propValues[selectedProperty.value] || propValues.default;
    description.value = prop.description;
    legendaValues.value = prop.legendaValues;
    concentrationValues.value = prop.concentrationValues;

    isFrom.value = isLocalFile.value
        ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold">van jouw Local File</span>'
        : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata. Bekijk de metadata voor details over de serverdata.</a>';

    await filterGeojsonFeatures();

  } catch (error) {
    console.error('Error updating layer:', error);
    showToast("Failed to update map data.");
    geojson.value = { type: 'FeatureCollection', features: [] };
    geojsonForMap.value = { type: 'FeatureCollection', features: [] };
  } finally {
    isLoading.value = false;
  }
};

const filterGeojsonFeatures = async () => {
  const baseDate = parseFormattedDate(selectedDay.value);
  const currentHour = parseInt(timeValue.value, 10);
  const localDateAtHour = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), currentHour);
  const utcDate = new Date(localDateAtHour.getTime() - (localDateAtHour.getTimezoneOffset() * 60000));
  const measured_time_utc = utcDate.toISOString().replace('T', ' ').substring(0, 19);

  let currentGeojsonData = { type: 'FeatureCollection', features: [] };

  if (isLocalFile.value && localFileData.value) {
    currentGeojsonData.features = localFileData.value.features.filter(f => {
      const props = f.properties;
      const timeMatch = props.measured_time ? props.measured_time.startsWith(measured_time_utc.substring(0, 13)) : true;
      const propMatch = props.property === selectedProperty.value;
      return timeMatch && propMatch;
    });
    geojson.value = currentGeojsonData;

  } else if (!isLocalFile.value) {
    const stationFilters = {
      property: selectedProperty.value,
      station: selectedFilters.station_name.length > 0 ? selectedFilters.station_name : undefined,
      gemeente: selectedFilters.station_name.length === 0 && selectedFilters.Gemeente.length > 0 ? selectedFilters.Gemeente : undefined,
      regio: selectedFilters.station_name.length === 0 && selectedFilters.Gemeente.length === 0 && selectedFilters.regio.length > 0 ? selectedFilters.regio : undefined,
    };
    const stationParams = new URLSearchParams();
    Object.entries(stationFilters).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) value.forEach(v => stationParams.append(key, v));
        else stationParams.append(key, value);
      }
    });
    const stationUrl = `${BASE_API_URL}/stations?${stationParams.toString()}`;
    const observationUrl = `${BASE_API_URL}/observations?property=${selectedProperty.value}&measured_time=${encodeURIComponent(measured_time_utc)}`;

    const [stationsData, observationsData] = await Promise.all([
      fetchData(stationUrl),
      fetchData(observationUrl)
    ]);

    const observationMap = new Map();
    if (observationsData?.features) {
      observationsData.features.forEach(obs => {
        const key = obs.properties?.station_name;
        if (key) {
          observationMap.set(key, obs.properties);
        }
      });
    }

    currentGeojsonData.features = stationsData?.features?.map(station => {
      const stationProps = station.properties;
      const key = stationProps?.station_name;
      const observationProps = key ? observationMap.get(key) : null;
      if (observationProps) {
        return {
          ...station,
          properties: { ...stationProps, ...observationProps }
        };
      } else {
        return null;
      }
    }).filter(Boolean);

    geojson.value = { ...currentGeojsonData };

  } else {
    geojson.value = { type: 'FeatureCollection', features: [] };
  }

  geojsonForMap.value = { ...currentGeojsonData };

  if (!isLocalFile.value && currentGeojsonData?.features) {
    const uniqueRegios = getUniqueItems(currentGeojsonData, 'regio');
    const uniqueGemeentes = getUniqueItems(currentGeojsonData, 'Gemeente');
    const uniqueStations = getUniqueItems(currentGeojsonData, 'station_name');
    createOrUpdateCheckboxes('regio', uniqueRegios);
    createOrUpdateCheckboxes('Gemeente', uniqueGemeentes);
    createOrUpdateCheckboxes('station_name', uniqueStations);
  }
};

const showToast = (message) => {
  toastMessage.value = message;
  const now = new Date();
  toastTimeString.value = now.toLocaleTimeString('nl-NL');
  toastShow.value = true;
};

const handleMapReady = (map) => {
  console.log("Map is ready!");
  updateLayer({ initialLoad: true });
};

const provideMapInstance = (callback) => {
  console.warn("provideMapInstance called - direct map access from ControlPanel is discouraged.");
  if (mapInstance.value && typeof callback === 'function') {
    callback(mapInstance.value);
  }
};

const handlePropertyChange = (newProperty) => {
  selectedProperty.value = newProperty;
  updateLayer();
};

const handleTimeChange = (newTime) => {
  timeValue.value = parseInt(newTime, 10);
  stopSlider();
  updateLayer();
};

const handleDateChange = (newDate) => {
  if (dayNames.value.includes(newDate)) {
    selectedDay.value = newDate;
    updateLayer();
  } else if (newDate === '') {
    selectedDay.value = '';
    geojson.value = { type: 'FeatureCollection', features: [] };
    geojsonForMap.value = { type: 'FeatureCollection', features: [] };
  }
};

const handlePlayToggle = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    startSlider();
  } else {
    stopSlider();
  }
};

const handleFilterChange = (newFilters) => {
  selectedFilters.regio = newFilters.regio.filter(cb => cb.checked).map(cb => cb.id);
  selectedFilters.Gemeente = newFilters.Gemeente.filter(cb => cb.checked).map(cb => cb.id);
  selectedFilters.station_name = newFilters.station_name.filter(cb => cb.checked).map(cb => cb.id);
  updateLayer();
};

const handleStationSearchSelect = (stationLabel) => {
  let found = false;
  filterOptions.station_name.forEach(cb => {
    cb.checked = cb.label === stationLabel;
    if (cb.checked) found = true;
  });
  if (found) {
    selectedFilters.station_name = [stationLabel];
    updateLayer();
  }
};

const handleInterpolationChange = (newStatus) => {
  interpolationStatus.value = newStatus;
  updateLayer();
};

const handleDownloadRequest = async (format) => {
  isLoading.value = true;
  await nextTick();

  const dataToDownload = geojson.value;

  if (!dataToDownload || !dataToDownload.features || dataToDownload.features.length === 0) {
    showToast("No data available to download.");
    isLoading.value = false;
    return;
  }

  try {
    if (format === 'geojson') {
      const dataStr = JSON.stringify(dataToDownload);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = `PZH-Luchtkwaliteit_${selectedProperty.value}_${selectedDay.value.split('|')[1]?.trim()}_${timeValue.value}h.geojson`.replace(/ /g, '_');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('GeoJSON bestand gedownload.');

    } else if (format === 'csv') {
      const CSV_HEADER = 'Station naam;Datum en tijd (UTC);Property;Regio;Gemeente;Value;Unit\n';
      const DEFAULT_VALUE = 'N/A';
      let csv = CSV_HEADER;
      dataToDownload.features.forEach(feature => {
        let props = feature.properties;
        let station_name = props?.station_name || DEFAULT_VALUE;
        let measured_time = props?.measured_time ? new Date(props.measured_time).toISOString() : DEFAULT_VALUE;
        let property = props?.property || selectedProperty.value || DEFAULT_VALUE;
        let regio = props?.regio || DEFAULT_VALUE;
        let gemeente = props?.Gemeente || DEFAULT_VALUE;
        let value = props?.value !== undefined && props?.value !== null ? `${props.value.toFixed(2)}` : DEFAULT_VALUE;
        let unit = props?.unit || DEFAULT_VALUE;
        csv += `${station_name};${measured_time};${property};${regio};${gemeente};${value};${unit}\n`;
      });
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `PZH-Luchtkwaliteit_${selectedProperty.value}_${selectedDay.value.split('|')[1]?.trim()}_${timeValue.value}h.csv`.replace(/ /g, '_');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast('CSV bestand gedownload.');
    }
  } catch (error) {
    console.error("Download error:", error);
    showToast(`Download failed: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
};

const handleFileUpload = (file) => {
  if (!file) return;
  fileName.value = file.name;
  isLocalFile.value = true;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsedData = JSON.parse(e.target.result);
      if (parsedData.type === 'FeatureCollection' && Array.isArray(parsedData.features)) {
        localFileData.value = parsedData;
        selectedFilters.regio = [];
        selectedFilters.Gemeente = [];
        selectedFilters.station_name = [];
        filterOptions.regio.forEach(cb => cb.checked = false);
        filterOptions.Gemeente.forEach(cb => cb.checked = false);
        filterOptions.station_name.forEach(cb => cb.checked = false);
        await updateLayer();
        showToast(`Local file "${file.name}" loaded.`);
      } else {
        throw new Error("Invalid GeoJSON format.");
      }
    } catch (error) {
      console.error('Error parsing local file:', error);
      showToast(`Error reading file: ${error.message}`);
      handleClearLocalFile();
    }
  };
  reader.onerror = (e) => {
    console.error('FileReader error:', e);
    showToast('Could not read the selected file.');
    handleClearLocalFile();
  };
  reader.readAsText(file);
};

const handleClearLocalFile = () => {
  isLocalFile.value = false;
  localFileData.value = null;
  fileName.value = 'Uploaden | Geojson bestand';
  fetchInitialStationsAndFilters();
};

const handleStationClickFromMap = (featureProperties) => {
  selectedStationPropertiesForModal.value = featureProperties;
  showStationModal.value = true;
};

const handleCloseModal = () => {
  showStationModal.value = false;
  selectedStationPropertiesForModal.value = null;
};

const handleChartDataRequest = async ({ stationName, property, locationUuid }) => {
  console.log(`Chart data requested for: ${stationName}, Property: ${property}, UUID: ${locationUuid}`);
  isLoading.value = true;
  try {
    const url = `${BASE_API_URL}/observations?station=${encodeURIComponent(stationName)}&property=${encodeURIComponent(property)}&location=${encodeURIComponent(locationUuid)}`;
    console.log("Fetching chart data from:", url);
    const observationData = await fetchData(url);
    const processedData = processDataForChart(observationData, property);
    if (stationModalRef.value && typeof stationModalRef.value.receiveChartData === 'function') {
      stationModalRef.value.receiveChartData(processedData);
    } else {
      console.error("Modal reference or receiveChartData method not available.");
      showToast("Could not load chart data for modal.");
    }
  } catch (error) {
    console.error(`Error fetching chart data for ${stationName}:`, error);
    showToast(`Failed to load chart data: ${error.message}`);
    if (stationModalRef.value && typeof stationModalRef.value.handleChartError === 'function') {
      stationModalRef.value.handleChartError(error);
    }
  } finally {
    isLoading.value = false;
  }
};

const processDataForChart = (observationData, property) => {
  if (!observationData || !observationData.features) {
    return { labels: [], datasets: [] };
  }
  const dataByDate = observationData.features.reduce((acc, feature) => {
    const props = feature.properties;
    if (props.value === null || props.value === undefined) return acc;
    try {
      const date = new Date(props.measured_time);
      const dateString = date.toISOString().split('T')[0];
      const hourIndex = date.getUTCHours();
      if (!acc[dateString]) {
        acc[dateString] = {
          times: Array.from({ length: 24 }, (_, i) => i < 10 ? `0${i}:00 UTC` : `${i}:00 UTC`),
          values: Array(24).fill(null)
        };
      }
      if (hourIndex >= 0 && hourIndex < 24) {
        acc[dateString].values[hourIndex] = props.value;
      } else {
        console.warn("Invalid hour index calculated:", hourIndex, "from time:", props.measured_time);
      }
    } catch (e) {
      console.error("Error processing date for chart:", props.measured_time, e);
    }
    return acc;
  }, {});
  const datasets = Object.entries(dataByDate).map(([date, data], index) => {
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();
    const backgroundColors = data.values.map(value => getColor(value, property, 0.6));
    const borderColors = data.values.map(value => getColor(value, property, 1));
    return {
      label: dateObj.toLocaleDateString('nl-NL', {
        weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC'
      }),
      dateString: date,
      data: data.values,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 1,
      hidden: index !== (Object.keys(dataByDate).length - 1)
    };
  });
  datasets.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
  const labels = dataByDate[Object.keys(dataByDate)[0]]?.times || Array.from({ length: 24 }, (_, i) => i < 10 ? `0${i}:00 UTC` : `${i}:00 UTC`);
  return { labels, datasets };
};

const handleMapStyleChange = (newStyleUrl) => {
  currentMapStyleUrl.value = newStyleUrl;
  console.log("Map style changed to:", newStyleUrl);
};

const handleInterpolationLayerUpdate = (layerId, status) => {
  console.log(`Interpolation layer ${layerId} status: ${status}`);
};

const reloadPage = () => {
  window.location.reload();
};

const startSlider = () => {
  stopSlider();
  const todayStr = formatDate(new Date());
  const isToday = selectedDay.value === todayStr;
  const maxHour = isToday ? new Date().getHours() : 23;
  timeValue.value = 0;
  updateLayer();
  sliderInterval.value = setInterval(() => {
    if (timeValue.value < maxHour) {
      timeValue.value++;
      updateLayer();
    } else {
      stopSlider();
      isPlaying.value = false;
    }
  }, 1550);
};

const stopSlider = () => {
  if (sliderInterval.value) {
    clearInterval(sliderInterval.value);
    sliderInterval.value = null;
  }
};

const checkHourChange = () => {
  hourlyUpdateInterval.value = setInterval(() => {
    const todayStr = formatDate(new Date());
    if (!isPlaying.value && selectedDay.value === todayStr) {
      const currentHour = new Date().getHours();
      if (timeValue.value !== currentHour) {
        console.log("Auto-updating time to current hour:", currentHour);
        timeValue.value = currentHour;
        updateLayer();
      }
    }
  }, 1000 * 60 * 5);
};

const fetchInitialStationsAndFilters = async () => {
  isLoading.value = true;
  try {
    const stationsUrl = `${BASE_API_URL}/stations`;
    const initialStationsData = await fetchData(stationsUrl);
    if (!initialStationsData || !initialStationsData.features) {
      throw new Error("No initial station data received.");
    }
    allStationsGeojson.value = initialStationsData;
    const uniqueRegios = getUniqueItems(initialStationsData, 'regio');
    const uniqueGemeentes = getUniqueItems(initialStationsData, 'Gemeente');
    const uniqueStations = getUniqueItems(initialStationsData, 'station_name');
    createOrUpdateCheckboxes('regio', uniqueRegios);
    createOrUpdateCheckboxes('Gemeente', uniqueGemeentes);
    createOrUpdateCheckboxes('station_name', uniqueStations);
    selectedDay.value = dayNames.value[0];
  } catch (error) {
    console.error("Failed to fetch initial station data:", error);
    showToast("Could not load initial station list.");
  } finally {
    // isLoading false will be set after map loads and first updateLayer completes
  }
};

onMounted(() => {
  fetchInitialStationsAndFilters();
  checkHourChange();
});

onBeforeUnmount(() => {
  stopSlider();
  if (hourlyUpdateInterval.value) {
    clearInterval(hourlyUpdateInterval.value);
  }
});

</script>

<style scoped>
#app-container {
  font-family: 'Arial', sans-serif;
}

.custom-div {
  position: relative;
}

.custom-div::-webkit-scrollbar {
  width: 8px;
}
.custom-div::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.custom-div::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}
.custom-div::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

@import 'maplibre-gl/dist/maplibre-gl.css';
</style>