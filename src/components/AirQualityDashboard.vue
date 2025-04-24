<template>
  <div id="map-container" class="position-relative w-100 h-100">
    <div id="map" class="position-absolute w-100 h-100"></div>

    <div class="offcanvas offcanvas-end rounded" tabindex="-1" id="sidebar" style="width: 50%; top: 1%; bottom: 1%;" data-bs-scroll="true" data-bs-backdrop="false">
      <div class="offcanvas-header">
        <h3 class="offcanvas-title">Informatie over de stations</h3>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <SidebarContent
          :geojson="geojson"
          :formattedProperty="formattedProperty"
          :description="description"
      />
    </div>
    <button class="btn btn-light position-fixed top-50 end-0 translate-middle-y" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar" style="z-index: 2;">
      <i class="bi bi-list"></i> Aanvullende informatie
    </button>

    <div class="container-fluid" id="czoom">
      <div class="position-absolute start-0 shadow mt-3 ms-3 col-md-4 col-8 custom-div">
        <ControlPanel
            :property="property"
            :timeValue="timeValue"
            :selectedDay="selectedDay"
            :dayNames="dayNames"
            :isPlaying="isPlaying"
            :formattedProperty="formattedProperty"
            :legendaValues="legendaValues"
            :colors="colors"
            :concentrationValues="concentrationValues"
            :isFrom="isFrom"
            :regio="regio"
            :Gemeente="Gemeente"
            :station_name="station_name"
            :search="search"
            :isLocalFile="isLocalFile"
            :fileName="fileName"
            :interpolationStatus="interpolationStatus"
            :propValues="propValues"
            :days="days"
            @update:property="handlePropertyUpdate"
            @update:timeValue="handleTimeValueUpdate"
            @update:selectedDay="handleSelectedDayUpdate"
            @update:search="handleSearchUpdate"
            @update:interpolationStatus="handleInterpolationStatusUpdate"
            @togglePlay="handleTogglePlay"
            @stopSlider="handleStopSlider"
            @clearDayInput="handleClearDayInput"
            @updateFilter="handleFilterUpdate"
            @selectMatchingStations="handleSelectMatchingStations"
            @downloadGeoJSON="downloadGeoJSON"
            @downloadCSV="downloadCSV"
            @clearLocalFile="handleClearLocalFile"
            @fileUploaded="handleFileUploaded"
            @reloadPage="handleReloadPage"
        />
      </div>
    </div>

    <div class="modal fade content-none" id="modalWithBothOptions" tabindex="-1" aria-labelledby="modalWithBothOptionsLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl" id="czoom2">
        <StationDetailModal
            :properties="modalProperties"
            :formattedProperty="formattedProperty"
            :rawObservationData="modalRawObservationData"
            :getColor="getColor"
            :dayColors="dayColors"
            :chartOptionsFromParent="chartOptions"
        />
      </div>
    </div>

    <div class="toast-container position-fixed bottom-0 end-0 p-3 content-none" style="z-index: 9999;">
      <NotificationToast
          :show="showToast"
          :timeString="toastTimeString"
          @hidden="showToast = false"
      />
    </div>
  </div>
</template>

<script>
// Original Imports
import { data } from '@/data/variable.js';

// Child Component Imports
import SidebarContent from './SidebarContent.vue';
import ControlPanel from './ControlPanel.vue';
import StationDetailModal from './StationDetailModal.vue';
import NotificationToast from './NotificationToast.vue';

// Assume maplibregl, Chart are global

export default {
  name: 'SamenMetenDashboard',
  components: {
    SidebarContent,
    ControlPanel,
    StationDetailModal,
    NotificationToast
  },
  data() {
    // State remains the same as previous corrected version
    return {
      ...data, map: null, geojson: { type: 'FeatureCollection', Features: [] }, property: 'pm25', timeValue: new Date().getHours(), selectedDay: '', isPlaying: false, regio: [], Gemeente: [], station_name: [], search: '', isLocalFile: false, fileName: 'Uploaden | Geojson bestand', interpolationStatus: 'disable', description: '', legendaValues: [], concentrationValues: [], isFrom: '', modalProperties: {}, modalRawObservationData: null, showToast: false, toastTimeString: '', localGeojsonContent: null, interval: null, currentLayerId: null, rasterLayers: new Set(), regios: [], gemeentes: [], stName: [],
    };
  },

  computed: { // Verbatim
    dayNames() { return Array.from({length: 30}, (_, i) => { const date = new Date(); date.setDate(date.getDate() - i); return this.formatDate(date); }); },
    formattedProperty() { const p = { 'pm25': 'PM2,5', 'pm10': 'PM10', 'no2': 'NO2' }; return p[this.property] || this.property; }
  },

  watch: { // Verbatim
    selectedDay(newVal) { if (this.dayNames.includes(newVal)) { this.updateLayer(); } },
  },

  created() { // Verbatim
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`; this.checkHourChange();
  },

  async mounted() { // Verbatim (minus elements)
    document.getElementById('czoom').style.zoom = "87%"; const modalDialog = document.querySelector('#modalWithBothOptions .modal-dialog'); if (modalDialog) modalDialog.style.zoom = "113%"; const sidebarElem = document.getElementById('sidebar'); if (sidebarElem) sidebarElem.style.zoom = "87%";
    this.initializeMap(); this.addControls();
    this.geojson = await this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
    [this.regios, this.gemeentes, this.stName] = await Promise.all([ this.getUniqueItems(this.geojson, 'regio'), this.getUniqueItems(this.geojson, 'Gemeente'), this.getUniqueItems(this.geojson, 'station_name') ]);
    this.createCheckboxes('regio', this.regios); this.createCheckboxes('Gemeente', this.gemeentes); this.createCheckboxes('station_name', this.stName);
    this.selectedDay = this.dayNames[0];
  },

  methods: {
    // ==================================================
    // == Methods: Map, Data, Helpers, Orchestration   ==
    // ==================================================

    async initializeMap() { /* Verbatim */
      this.map = new window.maplibregl.Map({ container: 'map', style: this.STYLE_URL, center: [4.218788, 52.008663], zoom: 8.9, });
      this.map.on('load', () => { this.addLineSourceAndLayer(); this.updateLayer(); this.map.on('click', 'stations', this.handleStationClick); });
    },
    async addLineSourceAndLayer() { /* Verbatim */
      if (!this.map || !this.map.isStyleLoaded()) return; if (!this.map.getSource('line')) { this.map.addSource('line', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: this.bbox } } }); } if (!this.map.getLayer('line')) { this.map.addLayer({ id: 'line', type: 'line', source: 'line', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ff0000', 'line-width': 1.4, 'line-opacity': 0.8, 'line-blur': 0.5 } }); }
    },
    async addControls() { /* Verbatim */
      if (!this.map) return; this.addStyleSwitchControl(); this.map.addControl(new window.maplibregl.FullscreenControl()); this.map.addControl(new window.maplibregl.NavigationControl()); this.map.addControl(new window.maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }));
    },
    addStyleSwitchControl() { /* Verbatim */
      if (!this.map) return; const styleSwitcher = this.createStyleSwitcher(); const styleSwitchControl = this.createStyleSwitchControl(styleSwitcher); this.map.addControl(styleSwitchControl, 'top-right');
    },
    createStyleSwitcher() { /* Verbatim (Original Timeout) */
      const styleSwitcherContainer = document.createElement('div'); styleSwitcherContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group'; const label = document.createElement('label'); label.className = 'fw-semibold text-success'; label.innerText = 'Selecteer achtergrond:'; styleSwitcherContainer.appendChild(label); const styleSwitcher = document.createElement('select'); styleSwitcher.className = 'form-select form-select-sm'; styleSwitcher.style.fontSize = '1.2em'; styleSwitcher.style.cursor = 'pointer'; const styles = this.STYLE_URLS.map(url => `${url}${this.API_KEY}`); styles.forEach((style, index) => { const option = document.createElement('option'); option.value = style; option.text = this.STYLE_NAMES[index] || `Style ${index + 1}`; styleSwitcher.appendChild(option); });
      styleSwitcher.onchange = async (event) => { try { this.map.setStyle(event.target.value); setTimeout(() => { this.updateLayer(); this.addLineSourceAndLayer(); }, 50); } catch (error) { console.error('An error occurred while switching styles:', error); } };
      styleSwitcherContainer.appendChild(styleSwitcher); return styleSwitcherContainer;
    },
    createStyleSwitchControl(styleSwitcher) { /* Verbatim */
      return { onAdd: () => { return styleSwitcher; }, onRemove: function() {}, getDefaultPosition: function() { return 'top-right'; }, };
    },
    async checkHourChange() { /* Verbatim */
      setInterval(async () => { this.updateLayer(); }, 1000 * 60 * 20);
    },
    formatDate(date) { /* Verbatim */
      const dayName = this.days[date.getDay()]; const dateString = date.toLocaleDateString('nl-NL', {day: 'numeric', month: 'long', year: 'numeric'}); return `${dayName} | ${dateString}`;
    },
    async fetchData(url) { /* Verbatim (with basic error handling) */
      try { let response = await fetch(url, {method: "GET", credentials: "include", keepalive: true}); if (!response.ok) { console.error(`HTTP error! status: ${response.status} for ${url}`); return { Features: [] }; } return await response.json(); } catch (error) { console.error(`Workspace failed for ${url}:`, error); return { Features: [] }; }
    },
    async getUniqueItems(geojson, uniqueColumn) { /* Verbatim */
      if (!geojson || !geojson.Features) return []; return [...new Set(geojson.Features.map(Feature => Feature.properties?.[uniqueColumn]))];
    },
    async createCheckboxes(id, items) { /* Verbatim (original simple version) */
      const selectedItems = this[id] ? this[id].filter(i => i.checked).map(i => i.id) : []; this[id] = items.sort().map(item => ({ id: item, label: item, checked: selectedItems.includes(item) }));
    },
    async updateLayer() { /* ADAPTED */
      const propInfo = this.propValues[this.property] || this.propValues.default; if(propInfo){ this.description = propInfo.description; this.legendaValues = propInfo.legendaValues; this.concentrationValues = propInfo.concentrationValues; }
      const selectedRegio = this.regio.filter(i => i.checked).map(i => i.id); const selectedGemeente = this.Gemeente.filter(i => i.checked).map(i => i.id); const selectedStName = this.station_name.filter(i => i.checked).map(i => i.id);
      this.reloadLayer(this.map, this.timeValue, selectedRegio, selectedGemeente, selectedStName).catch(error => console.error('Error reloading layer:', error));
    },
    async reloadLayer(map, hour, selectedRegio, selectedGemeente, selectedStName) { /* ADAPTED */
      try { if (!this.map) return; this.fileName = this.isLocalFile ? this.fileName : 'Geojson bestand | Uploaden'; this.isFrom = this.isLocalFile ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold"">van jouw Local File</span>' : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata. Bekijk de metadata voor details over de serverdata.</a>'; const selectedDateIndex = this.dayNames.indexOf(this.selectedDay); if (selectedDateIndex === -1) { console.warn("Invalid selected day for reload:", this.selectedDay); return; }
        await this.filterGeojsonFeatures(hour, selectedDateIndex, this.property, selectedRegio, selectedGemeente, selectedStName, this.isLocalFile);
        this.updateMapSourceAndLayer(this.map, this.geojson);
      } catch (error) { console.error(error); }
    },
    async filterGeojsonFeatures(hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile) { // *** CORRECTED ***
      const now = new Date(); now.setDate(now.getDate() - selectedDateIndex); const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour) + now.getTimezoneOffset() / 60)); const measured_time = date.toISOString().replace('T', '%20').substring(0, 19) + '00'; const measured_time_iso = date.toISOString();
      if (this.interpolationStatus === 'activate') { if (this.map && this.map.isStyleLoaded()) { this.idw_interpolation(measured_time_iso); } } else if (this.currentLayerId && this.map && this.map.getLayer(this.currentLayerId)) { this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0); }
      const filters = { 'property': selectedProperty, 'station': selectedStName, 'gemeente': selectedGemeente, 'regio': selectedRegio }; // Use arrays directly

      let filteredGeojson;
      if (isLocalFile) { if (this.localGeojsonContent) { filteredGeojson = this.localGeojsonContent; if (filteredGeojson.features && !filteredGeojson.Features) { filteredGeojson.Features = filteredGeojson.features; delete filteredGeojson.features; } } else { filteredGeojson = { type: 'FeatureCollection', Features: [] }; } }
      else {
        let url1 = new URL('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
        // *** CORRECTED LOOP ***
        Object.entries(filters).forEach(([key, value]) => {
          // Only append if value exists and has length (for arrays or strings)
          if (value && value.length > 0) {
            // Check if value is an array before attempting join (which was removed anyway)
            // Use original direct append:
            url1.searchParams.append(key, value);
          }
        });
        let url2 = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selectedProperty}&measured_time=${measured_time}`); // Use original time format

        try { let [stations, observations] = await Promise.all([this.fetchData(url1.toString()), this.fetchData(url2.toString())]); if (!stations || !stations.Features || !observations || !observations.Features){ throw new Error("Invalid API data"); } let observationMap = new Map(); observations.Features.forEach(obs => { if(obs?.properties?.station_name) observationMap.set(obs.properties.station_name, obs); });
          filteredGeojson = { type: 'FeatureCollection', Features: stations.Features.filter(station => { if (!station?.properties?.station_name) return false; let matchingObservation = observationMap.get(station.properties.station_name); if (matchingObservation?.properties && matchingObservation?.geometry) { const { avg_value, max_value, min_value } = station.properties; station.properties = {...matchingObservation.properties}; if (avg_value !== undefined) station.properties.avg_value = avg_value; if (max_value !== undefined) station.properties.max_value = max_value; if (min_value !== undefined) station.properties.min_value = min_value; station.geometry = matchingObservation.geometry; return true; } return false; })};
        } catch (error) { console.error("Error fetching/processing API data:", error); filteredGeojson = { type: 'FeatureCollection', Features: [] }; }
      }
      this.geojson = filteredGeojson;
      [this.regios, this.gemeentes, this.stName] = await Promise.all([ this.getUniqueItems(this.geojson, 'regio'), this.getUniqueItems(this.geojson, 'Gemeente'), this.getUniqueItems(this.geojson, 'station_name') ]);
      this.createCheckboxes('regio', this.regios); this.createCheckboxes('Gemeente', this.gemeentes); this.createCheckboxes('station_name', this.stName);
    },
    async idw_interpolation(date) { /* ADAPTED */
      if (!this.map || !this.map.isStyleLoaded()) return; let bounds = [3.773675345120739, 51.64377788724585, 5.031415001585676, 52.3325109475691]; let layerId = 'interpolatie-' + date + '-' + this.property; this.rasterLayers.add(layerId); this.rasterLayers.forEach(id => { if (this.map.getLayer(id)) { this.map.setPaintProperty(id, 'raster-opacity', id === layerId ? 1 : 0); } }); this.currentLayerId = layerId;
      if (!this.map.getSource(layerId)) { let url = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${this.property}_sqldb&bbox=${bounds.join(',')}&time=${date}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`; this.map.addSource(layerId, { 'type': 'image', 'url': url, 'coordinates': [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]] }); }
      if (!this.map.getLayer(layerId)) { this.map.addLayer({'id': layerId, 'type': 'raster', 'source': layerId, 'paint': {'raster-opacity': 1}}); } else { this.map.setPaintProperty(layerId, 'raster-opacity', 1); }
    },
    async downloadGeoJSON() { /* Verbatim */
      let dataToDownload = { ...this.geojson }; if (dataToDownload.Features && !dataToDownload.features) { dataToDownload.features = dataToDownload.Features; delete dataToDownload.Features; } let dataStr = JSON.stringify(dataToDownload, null, 2); let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr); let link = document.createElement('a'); link.href = dataUri; link.download = `PZH-Luchtkwaliteit_${this.property}.geojson`; this.toast(); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    },
    async downloadCSV() { /* Verbatim (Original logic) */
      const CSV_HEADER = 'Station naam;Datum en tijd;Property;Regio;Gemeente;Value;Unit\n'; const DEFAULT_VALUE = 'N/A'; let csv = CSV_HEADER; const features = this.geojson?.features ?? this.geojson?.Features ?? [];
      features.forEach(feature => { let p = feature.properties; let s = p?.station_name||DEFAULT_VALUE; let m = p?.measured_time ? new Date(p.measured_time).toISOString() : DEFAULT_VALUE; let prop = p?.property||DEFAULT_VALUE; let r = p?.regio||DEFAULT_VALUE; let g = p?.Gemeente||DEFAULT_VALUE; let v = p?.value!==undefined?`${p.value.toFixed(2)}`:DEFAULT_VALUE; let u = p?.unit||DEFAULT_VALUE; csv += `${s}; ${m}; ${prop}; ${r}; ${g}; ${v}; ${u}\n`; });
      let link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); link.download = 'Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.csv'; this.toast(); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    },
    async toast() { /* ADAPTED */ const now = new Date(); this.toastTimeString = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds(); this.showToast = true; },
    updateMapSourceAndLayer(map, geojson) { /* Verbatim */
      if (!map || !map.isStyleLoaded()) return; if (!geojson || (!geojson.Features && !geojson.features)) { geojson = {type:'FeatureCollection', features:[]}; }
      if (geojson.Features && !geojson.features) { geojson.features = geojson.Features; delete geojson.Features; } const source = map.getSource('stations'); if (!source) { map.addSource("stations", {type: 'geojson', data: geojson}); } else { source.setData(geojson); } if (!map.getLayer('stations')) { this.addStationsLayer(); }
    },
    getCircleColor() { /* Verbatim */
      return [ 'case', ['==', ['get', 'property'], 'pm25'], ['step', ['get', 'value'], '#1E90FF', 8.3, '#48D1CC', 16.7, '#9ACD32', 25, '#DAA520', Infinity, '#000000'], ['in', ['get', 'property'], ['literal', ['no2', 'pm10']]], ['step', ['get', 'value'], '#1E90FF', 13.3, '#48D1CC', 26.6, '#9ACD32', 40, '#DAA520', Infinity, '#000000'], '#000000' ];
    },
    addStationsLayer() { /* Verbatim */
      if (!this.map || !this.map.getSource('stations') || this.map.getLayer('stations')) return; this.map.addLayer({ 'id': 'stations', 'type': 'circle', 'source': 'stations', 'paint': { 'circle-radius': 6, 'circle-color': this.getCircleColor(), 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.8, } });
    },
    async handleStationClick(e) { /* Verbatim */
      if (!this.map) return; const features = this.map.queryRenderedFeatures(e.point, { layers: ['stations'] }); if (!features || features.length === 0) return; if (features.length > 1) { this.createDropdownPopup(features, e); } else { this.createDetailPopup(features[0], e); }
    },
    async createDropdownPopup(features, e) { /* Verbatim ($nextTick, corrected forEach) */
      if (!this.map) return; let dropdownHTML = `<div class="card text-center border-primary"><div class="card-header bg-primary text-white"><h6>Selecteer Station <i class="bi bi-search"></i></h6></div><div class="card-body"><div class="dropdown"><button class="btn btn-outline-primary dropdown-toggle" type="button" id="stationSelect" data-bs-toggle="dropdown" aria-expanded="false">Kies een station</button><div class="dropdown-menu" aria-labelledby="stationSelect" style="height: 200px; overflow-y: auto;">`;
      features.forEach((feature, index) => { const color = this.getColor(feature.properties.value, feature.properties.property, 1); dropdownHTML += `<a class="dropdown-item" href="#" data-value="${index}"><i class="bi bi-geo-alt-fill" style="color: ${color};"></i> ${feature.properties.station_name}</a>`; });
      dropdownHTML += `</div></div></div></div>`; const popup = new window.maplibregl.Popup({className: 'my-popup'}).setLngLat(e.lngLat).setHTML(dropdownHTML).addTo(this.map);
      this.$nextTick(() => { const popupElement = popup.getElement(); if (!popupElement) return; const dropdownItems = Array.from(popupElement.querySelectorAll('.dropdown-item')); dropdownItems.forEach(item => { item.addEventListener('click', (event) => { event.preventDefault(); popup.remove(); this.createDetailPopup(features[event.target.dataset.value], e); }); }); });
    },
    async createDetailPopup(feature, e) { /* Verbatim ($nextTick) */
      if (!this.map || !feature || !feature.properties) return; const {properties} = feature; this.modalProperties = properties;
      const popup = new window.maplibregl.Popup({className: 'my-popup'}).setLngLat(e.lngLat).setHTML(this.getPopupHTML(properties)).addTo(this.map);
      this.$nextTick(() => { const popupElement = popup.getElement(); if (!popupElement) return; const button = popupElement.querySelector('button'); if (!button) return;
        button.addEventListener('click', async () => { button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status">Loading...</span>'; try { await this.loadChart(properties); this.handleShowChartModal(properties); } finally { popup.remove(); } });
      });
    },
    getPopupHTML({station_name, property, value, unit, Gemeente, regio, measured_time}) { /* Verbatim */
      const formattedDate = new Date(measured_time).toLocaleString('nl-NL', { timeZone: 'GMT', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); const color = this.getColor(value, property, 1);
      return ` <div class="card text-center" style="border-color: ${color};"> <div class="card-header" style="background-color: ${color}; color: white;"> <h6>Station naam: ${station_name}</h6> </div> <div class="card-body"> <h6 class="card-title">Component en meetwaarde:<br>${property}: ${value} ${unit}</h6> <h6>Beschrijving:<br>Gemeente ${Gemeente} - Regio ${regio}</h6> <h6 class="card-text"> <small class="text-muted">Laatst update: ${formattedDate}</small> </h6> <button class="btn mt-3" type="button" data-bs-toggle="modal" data-bs-target="#modalWithBothOptions" style="background-color: ${color}; color: white;" data-properties='${JSON.stringify({station_name, property, value, unit, Gemeente, regio, measured_time})}'>        Informatie over station </button> </div> </div>`;
    },
    async loadChart(properties) { /* ADAPTED */
      try { if (!properties || !properties.station_name || !properties.property) throw new Error("Missing properties for loadChart"); const url = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${properties.station_name}&property=${properties.property}&location=${properties.location_uuid}`); const observationData = await this.fetchData(url.toString()); if (!observationData || !observationData.Features) { throw new Error("Invalid observation data fetched"); } this.modalRawObservationData = observationData; } catch (error) { console.error(`An error occurred while loading the chart data: ${error}`); this.modalRawObservationData = null; }
    },
    getColor(value, property, alpha) { /* Verbatim */
      const safeAlpha = (typeof alpha === 'number' && alpha >= 0 && alpha <= 1) ? alpha : 1; const valueColor = property === "pm25" ? [8.3, 16.7, 25, Infinity] : [13.3, 26.6, 40, Infinity]; const colors = [ `rgba(30, 144, 255, ${safeAlpha})`, `rgba(72, 209, 204, ${safeAlpha})`, `rgba(154, 205, 50, ${safeAlpha})`, `rgba(218, 165, 32, ${safeAlpha})` ]; const defaultColor = `rgba(0, 0, 0, ${safeAlpha})`; if (value === null || value === undefined) return defaultColor; const colorIndex = valueColor.findIndex(threshold => value < threshold); return colors[colorIndex] !== undefined ? colors[colorIndex] : colors[colors.length - 1];
    },

    // ==================================================
    // == Event Handlers & Internal Logic              ==
    // ==================================================
    handlePropertyUpdate(newProperty) { if (this.property !== newProperty) { this.property = newProperty; this.updateLayer(); }},
    handleTimeValueUpdate(newTimeValue) { const numVal = Number(newTimeValue); if (this.timeValue !== numVal) { this.timeValue = numVal; this.stopSliderInternal(); this.updateLayer(); }},
    handleSelectedDayUpdate(newDay) { if (this.selectedDay !== newDay) { this.selectedDay = newDay; /* Watcher handles updateLayer */ }},
    handleSearchUpdate(newSearch) { if (this.search !== newSearch) { this.search = newSearch; /* Let selectMatchingStations handle update */ }},
    handleInterpolationStatusUpdate(newStatus) { if (this.interpolationStatus !== newStatus) { this.interpolationStatus = newStatus; this.updateLayer(); }},
    handleTogglePlay() { this.isPlaying = !this.isPlaying; if (this.isPlaying) { this.startSliderInternal(); } else { this.stopSliderInternal(); }},
    handleStopSlider() { this.stopSliderInternal(); },
    handleClearDayInput() { this.selectedDay = ''; this.updateLayer(); },
    handleFilterUpdate(filterInfo) { const { type, id, checked } = filterInfo; if (this[type]) { const itemIndex = this[type].findIndex(item => item.id === id); if (itemIndex !== -1) { this[type][itemIndex].checked = checked; this.updateLayer(); }}},
    handleSelectMatchingStations(searchTerm) { const lower = searchTerm.toLowerCase(); this.station_name.forEach(s => { s.checked = s.label.toLowerCase() === lower; }); this.updateLayer(); },
    handleClearLocalFile() { this.localGeojsonContent = null; this.isLocalFile = false; this.fileName = 'Uploaden | Geojson bestand'; this.updateLayer(); },
    handleFileUploaded(fileObject) { if (fileObject) { const reader = new FileReader(); reader.onload = async (e) => { try { const content = JSON.parse(e.target.result); this.localGeojsonContent = content; this.isLocalFile = true; this.fileName = fileObject.name; await this.updateLayer(); } catch (error) { this.toast("Fout bij lezen GeoJSON."); this.handleClearLocalFile(); } }; reader.onerror = () => { this.toast("Fout bij lezen bestand."); this.handleClearLocalFile(); }; reader.readAsText(fileObject); } else { if (this.isLocalFile) { this.handleClearLocalFile(); } } },
    handleShowChartModal(properties) { this.modalProperties = properties; const modalElement = document.getElementById('modalWithBothOptions'); if (modalElement && window.bootstrap?.Modal) { window.bootstrap.Modal.getOrCreateInstance(modalElement).show(); } },
    handleReloadPage() { window.location.reload(); },
    startSliderInternal() { /* Verbatim logic from original startSlider */ this.interval && clearInterval(this.interval); const today = this.formatDate(new Date()); const maxH = this.selectedDay === today ? new Date().getHours() : 23; this.timeValue = 0; this.updateLayer(); this.interval = setInterval(() => { if (this.timeValue < maxH) { this.timeValue++; this.updateLayer(); } else { this.stopSliderInternal(); this.isPlaying = false; } }, 1550); },
    stopSliderInternal() { /* Verbatim logic from original stopSlider */ clearInterval(this.interval); this.interval = null; },
  },
};
</script>

<style scoped>
/* Retained Verbatim Global/Layout Styles */
*::-webkit-scrollbar { width: 0.5vw; }
*::-webkit-scrollbar-thumb { background: #888; border-radius: 0.5vw; }
*::-webkit-scrollbar-thumb:hover { background: #555; }
* ::selection { font-family: Arial !important; background-color: #d11f3d; color: white; }
.custom-div { position: relative; max-height: 97%; overflow-y: auto; overflow-x: hidden; z-index: 1; }
.focused-label .form-control:focus ~ label { color: #0081ff; }
#map { z-index: 0; }
</style>

<style>
/* Retained Verbatim Global styles needed for Maplibre popups */
.maplibregl-popup-content { /* Keep original global styles */ }
.my-popup .maplibregl-popup-content { padding: 0; max-width: none !important; border-radius: 0.375rem; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important; }
</style>