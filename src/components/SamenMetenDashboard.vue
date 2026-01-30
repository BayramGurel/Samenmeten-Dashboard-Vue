<template>
  <MapSidebarInfo :geojson="geojson" :formatted-property="formattedProperty" :description="description" />
  <!--  Above the map  -->
  <div class="container-fluid" id="czoom">
    <div class="position-absolute start-0 shadow mt-3 ms-3 col-md-4 col-8 custom-div">
      <DashboardLegendTabs
        ref="legendTabs"
        v-model:timeValue="timeValue"
        v-model:selectedDay="selectedDay"
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

      <DashboardDataTools
        ref="dataTools"
        :regio="regio"
        :gemeente="Gemeente"
        :station-name="station_name"
        :search="search"
        :interpolation-status="interpolationStatus"
        :is-local-file="isLocalFile"
        :file-name="fileName"
        @update-layer="updateLayer"
        @select-matching-stations="selectMatchingStations"
        @update:search="search = $event"
        @update:interpolationStatus="interpolationStatus = $event"
        @clear-input="clearInput"
        @download-geojson="downloadGeoJSON"
        @download-csv="downloadCSV"
      />
    </div>
    <DashboardStationModal ref="stationModal" :formatted-property="formattedProperty" :properties="properties" />
    <DashboardToast ref="toastPanel" :time-string="timeString" />
  </div>
</template>

<script>
// npm run build
// npm install gh-pages --save-dev
// npm run deploy

// Created by Bayram Gurel
import { data } from '@/data/variable.js';
import MapSidebarInfo from '@/components/samen-meten/MapSidebarInfo.vue';
import DashboardLegendTabs from '@/components/samen-meten/DashboardLegendTabs.vue';
import DashboardDataTools from '@/components/samen-meten/DashboardDataTools.vue';
import DashboardStationModal from '@/components/samen-meten/DashboardStationModal.vue';
import DashboardToast from '@/components/samen-meten/DashboardToast.vue';

export default {
  name: 'SamenMetenDashboard',
  components: {
    MapSidebarInfo,
    DashboardLegendTabs,
    DashboardDataTools,
    DashboardStationModal,
    DashboardToast,
  },
  data() {
    return data;
  },

  computed: {
    dayNames() {
      return Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return this.formatDate(date);
      });
    },
    buttonClass() {
      return this.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary';
    },
    formattedProperty() {
      const propertyMap = {
        'pm25': 'PM2,5',
        'pm10': 'PM10',
        'no2': 'NO2'
      };

      return propertyMap[this.property] || this.property;
    }
  },

  watch: {
    selectedDay(newVal) {
      if (this.dayNames.includes(newVal)) {
        this.updateLayer();
      }
    },
  },

  created() {
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`;
    this.checkHourChange();
  },

  async mounted() {
    document.getElementById('czoom').style.zoom = "87%";
    document.getElementById('czoom2').style.zoom = "113%";
    document.getElementById('sidebar').style.zoom = "87%";


    this.initializeMap();
    this.addControls();
    this.elements = this.ids.reduce((acc, id) => {
      acc[id] = this.getElementRef(id);
      return acc;
    }, {});

    this.geojson = await this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');

    [this.regios, this.gemeentes, this.stName] = await Promise.all([
      this.getUniqueItems(this.geojson, 'regio'),
      this.getUniqueItems(this.geojson, 'Gemeente'),
      this.getUniqueItems(this.geojson, 'station_name')
    ]);

    this.createCheckboxes('regio', this.regios);
    this.createCheckboxes('Gemeente', this.gemeentes);
    this.createCheckboxes('station_name', this.stName);
    this.selectedDay = this.dayNames[0];
    this.updateLayer();
  },
  beforeUnmount() {
    this._destroyChart();
  },
  methods: {
    getElementRef(id) {
      const directRef = this.$refs[id];
      if (directRef) {
        return directRef;
      }
      const refContainers = [this.$refs.legendTabs, this.$refs.dataTools];
      for (const container of refContainers) {
        if (container?.$refs?.[id]) {
          return container.$refs[id];
        }
      }
      return undefined;
    },
    getChartRef() {
      return this.$refs.stationModal?.$refs?.myChart || this.$refs.myChart;
    },
    getToastRef() {
      return this.$refs.toastPanel?.$refs?.liveToast || this.$refs.liveToast;
    },
    async initializeMap() {
      this.map = new window.maplibregl.Map({
        container: 'map',
        style: this.STYLE_URL,
        center: [4.218788, 52.008663],
        zoom: 8.9,
      });

      this.map.on('load', () => {
        this.addLineSourceAndLayer();
        this.addWindLayer();
      });
    },

    async addLineSourceAndLayer() {
      if (!this.map.getSource('line')) {
        this.map.addSource('line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: this.bbox
            }
          }
        });
      }
      if (!this.map.getLayer('line')) {
        this.map.addLayer({
          id: 'line',
          type: 'line',
          source: 'line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ff0000',
            'line-width': 1.4,
            'line-opacity': 0.8,
            'line-blur': 0.5
          }
        });
      }
    },

    _destroyChart() {
      if (this.myChart) {
        this.myChart.destroy();
        this.myChart = null;
        console.log('chart destroyed');
      }
    },

    async addControls() {
      this.addStyleSwitchControl();
      this.map.addControl(new window.maplibregl.FullscreenControl());
      this.map.addControl(new window.maplibregl.NavigationControl());
      this.map.addControl(new window.maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }));
    },

    addStyleSwitchControl() {
      const styleSwitcher = this.createStyleSwitcher();
      const styleSwitchControl = this.createStyleSwitchControl(styleSwitcher);

      this.map.addControl(styleSwitchControl);
    },

    createStyleSwitcher() {
      const styleSwitcherContainer = document.createElement('div');
      styleSwitcherContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group';

      const label = document.createElement('label');
      label.className = 'fw-semibold text-success';
      label.innerText = 'Selecteer achtergrond:';
      styleSwitcherContainer.appendChild(label);

      const styleSwitcher = document.createElement('select');
      styleSwitcher.className = 'form-select form-select-sm'; // Bootstrap's form control class
      styleSwitcher.style.fontSize = '1.2em';
      styleSwitcher.style.cursor = 'pointer';

      const styles = this.STYLE_URLS.map(url => `${url}${this.API_KEY}`);

      styles.forEach((style, index) => {
        const option = document.createElement('option');
        option.value = style;
        option.text = this.STYLE_NAMES[index] || `Style ${index + 1}`;
        styleSwitcher.appendChild(option);
      });

      styleSwitcher.onchange = async (event) => {
        try {
          this.map.setStyle(event.target.value);
          setTimeout(() => {
            this.updateLayer();
            this.addLineSourceAndLayer();
          }, 50);
        } catch (error) {
          console.error('An error occurred while switching styles:', error);
        }
      };

      styleSwitcherContainer.appendChild(styleSwitcher);

      return styleSwitcherContainer;
    },

    createStyleSwitchControl(styleSwitcher) {
      return {
        onAdd: () => {
          return styleSwitcher;
        },
        onRemove: function () {
        },
        getDefaultPosition: function () {
          return 'top-right';
        },
      };
    },


    async reloadPage() {
      window.location.reload();
    },
    clearInput(refName) {
      this.$refs[refName].value = '';
      if (refName === 'sDate') {
        this.selectedDay = '';
      } else {
        this.updateLayer()
      }
    },

    async checkHourChange() {
      setInterval(async () => {
        this.updateLayer();
      }, 1000 * 60 * 20);
    },

    formatDate(date) {
      const dayName = this.days[date.getDay()];
      const dateString = date.toLocaleDateString('nl-NL', {day: 'numeric', month: 'long', year: 'numeric'});
      return `${dayName} | ${dateString}`;
    },

    async toggleSlider() {
      this.isPlaying = !this.isPlaying;
      this.isPlaying ? this.startSlider() : this.stopSlider();
    },
    async startSlider() {
      this.interval && clearInterval(this.interval);
      const today = this.formatDate(new Date());
      const maxHour = this.selectedDay === today ? new Date().getHours() : 23;
      this.timeValue = 0;
      this.updateLayer();
      this.interval = setInterval(() => {
        if (this.timeValue < maxHour) {
          this.timeValue++;
          this.updateLayer();
        } else {
          this.stopSlider();
          this.isPlaying = false;
        }
      }, 1550);
    },
    stopSlider() {
      clearInterval(this.interval);
      this.interval = null;
    },

    async selectMatchingStations() {
      const lowerCaseSearch = this.search.toLowerCase();
      this.station_name.forEach(station => {
        station.checked = station.label.toLowerCase() === lowerCaseSearch;
      });
      this.updateLayer();
    },

    async fetchData(url) {
      let response = await fetch(url, {method: "GET", credentials: "include", keepalive: true});

      return await response.json();
    },

    async loadLocalFile() {
      try {
        let geojson = JSON.parse(await this.elements.localFile.files[0].text());
        geojson.Features = geojson.features;
        delete geojson.features;
        return geojson;
      } catch (error) {
        console.error('Error reading local file:', error);
        throw error;
      }
    },


    async getUniqueItems(geojson, uniqueColumn) {
      return [...new Set(geojson.Features.map(Feature => Feature.properties?.[uniqueColumn]))];
    },

    async createCheckboxes(id, items) {
      const selectedItems = this[id] ? this[id].filter(i => i.checked).map(i => i.id) : [];
      this[id] = items.sort().map(item => ({
        id: item,
        label: item,
        checked: selectedItems.includes(item)
      }));
    },

    async getSelectedValues(name) {
      return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(input => input.value);
    },

    // Created by Bayram Gurel
    async updateLayer() {
      const prop = this.propValues[this.elements.property.value] || this.propValues.default;
      this.property = prop.property;
      this.description = prop.description;
      this.legendaValues = prop.legendaValues;
      this.concentrationValues = prop.concentrationValues;

      const selectedRegio = await this.getSelectedValues('regio');
      const selectedGemeente = await this.getSelectedValues('Gemeente');
      const selectedStName = await this.getSelectedValues('station_name');
      this.reloadLayer(this.map, this.elements.timeSlider.value, selectedRegio, selectedGemeente, selectedStName).catch(error => console.error('Error reloading layer:', error));
    },

    async reloadLayer(map, hour, selectedRegio, selectedGemeente, selectedStName) {
      try {
        const {files: localFiles = []} = this.elements.localFile || {};
        this.isLocalFile = localFiles.length > 0;
        this.fileName = this.isLocalFile ? localFiles[0].name : 'Geojson bestand | Uploaden'; // Update the label text
        this.isFrom = this.isLocalFile ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold"">van jouw Local File</span>' : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata. Bekijk de metadata voor details over de serverdata.</a>';
        // console.time('myTimer');
        const selectedDateIndex = this.dayNames.indexOf(this.elements.sDate.value);
        await this.filterGeojsonFeatures(hour, selectedDateIndex, this.elements.property.value, selectedRegio, selectedGemeente, selectedStName, this.isLocalFile); // console.timeEnd('myTimer');
        this.updateMapSourceAndLayer(map, this.geojson);
      } catch (error) {
        console.error(error);
      }
    },

    async filterGeojsonFeatures(hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile) {
      const now = new Date();
      now.setDate(now.getDate() - selectedDateIndex);

      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour) + now.getTimezoneOffset() / 60));
      const measured_time = date.toISOString().replace('T', '%20').substring(0, 19) + '00';

      if (this.interpolationStatus === 'activate') {
        this.idw_interpolation(date.toISOString());
      } else if (this.currentLayerId && this.map.getLayer(this.currentLayerId)) {
        this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0);
      }

      const filters = {
        'property': selectedProperty,
        'station': selectedStName.length > 0 ? selectedStName : [],
        'gemeente': selectedStName.length > 0 ? [] : (selectedGemeente.length > 0 ? selectedGemeente : []),
        'regio': selectedStName.length > 0 || selectedGemeente.length > 0 ? [] : (selectedRegio.length > 0 ? selectedRegio : [])
      };

      let filteredGeojson;
      if (isLocalFile) {
        filteredGeojson = await this.loadLocalFile(isLocalFile);
      } else {
        let url1 = new URL('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.length > 0) url1.searchParams.append(key, value);
        });

        let url2 = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selectedProperty}&measured_time=${measured_time}`);

        // Fetch data in parallel
        let [stations, observations] = await Promise.all([this.fetchData(url1.toString()), this.fetchData(url2.toString())]);

        let observationMap = new Map();
        observations.Features.forEach(observation => {
          observationMap.set(observation.properties.station_name, observation);
        });

        filteredGeojson = {
          type: 'FeatureCollection',
          Features: stations.Features.filter(station => {
            let matchingObservation = observationMap.get(station.properties.station_name);
            if (matchingObservation) {
              matchingObservation.properties.avg_value = station.properties.avg_value;
              matchingObservation.properties.max_value = station.properties.max_value;
              matchingObservation.properties.min_value = station.properties.min_value;
              station.properties = {...matchingObservation.properties};
              station.geometry = matchingObservation.geometry;
              return true;
            }
            return false;
          })
        };
      }
      this.geojson = filteredGeojson;

      [this.regios, this.gemeentes, this.stName] = await Promise.all([this.getUniqueItems(this.geojson, 'regio'), this.getUniqueItems(this.geojson, 'Gemeente'), this.getUniqueItems(this.geojson, 'station_name')]);

      this.createCheckboxes('regio', this.regios);
      this.createCheckboxes('Gemeente', this.gemeentes);
      this.createCheckboxes('station_name', this.stName);
    },

    // Created by Bayram Gurel
    async idw_interpolation(date) {
      let bounds = [3.773675345120739, 51.64377788724585, 5.031415001585676, 52.3325109475691];
      let layerId = 'interpolatie-' + date + '-' + this.elements.property.value;

      // Add the layerId to the rasterLayers set if it's not already there
      this.rasterLayers.add(layerId);

      // Set the opacity of all layers to 0, except for the current one
      this.rasterLayers.forEach(id => {
        if (this.map.getLayer(id)) {
          this.map.setPaintProperty(id, 'raster-opacity', id === layerId ? 1 : 0);
        }
      });

      this.currentLayerId = layerId;

      if (!this.map.getLayer(layerId)) {
        let url = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${this.elements.property.value}_sqldb&bbox=${bounds.join(',')}&time=${date}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`;
        console.log(url)
        this.map.addSource(layerId, {
          'type': 'image',
          'url': url,
          'coordinates': [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]]
        });
        this.map.addLayer({'id': layerId, 'type': 'raster', 'source': layerId, 'paint': {'raster-opacity': 1}});
      }
    },

    async downloadGeoJSON() {
      let dataStr = JSON.stringify(this.geojson);
      let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      let link = document.createElement('a');
      link.href = dataUri;
      link.download = `PZH-Luchtkwaliteit_${this.property}.geojson`;
      this.toast();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    async downloadCSV() {
      const CSV_HEADER = 'Station naam;Datum en tijd;Property;Regio;Gemeente;Value;Unit\n';
      const DEFAULT_VALUE = 'N/A';
      let csv = CSV_HEADER;

      this.geojson.features.forEach(feature => {
        let properties = feature.properties;
        let station_name = properties?.station_name || DEFAULT_VALUE;
        let measured_time = properties?.measured_time ? new Date(properties.measured_time).toISOString() : DEFAULT_VALUE; // Change here
        let property = properties?.property || DEFAULT_VALUE;
        let regio = properties?.regio || DEFAULT_VALUE;
        let gemeente = properties?.Gemeente || DEFAULT_VALUE;
        let value = properties?.value !== undefined ? `${properties.value.toFixed(2)}` : DEFAULT_VALUE;
        let unit = properties?.unit || DEFAULT_VALUE;

        csv += `${station_name}; ${measured_time}; ${property}; ${regio}; ${gemeente}; ${value}; ${unit}\n`; // Added newline character here
      });

      let link = document.createElement('a');
      link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      link.download = 'Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.csv';
      this.toast();

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    async toast() {
      // Show the toast
      const toastLiveExample = this.getToastRef();
      const toastBootstrap = window.bootstrap.Toast.getOrCreateInstance(toastLiveExample);
      // Update the time in the toast
      const now = new Date();
      this.timeString = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
      toastBootstrap.show();
    },
    //
    // async downloadPDF(geojson) {
    //   let doc = new window.jsPDF();
    //   let canvas = document.createElement('canvas');
    //   canvas.width = 200;
    //   canvas.height = 100;
    //   let ctx = canvas.getContext('2d');
    //
    //   let labels = geojson.features.map(feature => feature.properties?.station_name || 'N/A');
    //   let data = geojson.features.map(feature => feature.properties?.value || 0);
    //
    //   let chart = new window.Chart(ctx, {
    //     type: 'bar',
    //     data: {
    //       labels: labels,
    //       datasets: [{
    //         label: 'Value',
    //         data: data,
    //         backgroundColor: 'rgba(75, 192, 192, 0.2)',
    //         borderColor: 'rgba(75, 192, 192, 1)',
    //         borderWidth: 1
    //       }]
    //     },
    //     options: {
    //       animation: {
    //         onComplete: function() {
    //           canvas.toBlob(function(blob) {
    //             if (blob) {
    //               let img = new Image();
    //               img.onload = function() {
    //                 doc.addImage(img, 'PNG', 10, 10, 180, 90);
    //                 doc.save('Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.pdf');
    //               };
    //               img.src = URL.createObjectURL(blob);
    //             } else {
    //               console.log('Blob does not exist');
    //             }
    //           });
    //         }
    //       },
    //       scales: {
    //         y: {
    //           beginAtZero: true
    //         }
    //       }
    //     }
    //   });
    // },


    updateMapSourceAndLayer(map, geojson) {
      if (!geojson || !geojson.Features) return;
      geojson.features = geojson.Features;
      delete geojson.Features;
      if (!map.getSource('stations')) {
        map.addSource("stations", {type: 'geojson', data: geojson});
      } else {
        map.getSource('stations').setData(geojson);
      }
      if (!map.getLayer('stations')) {
        this.addStationsLayer();
      }
    },

    getCircleColor() {
      return [
        'case',
        ['==', ['get', 'property'], 'pm25'],
        ['step', ['get', 'value'], '#1E90FF', 8.3, '#48D1CC', 16.7, '#9ACD32', 25, '#DAA520', Infinity, '#000000'],
        ['in', ['get', 'property'], ['literal', ['no2', 'pm10']]],
        ['step', ['get', 'value'], '#1E90FF', 13.3, '#48D1CC', 26.6, '#9ACD32', 40, '#DAA520', Infinity, '#000000'],
        '#000000' // default output for 'case'
      ];
    },

    addStationsLayer() {
      this.map.addLayer({
        'id': 'stations',
        'type': 'circle',
        'source': 'stations',
        'paint': {
          'circle-radius': 6,
          'circle-color': this.getCircleColor(),
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.8,
        }
      });
      this.map.on('click', 'stations', this.handleStationClick);
    },

    async handleStationClick(e) {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['stations'] });

      if (features.length > 1) {
        this.createDropdownPopup(features, e);
      } else {
        this.createDetailPopup(e.features[0], e);
      }
    },

    // Created by Bayram Gurel
    async createDropdownPopup(features, e) {
      let dropdownHTML = `
    <div class="card text-center border-primary">
      <div class="card-header bg-primary text-white">
        <h6>Selecteer Station <i class="bi bi-search"></i></h6>
      </div>
      <div class="card-body">
        <div class="dropdown">
          <button class="btn btn-outline-primary dropdown-toggle" type="button" id="stationSelect" data-bs-toggle="dropdown" aria-expanded="false">
            Kies een station
          </button>
          <div class="dropdown-menu" aria-labelledby="stationSelect" style="height: 200px; overflow-y: auto;">
            `;
      features.forEach((feature, index) => {
        const color = this.getColor(feature.properties.value, feature.properties.property, 1);
        dropdownHTML += `
              <a class="dropdown-item" href="#" data-value="${index}">
                <i class="bi bi-geo-alt-fill" style="color: ${color};"></i> ${feature.properties.station_name}
              </a>`;
      });
      dropdownHTML += `
          </div>
        </div>
      </div>
    </div>
  `;

      const popup = new window.maplibregl.Popup({className: 'my-popup'})
          .setLngLat(e.lngLat)
          .setHTML(dropdownHTML)
          .addTo(this.map);

      this.$nextTick(() => {
        const dropdownItems = Array.from(popup.getElement().querySelectorAll('.dropdown-item'));
        dropdownItems.forEach(item => {
          item.addEventListener('click', (event) => {
            event.preventDefault();
            popup.remove();
            this.createDetailPopup(features[event.target.dataset.value], e);
          });
        });
      });
    },

    async createDetailPopup(feature, e) {
      const {properties} = feature;
      this.properties = properties
      const popup = new window.maplibregl.Popup({className: 'my-popup'})
          .setLngLat(e.lngLat)
          .setHTML(this.getPopupHTML(properties))
          .addTo(this.map);

      this.$nextTick(() => {
        const button = popup.getElement().querySelector('button');
        button.addEventListener('click', async () => {
          button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status">Loading...</span>';
          try {
            await this.loadChart(properties);
          } finally {
            button.innerHTML = 'Informatie over station';
            popup.remove();
          }
        });
      });
    },


    getPopupHTML({station_name, property, value, unit, Gemeente, regio, measured_time}) {
      const formattedDate = new Date(measured_time).toLocaleString('nl-NL', {
        timeZone: 'GMT',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const color = this.getColor(value, property, 1);
      return `
  <div class="card text-center" style="border-color: ${color};">
    <div class="card-header" style="background-color: ${color}; color: white;">
      <h6>Station naam: ${station_name}</h6>
    </div>
    <div class="card-body">
      <h6 class="card-title">Component en meetwaarde:<br>${property}: ${value} ${unit}</h6>
      <h6>Beschrijving:<br>Gemeente ${Gemeente} - Regio ${regio}</h6>
      <h6 class="card-text">
        <small class="text-muted">Laatst update: ${formattedDate}</small>
      </h6>
<button class="btn mt-3" type="button" data-bs-toggle="modal" data-bs-target="#modalWithBothOptions" style="background-color: ${color}; color: white;" data-properties='${JSON.stringify({station_name, property, value, unit, Gemeente, regio, measured_time})}'>        Informatie over station
      </button>
    </div>
  </div>`;
    },

    async loadChart(properties) {
      try {
        this._destroyChart();

        const url = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${properties.station_name}&property=${properties.property}&location=${properties.location_uuid}`);
        console.log(url)
        console.log(properties)
        const observationData = await this.fetchData(url.toString());
        const dataByDate = this.processData(observationData);
        const datasets = this.createDatasets(properties.property, dataByDate);
      this.$nextTick(() => {
        const chartRef = this.getChartRef();
        if (chartRef) {
          this.myChart = this.createChart(chartRef, properties.property, dataByDate, datasets);
        }
      });
      } catch (error) {
        console.error(`An error occurred while loading the chart: ${error}`);
      }
    },

    processData(observationData) {
      return observationData.Features.reduce((dataByDate, feature) => {
        let date = new Date(feature.properties.measured_time);
        let dateString = date.toISOString().split('T')[0];
        let hourIndex = date.getUTCHours();
        if (!dataByDate[dateString]) {
          dataByDate[dateString] = {
            times: Array.from({length: 24}, (_, i) => i < 10 ? `0${i}:00 GMT` : `${i}:00 GMT`),
            values: Array(24).fill(null)
          };
        }
        dataByDate[dateString].values[hourIndex] = feature.properties.value;
        return dataByDate;
      }, {});
    },

    // Created by Bayram Gurel
    createDatasets(property, dataByDate) {
      const datasets = Object.entries(dataByDate).map(([date, data]) => {
        const values = data.values;
        const backgroundColors = values.map(value => this.getColor(value, property, '0.4'));
        const dateObj = new Date(date);
        const borderColor = this.dayColors[dateObj.getDay()];

        return {
          label: dateObj.toLocaleDateString('nl-NL', {
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }),
          dateString: date,
          data: values,
          originalBackgroundColor: [...backgroundColors],
          backgroundColor: backgroundColors,
          borderColor: borderColor,
          borderWidth: 2,
          borderRadius: { topLeft: 3, topRight: 3 },
          hidden: true
        };
      });
      datasets.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
      if (datasets.length > 0) {
        datasets[datasets.length - 1].hidden = false;
      }
      return datasets;
    },

    createChart(propertyChart, property, dataByDate, datasets) {
      const yMin = property === "pm25" ? 25 : 40;
      this.myChart = new window.Chart(propertyChart, {
        type: 'bar',
        data: {
          labels: dataByDate[Object.keys(dataByDate)[0]].times,
          datasets: datasets
        },
        options: {
          ...this.chartOptions,
          plugins: {
            ...this.chartOptions.plugins,
            annotation: {
              annotations: [
                {
                  type: 'box',
                  yMin: yMin,
                  backgroundColor: 'rgba(230, 25, 75, 0.1)',
                  borderColor: 'rgba(230, 25, 75, 1)',
                  label: {
                    content: 'Bad',
                    enabled: true,
                    position: 'center',
                  }
                },
              ]
            },
            legend: {
              display: true,
              onHover: (evt, item, legend) => this.handleHover(evt, item, legend),
              onLeave: (evt, item, legend) => this.handleLeave(evt, item, legend)
            }
          },
        }
      });
      return this.myChart;
    },


    async handleHover(evt, item, legend) {
      legend.chart.data.datasets.forEach((dataset, datasetIndex) => {
        dataset.backgroundColor = datasetIndex === item.datasetIndex ?
            dataset.originalBackgroundColor.map(color => {
              let rgba = color.slice(0, -1).split(",");
              rgba[3] = '0.8)';
              return rgba.join(",");
            }) :
            dataset.originalBackgroundColor.map(color => {
              let rgba = color.slice(0, -1).split(",");
              rgba[3] = '0.1)';
              return rgba.join(",");
            });
      });
      legend.chart.update();
    },

    async handleLeave(evt, item, legend) {
      legend.chart.data.datasets.forEach(dataset => {
        dataset.backgroundColor = dataset.originalBackgroundColor;
      });
      legend.chart.update();
    },

    getColor(value, property, alpha) {
      const valueColor = property === "pm25" ? [8.3, 16.7, 25, Infinity] : [13.3, 26.6, 40, Infinity];
      const colors = ['rgba(30, 144, 255,', 'rgba(72, 209, 204,', 'rgba(154, 205, 50,', 'rgba(218, 165, 32,'];

      const colorIndex = valueColor.findIndex(threshold => value < threshold);
      const color = colors[colorIndex] !== undefined ? colors[colorIndex] : colors[colors.length - 1];

      return `${color}${alpha})`;
    }
  },
};
// Created by Bayram Gurel
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
/* Custom File Input Styles */
.input-group input[type="file"] {
  display: none; /* Hide the default file input */
}

.input-group .custom-file-upload {
  color: #fff;
  background-color: #20c997;
}

.custom-div {
  position: relative;
  max-height: 97%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
}

/* Style the scrollbar */
*::-webkit-scrollbar {
  width: 0.5vw; /* Decrease scrollbar width */
}

/* Handle */
*::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 0.5vw; /* Make it round */
}

/* Handle on hover */
*::-webkit-scrollbar-thumb:hover {
  background: #555; /* Change color on hover */
}

* ::selection {
  font-family: Arial !important;
  background-color: #d11f3d;
  color: white;
}
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
/* Created by Bayram Gurel */
</style>
