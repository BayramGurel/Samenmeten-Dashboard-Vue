<template>
  <div class="dashboard-container vw-100 vh-100 position-relative">

    <MapDisplay
        v-if="state.API_KEY"
        :api-key="state.API_KEY"
        :style-urls="state.STYLE_URLS"
        :style-names="state.STYLE_NAMES"
        :initial-center="[4.218788, 52.008663]"
        :initial-zoom="8.9"
        :geojson="state.geojson"
        :interpolation-status="state.interpolationStatus"
        :property="state.property"
        :bbox="state.bbox"
        :raster-layers="state.rasterLayers"
        :current-layer-id="state.currentLayerId"
        @map-loaded="onMapLoaded"
        @station-clicked="handleStationClick"
        @interpolation-layer-added="handleInterpolationLayerAdded"
        @interpolation-layer-updated="handleInterpolationLayerUpdated"
        @style-changed="handleMapStyleChange"
        class="w-100 h-100"
    />
    <div v-else class="loading-placeholder d-flex justify-content-center align-items-center h-100">
      <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Kaart laden...</span>
      </div>
    </div>

    <SidebarPanel
        :geojson="state.geojson"
        :formatted-property="formattedProperty"
        :description="state.description"
    />

    <ControlPanel
        :day-names="dayNames"
        :selected-day="state.selectedDay"
        :time-value="state.timeValue"
        :selected-property="state.property"
        :is-playing="state.isPlaying"
        :legenda-values="state.legendaValues"
        :legend-colors="legendColors"
        :concentration-values="state.concentrationValues"
        :formatted-property="formattedProperty"
        :is-from-text="state.isFrom"
        :regio-options="state.regio"
        :gemeente-options="state.Gemeente"
        :station-options="state.station_name"
        :is-local-file="state.isLocalFile"
        :file-name="state.fileName"
        :interpolation-status="state.interpolationStatus"
        @property-change="handlePropertyChange"
        @time-change="handleTimeChange"
        @date-change="handleDateChange"
        @play-toggle="handlePlayToggle"
        @advanced-filter-change="handleAdvancedFilterChange"
        @station-search-select="handleStationSearchSelect"
        @interpolation-change="handleInterpolationChange"
        @download-request="handleDownloadRequest"
        @file-upload="handleFileUpload"
        @clear-local-file="handleClearLocalFile"
        @refresh-page="reloadPage"
        class="position-absolute start-0 top-0 m-3 control-panel-container"
        style="z-index: 10; max-height: 96vh; overflow-y: auto;"
    />

    <StationDetailModal
        :show="state.showModal"
        :station-properties="state.selectedStationProperties"
        :day-colors="state.dayColors"
        :chart-options="state.chartOptions"
        :get-color-function="getColor"
        @close-modal="handleCloseModal"
        @fetch-chart-data="handleFetchChartData"
    />

    <NotificationToast
        :show="state.showToast"
        :message="'De bestanden zijn gedownload.'"
        :time-string="state.toastTimeString"
        @close-toast="state.showToast = false"
        class="position-fixed bottom-0 end-0 p-3"
        style="z-index: 1100;"
    />

  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, onBeforeUnmount, provide } from 'vue';
import { data as initialData } from '@/data/variable.js'; // Ensure this contains ALL necessary initial configs

import MapDisplay from './MapDisplay.vue';
import SidebarPanel from './SidebarPanel.vue';
import ControlPanel from './ControlPanel.vue';
import StationDetailModal from './StationDetailModal.vue';
import NotificationToast from './NotificationToast.vue';

// Constants
const API_BASE_URL_STATIONS = 'https://dta-samenmeten-api.azurewebsites.net/api/data/stations';
const API_BASE_URL_OBSERVATIONS = 'https://dta-samenmeten-api.azurewebsites.net/api/data/observations';
const CSV_DEFAULT_VALUE = 'N/A';
const LOCAL_FILE_BUTTON_TEXT = 'Geojson bestand | Uploaden';

// Reactive State
const state = reactive({
  // Configuration & Initial State (Merge deeply if needed)
  ...initialData, // Must contain API_KEY, STYLE_URLS, STYLE_NAMES, bbox, propValues, days, dayColors, chartOptions etc.
  // Component-specific state
  mapInstance: null,
  geojson: { type: 'FeatureCollection', Features: [] }, // Data currently displayed
  geojsonMaster: { type: 'FeatureCollection', Features: [] }, // Unfiltered station list from server
  // Filter Options State (Arrays of {id, label, checked})
  regio: [],
  Gemeente: [],
  station_name: [],
  // Selected Filter Values State (Arrays of IDs)
  selectedRegio: [],
  selectedGemeente: [],
  selectedStName: [],
  // Modal State
  selectedStationProperties: null,
  showModal: false,
  // Toast State
  showToast: false,
  toastTimeString: '',
  // Interval IDs
  hourCheckInterval: null,
  playInterval: null,
  // Flags & Refs
  isMapLoaded: false,
  localFileRef: null, // Holds the File object when uploaded
  fileName: LOCAL_FILE_BUTTON_TEXT,
  isLocalFile: false,
  isFrom: '', // Text indicating data source
  // Current Map/Data State
  property: initialData.property || 'pm25', // Default if not in initialData
  description: '',
  legendaValues: [],
  concentrationValues: [],
  rasterLayers: new Set(), // Keep track of added raster layers (for IDW)
  currentLayerId: null,
  timeValue: new Date().getHours(), // Initialize to current hour
  selectedDay: '', // Will be set once map loads
  isPlaying: false,
  interpolationStatus: 'disable', // 'disable' or 'activate'
});

// Computed Properties
const dayNames = computed(() => {
  // Ensure state.days is available from initialData
  const daysOfWeek = state.days || ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']; // Fallback
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date, daysOfWeek); // Pass days array explicitly
  });
});

const formattedProperty = computed(() => {
  const propertyMap = { 'pm25': 'PM2,5', 'pm10': 'PM10', 'no2': 'NO2' };
  return propertyMap[state.property] || state.property;
});

const legendColors = computed(() => {
  // These seem static, ensure they match the logic in getColor/MapDisplay
  return ['#1E90FF', '#48D1CC', '#9ACD32', '#DAA520'];
});

// Watchers
watch(() => state.property, (newProperty) => {
  // Update description, legend values based on selected property
  const details = state.propValues?.[newProperty] || state.propValues?.default || {};
  state.description = details.description || '';
  state.legendaValues = details.legendaValues || [];
  state.concentrationValues = details.concentrationValues || [];
  if (state.isMapLoaded) {
    updateLayer(); // Trigger update when property changes
  }
}, { immediate: true }); // Run immediately on component load

watch(() => [
  state.timeValue,
  state.selectedDay,
  state.selectedRegio,
  state.selectedGemeente,
  state.selectedStName,
  state.interpolationStatus,
  // state.localFileRef removed - handled by @file-upload event
], () => {
  // Trigger update when time, date, filters, or interpolation status change
  if (state.isMapLoaded) {
    updateLayer();
  }
}, { deep: true }); // Use deep watch for arrays of selected IDs

// --- Map Event Handlers ---
const onMapLoaded = (map) => {
  console.log("Map Loaded event received in parent");
  state.mapInstance = map;
  state.isMapLoaded = true;
  // Set initial day only after dayNames is computed and map is ready
  if (dayNames.value.length > 0) {
    state.selectedDay = dayNames.value[0];
  }
  // Fetch initial master list and then trigger first observation fetch via updateLayer
  fetchInitialDataAndObservations();
  checkHourChange(); // Start periodic check
};

const handleMapStyleChange = () => {
  console.log("Parent noted map style changed.");
  // IMPORTANT: If map style changes remove layers, you might need to
  // re-trigger layer updates here, potentially calling updateLayer()
  // or specific functions if sources/layers need explicit re-adding.
  // Often Maplibre handles persistence if sources aren't removed, but verify.
  if (state.isMapLoaded) {
    // Example: force update if needed
    // updateLayer();
  }
};

const handleInterpolationLayerAdded = (layerId) => { state.rasterLayers.add(layerId); };
const handleInterpolationLayerUpdated = (currentLayerId) => { state.currentLayerId = currentLayerId; };

// --- Data Fetching & Processing ---
const fetchData = async (url) => {
  try {
    const response = await fetch(url, { method: "GET", credentials: "include", keepalive: true });
    if (!response.ok) {
      console.error(`HTTP error fetching ${url}: Status ${response.status}`);
      // Optionally: Show user feedback here
      return null; // Return null to indicate failure
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch data from ${url}:`, error);
    // Optionally: Show user feedback here
    return null; // Return null on network/fetch error
  }
};

const fetchInitialDataAndObservations = async () => {
  console.log("Fetching initial master station data...");
  try {
    const initialStations = await fetchData(API_BASE_URL_STATIONS);
    if (initialStations && initialStations.Features) {
      state.geojsonMaster = initialStations;
      await updateFilterOptions(initialStations); // Setup filters based on master list
      await updateLayer(); // Fetch observations for the default state
    } else {
      console.error("Failed to fetch initial station data or data is empty/invalid.");
      state.geojsonMaster = { type: 'FeatureCollection', Features: [] };
      state.geojson = { type: 'FeatureCollection', Features: [] };
      // Handle lack of initial data - maybe show an error message
    }
  } catch (error) {
    console.error('Error fetching initial data:', error);
    state.geojsonMaster = { type: 'FeatureCollection', Features: [] };
    state.geojson = { type: 'FeatureCollection', Features: [] };
    // Handle fetch error
  }
};

const getUniqueItems = (geojson, uniqueColumn) => {
  if (!geojson || !geojson.Features) return [];
  // Filter out null/undefined values before creating the Set and sort
  return [...new Set(geojson.Features.map(feature => feature.properties?.[uniqueColumn]).filter(item => item != null))].sort();
};

const createCheckboxes = (items, selectedItems) => {
  // Creates the {id, label, checked} structure for filter options
  return items.map(item => ({
    id: item,
    label: item,
    checked: selectedItems.includes(item)
  }));
};

const updateFilterOptions = async (geojsonSource) => {
  // Updates the state arrays (state.regio, state.Gemeente, etc.) used to populate filter controls
  if (!geojsonSource || !geojsonSource.Features) {
    console.warn("Cannot update filter options: Invalid or empty GeoJSON source provided.");
    state.regio = []; state.Gemeente = []; state.station_name = [];
    return;
  }
  try {
    // Extract unique values for each filter type from the provided source
    const [regios, gemeentes, stName] = await Promise.all([
      getUniqueItems(geojsonSource, 'regio'),
      getUniqueItems(geojsonSource, 'Gemeente'),
      getUniqueItems(geojsonSource, 'station_name')
    ]);

    // Update the reactive state arrays with the correct structure
    state.regio = createCheckboxes(regios, state.selectedRegio);
    state.Gemeente = createCheckboxes(gemeentes, state.selectedGemeente);
    state.station_name = createCheckboxes(stName, state.selectedStName);
  } catch(error) {
    console.error("Error updating filter options:", error);
  }
};

// --- Core Update Logic ---
const updateLayer = async () => {
  if (!state.isMapLoaded) {
    console.log("Map not loaded yet, skipping updateLayer call.");
    return;
  }
  if (!state.selectedDay) {
    console.log("Selected day not set yet, skipping updateLayer call.");
    return; // Avoid running before initial day is set
  }
  console.log("Updating layer data based on current state...");

  try {
    // Determine if using local file and update related UI text
    state.isLocalFile = !!state.localFileRef;
    state.fileName = state.isLocalFile ? state.localFileRef.name : LOCAL_FILE_BUTTON_TEXT;
    state.isFrom = state.isLocalFile
        ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold">van jouw Local File</span>'
        : `De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata (${new Date().toLocaleTimeString('nl-NL')}).</a>`;

    const hour = state.timeValue;
    const selectedDateIndex = dayNames.value.indexOf(state.selectedDay);
    // Ensure dateIndex is valid, default to 0 (today) if not found
    const dateIndex = selectedDateIndex >= 0 ? selectedDateIndex : 0;

    // Filter features based on current state (local file or server)
    const filteredGeojson = await filterGeojsonFeatures(
        hour,
        dateIndex,
        state.property,
        state.selectedRegio,
        state.selectedGemeente,
        state.selectedStName,
        state.isLocalFile,
        state.localFileRef // Pass the actual file reference
    );

    // Update the main geojson state used by MapDisplay and SidebarPanel
    state.geojson = filteredGeojson || { type: 'FeatureCollection', Features: [] }; // Ensure it's always a valid structure

    // Update filter options based on the appropriate source
    // Use master list for server data, current filtered list for local data
    await updateFilterOptions(state.isLocalFile ? state.geojson : state.geojsonMaster);

  } catch (error) {
    console.error('Error during layer update process:', error);
    state.geojson = { type: 'FeatureCollection', Features: [] }; // Reset on error
    // Optionally show user feedback about the update failure
  }
};

const filterGeojsonFeatures = async (hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile, localFile) => {
  console.log("Filtering features:", { hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile });

  if (isLocalFile && localFile) {
    // --- Local File Processing ---
    console.log("Loading local file...");
    try {
      const text = await localFile.text();
      let geojson = JSON.parse(text);

      // Standardize feature key to 'Features' (from 'features' if necessary)
      if (geojson.features && !geojson.Features) {
        geojson.Features = geojson.features; delete geojson.features;
      }

      // Basic GeoJSON validation
      if (!geojson.type || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.Features)) {
        throw new Error("Invalid GeoJSON structure: Missing 'type' or 'Features' array.");
      }

      console.log(`Local file "${localFile.name}" loaded successfully with ${geojson.Features.length} features.`);
      // Note: No time/property filtering applied here - assumes local file IS the desired data
      return geojson;
    } catch (error) {
      console.error('Error reading or parsing local file:', error);
      alert(`Fout bij lezen lokaal bestand: ${error.message}. Controleer of het een valide GeoJSON is.`);
      handleClearLocalFile(); // Revert to server data on error
      return state.geojson; // Return current (likely server) data
    }
  } else {
    // --- Server Data Fetching ---
    console.log("Fetching data from server...");
    return await fetchAndMergeServerData(hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName);
  }
};

const fetchAndMergeServerData = async (hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName) => {
  // Calculate target time in UTC for the API query
  const now = new Date();
  now.setDate(now.getDate() - selectedDateIndex);
  // Construct UTC date/time - API expects UTC? Verify API documentation.
  // Assuming API wants UTC hour corresponding to local hour selection
  const targetDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour)));
  // Format time string for API parameter (adjust format if API needs something different)
  // Example: '2023-10-27T10:00:00Z'. Adjust precision/format as needed by API.
  const measured_time_param = targetDate.toISOString().replace('.000Z', 'Z');


  // Build query parameters for stations and observations endpoints
  const stationParams = new URLSearchParams(); // Removed property:selectedProperty, assuming endpoint gives all details regardless of property filter? Verify if needed.
  const observationParams = new URLSearchParams({ property: selectedProperty, measured_time: measured_time_param });

  const appendParams = (key, values) => {
    if (values.length > 0) {
      values.forEach(v => {
        stationParams.append(key, v);
        // Do not append spatial filters to observation request if station list is already filtered? Check API behavior.
        // Assuming observations endpoint can filter by time/property only and we merge later.
        // If observations endpoint ALSO supports spatial filters, uncomment below:
        // observationParams.append(key, v);
      });
    }
  };

  // Apply filters hierarchically: Station > Gemeente > Regio
  if (selectedStName.length > 0) {
    appendParams('station', selectedStName);
  } else if (selectedGemeente.length > 0) {
    appendParams('gemeente', selectedGemeente);
  } else if (selectedRegio.length > 0) {
    appendParams('regio', selectedRegio);
  }

  // Construct URLs
  // Use geojsonMaster base if no spatial filters applied? Or always filter stations endpoint? Assuming filter applied:
  const stationsUrl = `${API_BASE_URL_STATIONS}?${stationParams.toString()}`;
  // Observation URL only needs time and property, we will merge based on station name
  const observationsUrl = `${API_BASE_URL_OBSERVATIONS}?${observationParams.toString()}`;


  try {
    console.log("Fetching stations:", stationsUrl);
    console.log("Fetching observations:", observationsUrl);

    // Fetch station details and observation values concurrently
    const [stationsData, observationsData] = await Promise.all([
      fetchData(stationsUrl),
      fetchData(observationsUrl)
    ]);

    // Handle cases where API calls failed or returned invalid data
    if (!stationsData || !observationsData || !stationsData.Features || !observationsData.Features) {
      console.warn("API did not return valid data for stations or observations.", { stationsData, observationsData });
      // Return empty features, but keep existing geojsonMaster
      return { type: 'FeatureCollection', Features: [] };
    }

    // Create a map for efficient lookup of observations by station name
    const observationMap = new Map();
    observationsData.Features.forEach(obs => {
      if(obs.properties?.station_name) {
        observationMap.set(obs.properties.station_name, obs);
      } else {
        console.warn("Observation feature missing 'station_name' property:", obs);
      }
    });

    // Merge filtered station data with corresponding observation data
    const finalFeatures = stationsData.Features
        .map(station => {
          const stationName = station.properties?.station_name;
          if (!stationName) {
            console.warn("Station feature missing 'station_name' property:", station);
            return null; // Skip stations without a name
          }
          const matchingObservation = observationMap.get(stationName);
          if (matchingObservation) {
            // Combine properties, giving observation properties precedence if names clash
            // Ensure geometry comes from the observation if available (more precise time)
            return {
              type: 'Feature', // Ensure type is set
              geometry: matchingObservation.geometry || station.geometry, // Prefer observation geometry
              properties: {
                ...station.properties, // Base properties from station query
                ...matchingObservation.properties // Overwrite with/add observation properties
              }
            };
          }
          // If no observation found for this specific station (which passed the station filter) at this specific time, exclude it
          return null;
        })
        .filter(feature => feature !== null); // Remove null entries

    console.log(`Merged ${finalFeatures.length} features from ${stationsData.Features.length} filtered stations and ${observationsData.Features.length} observations.`);
    return { type: 'FeatureCollection', Features: finalFeatures };

  } catch (error) {
    console.error("Error during server data fetch or merge:", error);
    return { type: 'FeatureCollection', Features: [] }; // Return empty on error
  }
};


// --- Control Panel Event Handlers ---
const handlePropertyChange = (newProperty) => { state.property = newProperty; };
const handleTimeChange = (newTime) => {
  state.timeValue = newTime;
  if(state.isPlaying) handlePlayToggle(false); // Stop playing if time is manually changed
};
const handleDateChange = (newDate) => { state.selectedDay = newDate; };
const handlePlayToggle = (play) => {
  state.isPlaying = play;
  if (play) startSlider(); else stopSlider();
};
const handleAdvancedFilterChange = (filters) => {
  // Update both the options structure (with checked status) and the selected IDs list
  state.regio = filters.regio;
  state.Gemeente = filters.gemeente;
  state.station_name = filters.station_name;
  state.selectedRegio = filters.regio.filter(i => i.checked).map(i => i.id);
  state.selectedGemeente = filters.gemeente.filter(i => i.checked).map(i => i.id);
  state.selectedStName = filters.station_name.filter(i => i.checked).map(i => i.id);
  // No need to call updateLayer here, the watcher will pick up changes to selected* arrays
};
const handleStationSearchSelect = (stationLabel) => {
  // Handle selection from the search input/datalist
  let selectedId = null;
  state.station_name.forEach(s => {
    if (s.label === stationLabel) {
      s.checked = true; // Mark the selected station as checked
      selectedId = s.id;
    } else {
      s.checked = false; // Uncheck others
    }
  });
  // Update selected IDs list and clear other filters
  state.selectedStName = selectedId ? [selectedId] : [];
  state.selectedRegio = []; state.selectedGemeente = [];
  state.regio.forEach(r => r.checked = false);
  state.Gemeente.forEach(g => g.checked = false);
  // No need to call updateLayer here, the watcher will pick up changes to selected* arrays
};
const handleInterpolationChange = (newStatus) => { state.interpolationStatus = newStatus; };
const handleDownloadRequest = (format) => {
  // Check if there's data to download
  if (!state.geojson || !state.geojson.Features || state.geojson.Features.length === 0) {
    alert("Geen gegevens beschikbaar om te downloaden voor de huidige selectie.");
    return;
  }
  // Create a deep copy to avoid modifying the reactive state unintentionally
  const dataToDownload = JSON.parse(JSON.stringify(state.geojson));
  // Trigger the appropriate download function
  if (format === 'geojson') downloadGeoJSON(dataToDownload);
  else if (format === 'csv') downloadCSV(dataToDownload);
  showDownloadToast(); // Show confirmation
};
const handleFileUpload = (file) => {
  // Handle file input from ControlPanel
  if (file) {
    state.localFileRef = file;
    state.interpolationStatus = 'disable'; // Disable IDW when using local file
    updateLayer(); // Trigger update immediately after file selection
  } else {
    // Handle case where file selection is cancelled or cleared in child
    handleClearLocalFile();
  }
};
const handleClearLocalFile = () => {
  // Revert to server data
  state.localFileRef = null;
  state.fileName = LOCAL_FILE_BUTTON_TEXT; // Reset button text
  state.isLocalFile = false;
  updateLayer(); // Trigger update to fetch server data
};
const reloadPage = () => window.location.reload(); // Handle refresh request

// --- Map/Modal Interaction Handlers ---
const handleStationClick = (properties) => {
  // Received from MapDisplay when a station circle is clicked
  state.selectedStationProperties = properties;
  state.showModal = true;
};
const handleCloseModal = () => { state.showModal = false; };
const handleFetchChartData = async ({ station_name, property, location_uuid }) => {
  // Request from StationDetailModal to fetch data for its chart
  console.log("Fetching chart data for modal:", station_name, property, location_uuid);
  try {
    const params = new URLSearchParams({ station: station_name, property: property });
    // Include location_uuid if available (might help disambiguate stations)
    if (location_uuid) params.append('location', location_uuid);

    // Fetch data for a specific period (e.g., last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // Example: 7-day range
    // Format dates as required by the API (e.g., ISO string)
    params.append('measured_time_ge', startDate.toISOString()); // Greater than or equal
    params.append('measured_time_le', endDate.toISOString()); // Less than or equal

    const url = `${API_BASE_URL_OBSERVATIONS}?${params.toString()}`;
    console.log("Chart data URL:", url);
    const chartData = await fetchData(url);
    return chartData; // Return data (or null on failure) to the modal
  } catch (error) {
    console.error(`Error fetching chart data: ${error}`);
    return null;
  }
};

// --- Slider Autoplay Logic ---
const startSlider = () => {
  stopSlider(); // Ensure any existing interval is cleared
  const daysOfWeek = state.days || ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const todayFormatted = formatDate(new Date(), daysOfWeek);
  // Determine max hour (current hour if today, 23 otherwise)
  const maxHour = state.selectedDay === todayFormatted ? new Date().getHours() : 23;
  state.timeValue = 0; // Start from hour 0
  updateLayer(); // Update map for hour 0 immediately
  state.playInterval = setInterval(() => {
    if (state.timeValue < maxHour) {
      state.timeValue++; // Increment hour (watcher will trigger updateLayer)
    } else {
      stopSlider(); // Stop when max hour is reached
      state.isPlaying = false; // Update playing state
    }
  }, 1550); // Interval duration
};

const stopSlider = () => {
  if (state.playInterval) {
    clearInterval(state.playInterval);
    state.playInterval = null;
  }
};

// --- Periodic Update Check ---
const checkHourChange = () => {
  // Periodically checks if the current hour has changed AND if we should auto-update the slider
  stopHourCheck(); // Clear existing interval first
  state.hourCheckInterval = setInterval(async () => {
    const daysOfWeek = state.days || ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    const todayFormatted = formatDate(new Date(), daysOfWeek);
    // Only auto-update if: selected day is today, not playing, not using local file
    if(state.selectedDay === todayFormatted && !state.isPlaying && !state.isLocalFile) {
      const currentHour = new Date().getHours();
      if (state.timeValue !== currentHour) {
        console.log(`Periodic check: Current hour (${currentHour}) differs from slider (${state.timeValue}). Updating...`);
        state.timeValue = currentHour; // Update slider (watcher triggers map update)
      }
    }
  }, 1000 * 60 * 20); // Check every 20 minutes
};

const stopHourCheck = () => {
  if (state.hourCheckInterval) {
    clearInterval(state.hourCheckInterval);
    state.hourCheckInterval = null;
  }
};

// --- Helper Functions ---
const formatDate = (date, daysOfWeek) => {
  // Formats date as "DayName | D MMMM YYYY"
  const dayName = daysOfWeek[date.getDay()] || '';
  const dateString = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${dayName} | ${dateString}`;
};

const showDownloadToast = () => {
  // Manages the state for the notification toast
  const now = new Date();
  state.toastTimeString = now.toLocaleTimeString('nl-NL'); // Set time for the toast message
  state.showToast = true;
  // Automatically hide the toast after 5 seconds
  setTimeout(() => { state.showToast = false; }, 5000);
};

const getColor = (value, property, alpha = 1) => {
  // Determines color based on value and property type (consistent across components via provide/inject)
  // Define thresholds based on property type
  const thresholds = property === "pm25"
      ? [8.3, 16.7, 25, Infinity] // PM2.5 thresholds
      : [13.3, 26.6, 40, Infinity]; // PM10/NO2 thresholds (confirm if NO2 uses same scale)

  // Define corresponding colors (ensure alpha is included)
  const colors = [
    `rgba(30, 144, 255, ${alpha})`,  // Blue
    `rgba(72, 209, 204, ${alpha})`,  // Turquoise
    `rgba(154, 205, 50, ${alpha})`,  // Yellow-Green
    `rgba(218, 165, 32, ${alpha})`   // Orange/Gold
  ];
  const defaultColor = `rgba(128, 128, 128, ${alpha})`; // Grey for undefined/null

  // Handle null or undefined values explicitly
  if (value === null || typeof value === 'undefined') {
    return defaultColor;
  }

  // Find the index of the first threshold the value is less than
  const colorIndex = thresholds.findIndex(threshold => value < threshold);

  // Return the corresponding color or the last color if value exceeds all thresholds
  // Handle case where colorIndex is -1 (value >= last threshold)
  return colorIndex === -1 ? colors[colors.length - 1] : colors[colorIndex];
};


// --- Download Functions ---
const downloadGeoJSON = (geojson) => {
  try {
    // Stringify with formatting for readability
    const dataStr = JSON.stringify(geojson, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    // Sanitize property name for filename
    const safeProperty = state.property.replace(/[^a-z0-9]/gi, '_');
    link.download = `PZH-Luchtkwaliteit_${safeProperty}.geojson`;
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error generating GeoJSON download:", error);
    alert("Fout bij het genereren van het GeoJSON-bestand.");
  }
};

const downloadCSV = (geojson) => {
  try {
    const CSV_HEADER = 'Station naam;Datum en tijd;Property;Regio;Gemeente;Waarde;Eenheid\n';
    let csv = CSV_HEADER;
    const features = geojson.Features || [];

    features.forEach(feature => {
      const properties = feature.properties || {};
      const getProp = (key) => properties[key] ?? CSV_DEFAULT_VALUE; // Helper for default value

      const station_name = getProp('station_name');
      // Format timestamp using user's local time zone for CSV readability
      const measured_time = properties.measured_time
          ? new Date(properties.measured_time).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }) // Example: Use Dutch locale/timezone
          : CSV_DEFAULT_VALUE;
      const property = getProp('property');
      const regio = getProp('regio');
      const gemeente = getProp('Gemeente');
      // Format value to 2 decimal places if it's a number
      const value = (typeof properties.value === 'number')
          ? properties.value.toFixed(2)
          : CSV_DEFAULT_VALUE;
      const unit = getProp('unit');

      // Append row to CSV string
      csv += `${station_name};${measured_time};${property};${regio};${gemeente};${value};${unit}\n`;
    });

    // Use Blob for better handling of character encoding (include BOM for Excel)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Create a more descriptive filename including date/time
    const safeProperty = state.property.replace(/[^a-z0-9]/gi, '_');
    const safeDayString = state.selectedDay.replace(/[^a-z0-9_|]/gi, '-').replace(/-+/g, '-'); // Sanitize date string
    link.download = `PZH-Luchtkwaliteit_${safeProperty}_${safeDayString}_${state.timeValue}h.csv`;

    // Trigger download and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Release Blob URL resource
  } catch (error) {
    console.error("Error generating CSV download:", error);
    alert("Fout bij het genereren van het CSV-bestand.");
  }
};

// --- Provide Helper Function ---
// Make the getColor function available to child components (e.g., StationDetailModal for chart colors)
provide('getColor', getColor);

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log("Dashboard component mounted.");
  // Initial data fetching is triggered by the onMapLoaded event handler
});

onBeforeUnmount(() => {
  console.log("Dashboard component unmounting. Clearing intervals.");
  // Clean up intervals to prevent memory leaks
  stopHourCheck();
  stopSlider();
  // Note: Maplibre instance and Chart.js instance cleanup should happen within
  // the respective child components (MapDisplay, StationDetailModal) when they unmount.
});

</script>

<style>
/* Global styles for the dashboard layout and potentially scrollbars */
.dashboard-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden; /* Prevent scrolling on the main container */
  background-color: #f8f9fa; /* Optional: Background for empty areas */
}

.control-panel-container {
  width: 380px; /* Adjust width as needed */
  max-width: 90vw; /* Prevent excessive width on very small screens */
}

/* Apply scrollbar styling only to specific elements if needed, not globally */
.control-panel-container::-webkit-scrollbar,
.modal-body::-webkit-scrollbar /* Example: Target modal body */
{
  width: 8px;
}
.control-panel-container::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb
{
  background: #adb5bd;
  border-radius: 4px;
}
.control-panel-container::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover
{
  background: #868e96;
}

.loading-placeholder {
  background-color: #e9ecef;
}

/* Ensure map takes up space */
.map-display-container { /* Add this class to MapDisplay root if needed */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

</style>