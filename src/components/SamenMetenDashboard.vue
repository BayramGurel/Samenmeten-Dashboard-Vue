<template>
  <div id="map-container" class="position-relative w-100 h-100">
    <div id="map" class="position-absolute w-100 h-100"></div>

    <AppSidebar
        :is-visible="isSidebarOpen"
        :geojson-features="sidebarGeojsonFeatures"
        :formatted-property="formattedProperty"
        :description="description"
        @close-sidebar="isSidebarOpen = false"
    />

    <button
        class="btn btn-light position-fixed top-50 end-0 translate-middle-y shadow-sm" type="button"
        @click="isSidebarOpen = !isSidebarOpen"
        data-bs-target="#sidebar"
        aria-controls="sidebar"
        style="z-index: 1050;"
    >
      <i class="bi bi-list"></i> Aanvullende informatie
    </button>

    <ControlsPanel
        :initial-time-value="timeValue"
        :initial-selected-day="selectedDay"
        :initial-property="property"
        :day-names="dayNames"
        :formatted-property="formattedProperty"
        :legenda-values="legendaValues"
        :colors="colors"
        :concentration-values="concentrationValues"
        :is-from="isFrom"
        :filter-checkboxes="filterCheckboxes"
        v-model:stationSearchQuery="search"
        :is-local-file="isLocalFile"
        :file-name="fileName"
        :initial-interpolation-status="interpolationStatus"
        :is-playing="isPlaying"
        :button-class="buttonClass"
        @update:timeValue="onTimeValueChanged"
        @update:selectedDay="onSelectedDayChanged"
        @update:property="onPropertyChanged"
        @update:interpolationStatus="onInterpolationStatusChanged"
        @filters-updated="onFiltersUpdated"
        @toggle-play="toggleSlider"
        @stop-slider="stopSlider"
        @reload-page="reloadPage"
        @clear-input="clearInput"
        @select-matching-stations="selectMatchingStations"
        @download-geojson="downloadGeoJSON"
        @download-csv="downloadCSV"
        @local-file-cleared="clearLocalFileHandler"
        @file-uploaded="handleFileUploaded"
        class="custom-controls-panel"
    />

    <StationDetailModal
        :show-modal="isModalVisible"
        :station-properties="currentStationProperties"
        :chart-config="stationChartConfig"
        @close-modal="isModalVisible = false"
    />

    <ToastNotification
        ref="toastNotification"
        :time-string="toastTimeString"
    />
  </div>
</template>

<script>
// Import data and child components
import { data } from '@/data/variable.js'; // Assuming variable.js is in src/data
import AppSidebar from './AppSidebar.vue';
import ControlsPanel from './ControlsPanel.vue';
import StationDetailModal from './StationDetailModal.vue';
import ToastNotification from './ToastNotification.vue';
// import MapManager from './MapManager.js'; // Conceptual: for further refactoring map logic

export default {
  name: 'SamenMetenDashboard',
  components: {
    AppSidebar,
    ControlsPanel,
    StationDetailModal,
    ToastNotification,
  },
  data() {
    return {
      // Spread initial data from variable.js
      ...data,
      // Map instance
      map: null,
      mapManager: null, // Placeholder for future MapManager instance
      // GeoJSON data for the map
      geojson: { type: 'FeatureCollection', Features: [] }, // Initialize to avoid undefined errors
      // UI State
      isSidebarOpen: false,
      isModalVisible: false,
      currentStationProperties: {}, // For the station detail modal
      stationChartConfig: null,     // For the chart in the modal
      toastTimeString: '',          // For toast notifications
      search: '',                   // Search query for stations (v-model with ControlsPanel)
      // File handling state
      isLocalFile: false,
      fileName: 'Geojson bestand | Uploaden',
      isFrom: 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata...</a>', // Source information
      uploadedFile: null,           // Stores the File object from upload
      // Filter checkbox states (populated in mounted)
      regioCheckboxes: [],
      gemeenteCheckboxes: [],
      stationNameCheckboxes: [],
      // Layer specific
      currentLayerId: null, // Tracks the current IDW layer
      // Note: `elements` ref collection from original is replaced by direct data binding and props/events
    };
  },

  computed: {
    // Generates an array of the last 30 day names for date selection
    dayNames() {
      return Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return this.formatDate(date);
      });
    },
    // Dynamic class for the play/pause button
    buttonClass() {
      return this.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary';
    },
    // Formats the current property name for display (e.g., 'pm25' to 'PM2,5')
    formattedProperty() {
      const propertyMap = { 'pm25': 'PM2,5', 'pm10': 'PM10', 'no2': 'NO2' };
      return propertyMap[this.property] || this.property;
    },
    // GeoJSON features to be passed to the sidebar table
    sidebarGeojsonFeatures() {
      return this.geojson && this.geojson.Features ? this.geojson.Features : [];
    },
    // Bundles all filter checkbox data for easier prop passing to ControlsPanel
    filterCheckboxes() {
      return {
        regio: this.regioCheckboxes,
        gemeente: this.gemeenteCheckboxes,
        station_name: this.stationNameCheckboxes,
      };
    }
  },

  watch: {
    // Watchers to trigger layer updates when relevant data changes
    selectedDay(newVal) {
      if (this.dayNames.includes(newVal)) this.updateLayer();
    },
    property() { this.updateLayer(); },
    timeValue() { this.updateLayer(); },
    interpolationStatus() { this.updateLayer(); },
  },

  created() {
    // Initialize MapTiler style URL and start periodic hour change check
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`;
    this.checkHourChange();
  },

  async mounted() {
    // Initialize the map and its basic elements
    this.initializePrimaryMap();
    this.addMapControls(); // Adds default map controls (zoom, fullscreen, etc.)
    // this.addBaseLineLayer(); // Base line layer added on map 'load'

    // Fetch initial station data
    const initialGeojsonData = await this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
    this.geojson = initialGeojsonData && initialGeojsonData.Features ? initialGeojsonData : { type: 'FeatureCollection', Features: [] };

    // Populate filter checkbox lists based on initial data
    const [regios, gemeentes, stName] = await Promise.all([
      this.getUniqueItems(this.geojson, 'regio'),
      this.getUniqueItems(this.geojson, 'Gemeente'),
      this.getUniqueItems(this.geojson, 'station_name')
    ]);
    this.regioCheckboxes = this.createCheckboxItems(regios);
    this.gemeenteCheckboxes = this.createCheckboxItems(gemeentes);
    this.stationNameCheckboxes = this.createCheckboxItems(stName);

    // Set initial selected day and trigger first layer update
    this.selectedDay = this.dayNames.length > 0 ? this.dayNames[0] : this.formatDate(new Date());
    // updateLayer is called within map.on('load') after map is ready
  },

  methods: {
    // --- Event Handlers from Child Components ---
    onTimeValueChanged(newValue) { if (this.timeValue !== newValue) this.timeValue = newValue; },
    onSelectedDayChanged(newValue) { if (this.selectedDay !== newValue) this.selectedDay = newValue; },
    onPropertyChanged(newValue) { if (this.property !== newValue) this.property = newValue; },
    onInterpolationStatusChanged(newValue) { if (this.interpolationStatus !== newValue) this.interpolationStatus = newValue; },
    onFiltersUpdated({ type, checkedItems }) {
      const targetArray = type === 'regio' ? this.regioCheckboxes : type === 'gemeente' ? this.gemeenteCheckboxes : this.stationNameCheckboxes;
      targetArray.forEach(cb => cb.checked = checkedItems.includes(cb.id));
      this.updateLayer();
    },
    handleFileUploaded(file) {
      if (file) {
        this.uploadedFile = file;
        this.fileName = file.name;
        this.isLocalFile = true;
        this.updateLayer();
      }
    },
    clearLocalFileHandler() {
      this.uploadedFile = null;
      this.isLocalFile = false;
      this.fileName = 'Geojson bestand | Uploaden';
      this.updateLayer();
    },

    // --- Core Map Initialization ---
    initializePrimaryMap() {
      this.map = new window.maplibregl.Map({
        container: 'map', style: this.STYLE_URL, center: [4.218788, 52.008663], zoom: 8.9,
      });
      // Setup actions once the map style is loaded
      this.map.on('load', () => {
        this.addBaseLineLayer(); // Add initial decorative line layer
        this.updateLayer();     // Load initial data onto the map
      });
      // Handle re-adding layers if map style changes
      this.map.on('styledata', () => {
        if (this.map.isStyleLoaded()) {
          this.addBaseLineLayer();
          if (this.geojson && this.geojson.Features && this.geojson.Features.length > 0) {
            this.updateStationsOnMap(this.geojson); // Re-add stations layer
          }
          // Re-apply IDW layer if it was active
          if (this.interpolationStatus === 'activate' && this.currentLayerId) {
            this.handleIdwLayer(this.isLocalFile, this.timeValue, this.dayNames.indexOf(this.selectedDay));
          }
        }
      });
    },
    // Adds standard map controls (zoom, fullscreen, geolocation, style switcher)
    addMapControls() {
      this.addStyleSwitchControl(); // Custom style switcher
      this.map.addControl(new window.maplibregl.FullscreenControl());
      this.map.addControl(new window.maplibregl.NavigationControl());
      this.map.addControl(new window.maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true }, trackUserLocation: true
      }));
    },
    // Adds a decorative line layer (e.g., for a bounding box)
    addBaseLineLayer() {
      if (!this.map || !this.map.isStyleLoaded()) return;
      if (!this.map.getSource('line')) {
        this.map.addSource('line', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: this.bbox } } });
      }
      if (!this.map.getLayer('line')) {
        this.map.addLayer({ id: 'line', type: 'line', source: 'line', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ff0000', 'line-width': 1.4, 'line-opacity': 0.8, 'line-blur': 0.5 } });
      }
    },
    // Creates and adds the map style switcher control
    addStyleSwitchControl() {
      const styleSwitcherContainer = document.createElement('div');
      styleSwitcherContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group bg-light p-1 rounded shadow-sm'; // Added some Bootstrap styling
      const label = document.createElement('label');
      label.className = 'form-label fw-semibold text-success small d-block mb-1'; label.innerText = 'Achtergrond:'; // Bootstrap label styling
      styleSwitcherContainer.appendChild(label);
      const styleSwitcher = document.createElement('select');
      styleSwitcher.className = 'form-select form-select-sm'; styleSwitcher.style.cssText = 'font-size: 0.8em; cursor: pointer;';
      this.STYLE_URLS.map(url => `${url}${this.API_KEY}`).forEach((style, index) => {
        const option = document.createElement('option');
        option.value = style; option.text = this.STYLE_NAMES[index] || `Style ${index + 1}`;
        if (style === this.STYLE_URL) option.selected = true;
        styleSwitcher.appendChild(option);
      });
      styleSwitcher.onchange = async (event) => {
        try {
          this.map.setStyle(event.target.value);
          // updateLayer will be called by 'styledata' event listener
        } catch (error) { console.error('Error switching styles:', error); }
      };
      styleSwitcherContainer.appendChild(styleSwitcher);
      this.map.addControl({ onAdd: () => styleSwitcherContainer, onRemove: () => {}, getDefaultPosition: () => 'top-right' });
    },

    // --- Page/App Utilities ---
    reloadPage() { window.location.reload(); },
    clearInput(inputType) { // Handles clearing the date input from ControlsPanel
      if (inputType === 'sDate') {
        this.selectedDay = ''; this.updateLayer();
      }
    },
    // Periodically checks for hour change to update data (e.g., every 20 minutes)
    checkHourChange() { this.hourChangeInterval = setInterval(() => this.updateLayer(), 1000 * 60 * 20); },
    // Formats a date object into "DayName | DD Month YYYY" string
    formatDate(date) {
      const dayName = this.days[date.getDay()];
      const dateString = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      return `${dayName} | ${dateString}`;
    },

    // --- Slider Controls (Play/Pause for time animation) ---
    toggleSlider() { this.isPlaying = !this.isPlaying; this.isPlaying ? this.startSlider() : this.stopSlider(); },
    startSlider() {
      this.interval && clearInterval(this.interval);
      const maxHour = this.selectedDay === this.formatDate(new Date()) ? new Date().getHours() : 23;
      this.timeValue = 0; // Reset time to 0 when starting
      this.updateLayer();   // Update for hour 0
      this.interval = setInterval(() => {
        if (this.timeValue < maxHour) {
          this.timeValue++; // Watcher on timeValue will trigger updateLayer
        } else {
          this.stopSlider(); this.isPlaying = false;
        }
      }, 1550); // Animation interval
    },
    stopSlider() { clearInterval(this.interval); this.interval = null; },

    // --- Station Search Logic ---
    // Selects stations in the filter based on search query
    selectMatchingStations() {
      const lowerCaseSearch = this.search.toLowerCase();
      this.stationNameCheckboxes.forEach(s => s.checked = s.label.toLowerCase().includes(lowerCaseSearch)); // Changed to 'includes' for partial match
      this.updateLayer(); // Re-filter map based on new checkbox states
    },

    // --- Data Fetching & Processing ---
    async fetchData(url) {
      try {
        const response = await fetch(url, { method: "GET", credentials: "include", keepalive: true });
        if (!response.ok) { console.error(`HTTP error! status: ${response.status} for ${url}`); return { Features: [] }; }
        return await response.json();
      } catch (error) { console.error('Fetch error:', error, "URL:", url); return { Features: [] }; }
    },
    async loadLocalFile() { // Loads GeoJSON from a user-uploaded file
      if (!this.uploadedFile) return { Features: [] };
      try {
        const content = JSON.parse(await this.uploadedFile.text());
        return { ...content, Features: content.features || content.Features || [] }; // Normalize to Features array
      } catch (error) { console.error('Error reading local file:', error); this.toast('Error reading local file.', 'error'); return { Features: [] }; }
    },
    // Extracts unique values for a given property from GeoJSON features
    getUniqueItems(geojson, col) {
      return !geojson || !geojson.Features ? [] : [...new Set(geojson.Features.map(f => f.properties?.[col]).filter(Boolean))];
    },
    // Creates checkbox item objects for filter lists
    createCheckboxItems(items, preSelected = []) {
      return items.sort().map(item => ({ id: item, label: item, checked: preSelected.includes(item) }));
    },
    // Gets values of checked checkboxes from a checkbox array
    getSelectedCheckboxValues(arr) { return arr.filter(cb => cb.checked).map(cb => cb.id); },

    // --- Core Layer Update Logic ---
    // Main method to update map layers based on current filters and state
    async updateLayer() {
      if (!this.map || !this.map.isStyleLoaded()) return; // Guard against map not being ready

      // Update descriptive properties based on selected sensor type
      const propInfo = this.propValues[this.property] || this.propValues.default;
      Object.assign(this, { description: propInfo.description, legendaValues: propInfo.legendaValues, concentrationValues: propInfo.concentrationValues });

      // Get current filter selections
      const selReg = this.getSelectedCheckboxValues(this.regioCheckboxes);
      const selGem = this.getSelectedCheckboxValues(this.gemeenteCheckboxes);
      const selSta = this.getSelectedCheckboxValues(this.stationNameCheckboxes);

      // Reload layer data with new parameters
      await this.reloadLayer(this.timeValue, selReg, selGem, selSta);
    },
    // Fetches and filters GeoJSON data, then updates map
    async reloadLayer(hour, selRegios, selGemeentes, selStationNames) {
      try {
        this.isFrom = this.isLocalFile ? 'Gegevens zijn afkomstig <span class="link-success fw-semibold"">van uw Lokale Bestand</span>' : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata server.</a>';
        const dateIdx = this.dayNames.indexOf(this.selectedDay);
        await this.filterGeojsonFeatures(hour, dateIdx < 0 ? 0 : dateIdx, this.property, selRegios, selGemeentes, selStationNames, this.isLocalFile);
        this.updateStationsOnMap(this.geojson); // Update station markers
        this.handleIdwLayer(this.isLocalFile, hour, dateIdx < 0 ? 0 : dateIdx); // Update IDW layer
      } catch (error) { console.error('ReloadLayer error:', error); this.toast('Fout bij het laden van gegevens.', 'error');}
    },
    // Constructs API queries and processes GeoJSON based on filters
    async filterGeojsonFeatures(hour, selDateIdx, selProp, selRegs, selGems, selStats, isLocal) {
      const now = new Date();
      now.setDate(now.getDate() - selDateIdx); // Calculate target date
      // Construct UTC date string for API query
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour) + (now.getTimezoneOffset() / 60)));
      const measured_time = date.toISOString().replace('T', '%20').substring(0, 19) + '00';

      // Define API filter parameters
      const apiFilters = {
        'property': selProp,
        // Join array values for query params if they exist
        'station': selStats.length > 0 ? selStats.join(',') : undefined,
        'gemeente': selStats.length > 0 ? undefined : (selGems.length > 0 ? selGems.join(',') : undefined),
        'regio': selStats.length > 0 || selGems.length > 0 ? undefined : (selRegs.length > 0 ? selRegs.join(',') : undefined)
      };

      let newGeojson;
      if (isLocal) {
        newGeojson = await this.loadLocalFile();
      } else {
        let stationsUrl = new URL('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
        // Append only defined filters to the URL
        Object.entries(apiFilters).forEach(([key, value]) => {
          if (value) stationsUrl.searchParams.append(key, value);
        });
        let observationsUrl = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selProp}&measured_time=${measured_time}`);

        // Fetch station and observation data in parallel
        let [stationsData, obsData] = await Promise.all([this.fetchData(stationsUrl.toString()), this.fetchData(observationsUrl.toString())]);

        // Merge station data with corresponding observations
        const obsMap = new Map((obsData.Features || []).map(obs => [obs.properties.station_name, obs]));
        newGeojson = {
          type: 'FeatureCollection',
          Features: (stationsData.Features || []).reduce((acc, station) => {
            const matchingObs = obsMap.get(station.properties.station_name);
            if (matchingObs) {
              // Prioritize observation properties, but keep station's avg/max/min
              station.properties = {
                ...station.properties, // Keep original station details like regio, gemeente
                ...matchingObs.properties, // Add observation values
                avg_value: station.properties.avg_value, // Ensure these are from station
                max_value: station.properties.max_value,
                min_value: station.properties.min_value,
              };
              station.geometry = matchingObs.geometry; // Use observation geometry
              acc.push(station);
            }
            return acc;
          }, [])
        };
      }
      this.geojson = newGeojson; // Update main geojson data
      this.updateFilterCheckboxesBasedOnData(newGeojson); // Refresh filter lists
    },
    // Updates the checkbox lists in data based on the currently filtered GeoJSON
    updateFilterCheckboxesBasedOnData(geojson) {
      const update = (currentCheckboxes, newItemsFromData) => {
        const checkedIds = new Set(currentCheckboxes.filter(cb => cb.checked).map(cb => cb.id));
        return newItemsFromData.sort().map(item => ({ id: item, label: item, checked: checkedIds.has(item) }));
      };
      this.regioCheckboxes = update(this.regioCheckboxes, this.getUniqueItems(geojson, 'regio'));
      this.gemeenteCheckboxes = update(this.gemeenteCheckboxes, this.getUniqueItems(geojson, 'Gemeente'));
      this.stationNameCheckboxes = update(this.stationNameCheckboxes, this.getUniqueItems(geojson, 'station_name'));
    },
    // Manages the display of the IDW (Inverse Distance Weighting) interpolation layer
    handleIdwLayer(isLocal, hour, selDateIdx) {
      if (isLocal) { // IDW not shown for local files in this setup
        if (this.currentLayerId && this.map.getLayer(this.currentLayerId)) this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0);
        return;
      }
      const now = new Date();
      now.setDate(now.getDate() - selDateIdx);
      const dateForIdw = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour) + (now.getTimezoneOffset() / 60)));

      if (this.interpolationStatus === 'activate') {
        this.applyIdwInterpolationToMap(dateForIdw.toISOString());
      } else { // If 'disable' or any other status
        if (this.currentLayerId && this.map.getLayer(this.currentLayerId)) {
          this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0);
        }
      }
    },

    // --- Map Layer Updates ---
    // Updates or adds the 'stations' GeoJSON source and circle layer on the map
    updateStationsOnMap(geojson) {
      if (!this.map || !this.map.isStyleLoaded() || !geojson) return;
      let mapGeoJson = { ...geojson, features: geojson.Features || [] }; // Normalize to 'features'
      if (mapGeoJson.Features) delete mapGeoJson.Features; // Remove 'Features' if it exists

      const source = this.map.getSource('stations');
      if (source) {
        source.setData(mapGeoJson); // Update existing source
      } else {
        this.map.addSource("stations", { type: 'geojson', data: mapGeoJson }); // Add new source
      }
      if (!this.map.getLayer('stations')) {
        this.addStationsLayerToMap(); // Add layer if it doesn't exist
      }

      // Re-bind click listener for stations layer
      this.map.off('click', 'stations', this.onStationFeatureClick);
      this.map.on('click', 'stations', this.onStationFeatureClick);
    },
    // Defines and adds the 'stations' circle layer to the map
    addStationsLayerToMap() {
      this.map.addLayer({
        id: 'stations', type: 'circle', source: 'stations',
        paint: {
          'circle-radius': 6, 'circle-color': this.getCircleColor(),
          'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.8,
        }
      });
    },
    // Applies the IDW interpolation raster layer to the map
    applyIdwInterpolationToMap(dateISO) {
      if (!this.map || !this.map.isStyleLoaded()) return;
      let bounds = this.bbox; // Assumes this.bbox = [minLng, minLat, maxLng, maxLat]
      let layerId = `interpolatie-${dateISO}-${this.property}`;

      // Hide previous IDW layer if a new one is being shown
      if (this.currentLayerId && this.currentLayerId !== layerId && this.map.getLayer(this.currentLayerId)) {
        this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0);
      }
      this.currentLayerId = layerId; // Track the currently active IDW layer

      // Add source and layer if they don't exist
      if (!this.map.getSource(layerId)) {
        let url = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${this.property}_sqldb&bbox=${bounds.join(',')}&time=${dateISO}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`;
        this.map.addSource(layerId, {
          'type': 'image', 'url': url,
          'coordinates': [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]]
        });
      }
      if (!this.map.getLayer(layerId)) {
        this.map.addLayer({'id': layerId, 'type': 'raster', 'source': layerId, 'paint': {'raster-opacity': 1}});
      } else {
        this.map.setPaintProperty(layerId, 'raster-opacity', 1); // Ensure it's visible if already exists
      }
    },

    // --- Map Click Handling & Popups ---
    // Handles clicks on station features on the map
    onStationFeatureClick(e) {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['stations'] });
      if (!features.length) return;
      // If multiple features are clicked (overlapping points), show a dropdown to select one
      if (features.length > 1) {
        this.createMapDropdownPopup(features, e.lngLat);
      } else { // Otherwise, show detail popup for the single feature
        this.createMapDetailPopup(features[0], e.lngLat);
      }
    },
    // Creates a dropdown popup if multiple stations are clicked
    createMapDropdownPopup(features, lngLat) {
      let dropdownHTML = `<div class="card text-center border-primary shadow-sm"><div class="card-header bg-primary text-white p-2"><h6>Selecteer Station <i class="bi bi-search"></i></h6></div><div class="card-body p-2"><div class="dropdown">`;
      dropdownHTML += `<button class="btn btn-outline-primary dropdown-toggle btn-sm w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">Kies een station</button>`;
      dropdownHTML += `<div class="dropdown-menu p-1 w-100" style="max-height: 150px; overflow-y: auto;">`;
      features.forEach((feature, index) => {
        const color = this.getColor(feature.properties.value, feature.properties.property, 1);
        dropdownHTML += `<a class="dropdown-item small" href="#" data-feature-index="${index}"><i class="bi bi-geo-alt-fill me-1" style="color: ${color};"></i>${feature.properties.station_name}</a>`;
      });
      dropdownHTML += `</div></div></div></div>`;
      const popup = new window.maplibregl.Popup({ className: 'my-popup maplibregl-popup-multiple', closeButton: false, maxWidth: '260px' }).setLngLat(lngLat).setHTML(dropdownHTML).addTo(this.map);

      // Add event listeners to dropdown items after popup is added to DOM
      this.$nextTick(() => {
        const popupElement = popup.getElement();
        if (popupElement) {
          popupElement.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (evt) => {
              evt.preventDefault();
              const selectedFeature = features[parseInt(evt.target.dataset.featureIndex)];
              this.createMapDetailPopup(selectedFeature, lngLat); // Show detail for selected
              popup.remove(); // Remove dropdown popup
            });
          });
        }
      });
    },
    // Creates a detail popup for a single station feature
    createMapDetailPopup(feature, lngLat) {
      const popupHTML = this.getPopupHTMLForMapManager(feature.properties);
      const popup = new window.maplibregl.Popup({ className: 'my-popup maplibregl-popup-single', closeButton: true, maxWidth: '280px' }).setLngLat(lngLat).setHTML(popupHTML).addTo(this.map);
      // Add event listener to the button within the popup to show modal
      this.$nextTick(() => {
        const popupElement = popup.getElement();
        if (popupElement) {
          const btn = popupElement.querySelector('button.show-modal-btn');
          if (btn) btn.addEventListener('click', () => this.handleStationClickedActions(feature.properties, popup));
        }
      });
    },
    // Actions to take when a station is clicked (either directly or from dropdown)
    handleStationClickedActions(properties, popupToRemove = null) {
      this.currentStationProperties = properties; // Set data for modal
      this.loadChart(properties);                 // Prepare chart data
      this.isModalVisible = true;                 // Show the modal
      if (popupToRemove) popupToRemove.remove();  // Remove the map popup
    },
    // Generates HTML content for the station detail popup
    getPopupHTMLForMapManager({ station_name, property, value, unit, Gemeente, regio, measured_time }) {
      const val = parseFloat(value);
      const displayValue = isNaN(val) ? 'N/A' : val.toFixed(1);
      const date = new Date(measured_time);
      const formattedDate = isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
      const color = this.getColor(value, property, 1);
      return `
        <div class="card text-center shadow-sm" style="border-color: ${color}; font-size: 0.85rem;">
          <div class="card-header p-2" style="background-color: ${color}; color: white;"><h6>${station_name}</h6></div>
          <div class="card-body p-2">
            <h6 class="card-title small mb-1">${this.formattedProperty}: ${displayValue} ${unit||''}</h6>
            <p class="small mb-1">Gemeente ${Gemeente||'N/A'} - Regio ${regio||'N/A'}</p>
            <p class="card-text mb-2"><small class="text-muted">Update: ${formattedDate}</small></p>
            <button class="btn btn-sm mt-1 show-modal-btn w-100" style="background-color: ${color}; color: white;">Details & Grafiek</button>
          </div>
        </div>`;
    },
    // Determines circle color for station markers based on property and value
    getCircleColor() {
      return ['case',['==',['get','property'],'pm25'],['step',['get','value'],'#1E90FF',8.3,'#48D1CC',16.7,'#9ACD32',25,'#DAA520',Infinity,'#000000'],['in',['get','property'],['literal',['no2','pm10']]],['step',['get','value'],'#1E90FF',13.3,'#48D1CC',26.6,'#9ACD32',40,'#DAA520',Infinity,'#000000'],'#000000'];
    },
    // Helper function to get a color with alpha based on value and property thresholds
    getColor(value, property, alpha) {
      const v = parseFloat(value);
      if (isNaN(v)) return `rgba(128,128,128,${alpha})`; // Grey for N/A values
      const thresholds = property === "pm25" ? [8.3, 16.7, 25] : [13.3, 26.6, 40]; // Thresholds for PM2.5 or PM10/NO2
      const colors = ['rgba(30,144,255,', 'rgba(72,209,204,', 'rgba(154,205,50,', 'rgba(218,165,32,']; // Blue, Teal, Green-Yellow, Orange
      let colorIndex = thresholds.findIndex(threshold => v < threshold);
      if (colorIndex === -1) colorIndex = colors.length - 1; // If value exceeds all thresholds, use last color
      return `${colors[colorIndex]}${alpha})`; // Return RGBA color string
    },

    // --- Downloads & Toast Notifications ---
    async downloadGeoJSON() {
      if (!this.geojson || !this.geojson.Features || this.geojson.Features.length === 0) { this.toast('Geen gegevens om te downloaden.', 'warning'); return; }
      const toDownload = { ...this.geojson, features: this.geojson.Features }; delete toDownload.Features; // Ensure 'features' array
      const str = JSON.stringify(toDownload);
      const uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(str);
      const link = document.createElement('a'); link.href = uri; link.download = `PZH-Luchtkwaliteit_${this.property}.geojson`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      this.toast('GeoJSON bestand succesvol gedownload.');
    },
    async downloadCSV() {
      if (!this.geojson || !this.geojson.Features || this.geojson.Features.length === 0) { this.toast('Geen gegevens om te downloaden.', 'warning'); return; }
      const HEADER = 'Station;Tijdstip;Meting;Regio;Gemeente;Waarde;Eenheid\n'; let csv = HEADER;
      this.geojson.Features.forEach(f => {
        const p = f.properties;
        csv += `${p.station_name||'N/A'};${p.measured_time ? new Date(p.measured_time).toISOString():'N/A'};${p.property||this.formattedProperty||'N/A'};${p.regio||'N/A'};${p.Gemeente||'N/A'};${p.value!=null?Number(p.value).toFixed(2):'N/A'};${p.unit||'N/A'}\n`;
      });
      const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); link.download = 'PZH_Luchtkwaliteit_Samen_Meten.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      this.toast('CSV bestand succesvol gedownload.');
    },
    // Shows a toast notification
    toast(message, type = 'success') {
      this.toastTimeString = new Date().toLocaleTimeString('nl-NL');
      this.$refs.toastNotification.show(message, type);
    },

    // --- Chart Logic (Data Preparation for StationDetailModal) ---
    async loadChart(properties) {
      try {
        const url = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${properties.station_name}&property=${properties.property}&location=${properties.location_uuid}`);
        const obsData = await this.fetchData(url.toString());
        if (!obsData || !obsData.Features || obsData.Features.length === 0) {
          this.stationChartConfig = this.createEmptyChartConfig(properties.property, "Geen historische data gevonden."); return;
        }
        const dataByDate = this.processDataForChart(obsData);
        if (Object.keys(dataByDate).length === 0) {
          this.stationChartConfig = this.createEmptyChartConfig(properties.property, "Geen data te visualiseren."); return;
        }
        const datasets = this.createDatasetsForChart(properties.property, dataByDate);
        this.stationChartConfig = {
          type: 'bar',
          data: { labels: dataByDate[Object.keys(dataByDate)[0]].times, datasets: datasets }, // Use labels from first date entry
          options: { // Base options, specific chart options come from StationDetailModal
            ...this.chartOptions, // Spread global chart options from variable.js
            plugins: {
              ...(this.chartOptions.plugins || {}),
              annotation: { // Annotation configuration for thresholds
                annotations: [{
                  type: 'box',
                  yMin: properties.property === "pm25" ? 25 : 40, // Example threshold
                  // yMax: Infinity, // Optionally define a max if needed
                  backgroundColor: 'rgba(230, 25, 75, 0.05)', // Lighter, less obtrusive
                  borderColor: 'rgba(230, 25, 75, 0.3)',
                  borderWidth: 1,
                  borderDash: [6, 6], // Dashed line for threshold
                  label: {
                    content: properties.property === "pm25" ? 'PM2,5 Adviesgrens WHO' : 'Adviesgrens WHO',
                    enabled: true,
                    position: 'end', // Position label at the end of the box
                    backgroundColor: 'rgba(230, 25, 75, 0.5)',
                    color: 'white',
                    font: { size: 9 },
                    padding: 3,
                    yAdjust: -10, // Adjust label position slightly
                  }
                }]
              }
            }
          }
        };
      } catch (error) {
        console.error('Chart load error:', error);
        this.stationChartConfig = this.createEmptyChartConfig(properties.property, `Fout bij laden grafiek: ${error.message}`);
        this.toast('Fout bij laden grafiekdata.', 'error');
      }
    },
    // Creates a default empty chart configuration
    createEmptyChartConfig(prop, msg = "Geen data beschikbaar") { return { type: 'bar', data: { labels: [msg], datasets: [{ label: prop, data: [] }] }, options: { ...this.chartOptions, responsive: true, maintainAspectRatio: false }}; },
    // Processes observation data into a format suitable for charting (grouped by date, hourly values)
    processDataForChart(obsData) {
      return obsData.Features.reduce((acc, feat) => {
        const date = new Date(feat.properties.measured_time);
        const dateStr = date.toISOString().split('T')[0]; // Group by date string YYYY-MM-DD
        const hour = date.getUTCHours(); // Use UTC hours as data is in UTC
        if (!acc[dateStr]) { // Initialize entry for new date
          acc[dateStr] = {
            times: Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00 GMT`), // Labels for X-axis (hours)
            values: Array(24).fill(null) // Initialize hourly values to null
          };
        }
        acc[dateStr].values[hour] = feat.properties.value; // Assign value to the correct hour
        return acc;
      }, {});
    },
    // Creates dataset objects for Chart.js based on processed data
    createDatasetsForChart(prop, dataByDate) {
      const datasets = Object.entries(dataByDate).map(([date, data]) => {
        const dateObj = new Date(date + 'T00:00:00Z'); // Ensure UTC context for getDay
        return {
          label: dateObj.toLocaleDateString('nl-NL', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }),
          dateString: date, data: data.values,
          backgroundColor: data.values.map(v => this.getColor(v, prop, '0.6')), // Slightly more opaque bars
          borderColor: this.dayColors[dateObj.getUTCDay()], borderWidth: 1, // Thinner border
          borderRadius: {topLeft:3,topRight:3}, hidden: true // Initially hide all but the latest
        };
      });
      datasets.sort((a,b) => new Date(a.dateString) - new Date(b.dateString)); // Sort datasets by date
      if (datasets.length > 0) datasets[datasets.length-1].hidden = false; // Show the most recent dataset by default
      return datasets;
    },
  },
  beforeUnmount() {
    // Clean up intervals and map instance to prevent memory leaks
    clearInterval(this.interval); clearInterval(this.hourChangeInterval);
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
};
</script>

<style scoped>
#map-container {
  font-family: 'Arial', sans-serif; /* Consider using a more modern font stack if available */
}
.custom-controls-panel {
  position: absolute;
  top: 1rem; /* Consistent with margin-top */
  left: 1rem; /* Consistent with margin-left */
  z-index: 1000; /* Ensure it's above the map but below modals/offcanvas toggles if necessary */
  max-height: calc(100vh - 2rem); /* Max height relative to viewport height */
  overflow-y: auto; /* Enable vertical scroll if content exceeds max height */
  overflow-x: hidden; /* Prevent horizontal scroll */
  width: clamp(300px, 30vw, 420px); /* Responsive width: min 300px, 30% of viewport, max 420px */
  background-color: rgba(255, 255, 255, 0.95); /* Slightly more opaque for better readability */
  border-radius: 0.375rem; /* Bootstrap's default rounded corners (rounded) */
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); /* Closer to Bootstrap's shadow-sm */
  padding: 0; /* Remove padding if child ControlsPanel has its own consistent padding */
}

/* Global scrollbar style (optional, from original) */
*::-webkit-scrollbar { width: 8px; /* Slightly thinner scrollbar */ }
*::-webkit-scrollbar-thumb { background: #adb5bd; border-radius: 4px; } /* Bootstrap's gray color */
*::-webkit-scrollbar-thumb:hover { background: #55595c; } /* Darker on hover */

/* Styling for MapLibre popups using :deep to target child elements */
:deep(.maplibregl-popup-content) {
  border-radius: 0.375rem; /* Bootstrap's default rounded */
  box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.1); /* Softer shadow */
  padding: 0; /* Remove default padding if card has its own */
  max-width: 280px !important;
  font-size: 0.9rem; /* Slightly smaller base font for popups */
}
:deep(.maplibregl-popup-close-button) {
  padding: 0.25rem 0.5rem;
  font-size: 1.2em;
  color: #6c757d; /* Bootstrap's secondary color */
}
:deep(.maplibregl-popup-close-button:hover) {
  color: #000;
}
:deep(.maplibregl-popup-multiple .dropdown-menu) {
  font-size: 0.8rem; /* Smaller font for dropdown items in multi-select popup */
}
:deep(.maplibregl-popup-single .card) {
  border-width: 1px; /* Thinner border for single station popup card */
}

/* Style for the map style switcher control if needed */
:deep(.maplibregl-ctrl-group .form-select-sm) {
  height: auto; /* Adjust if text is cut off */
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  border-radius: 0.25rem; /* Consistent rounding */
}
:deep(.maplibregl-ctrl-group .form-label) {
  margin-bottom: 0.25rem; /* Space below label */
}
</style>
