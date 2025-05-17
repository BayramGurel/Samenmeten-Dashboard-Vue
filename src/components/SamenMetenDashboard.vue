<template>
  <div id="map" class="position-absolute w-100 h-100">
    <InfoSidebar
        :geojson="geojson"
        :formattedProperty="formattedProperty"
        :description="description"
    />
  </div>
  <div class="container-fluid" id="czoom">
    <ControlsPanel
        :dayNames="dayNames"
        :formattedProperty="formattedProperty"
        :legendaValues="legendaValues"
        :colors="colors"
        :concentrationValues="concentrationValues"
        @reloadPage="reloadPage"
        @updateLayer="updateLayer"
    />
    <FilterPanel
        :regio="regios"
        :gemeente="gemeentes"
        :stationName="stName"
        :isLocalFile="isLocalFile"
        :fileName="fileName"
        @updateLayer="updateLayer"
        @idwInterpolation="idw_interpolation"
        @downloadGeoJSON="downloadGeoJSON"
        @downloadCSV="downloadCSV"
        @clearInput="clearInput"
    />
  </div>
  <div class="modal fade content-none" id="modalWithBothOptions" tabindex="-1" aria-labelledby="modalWithBothOptionsLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl" id="czoom2">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title text-center" id="modalWithBothOptionsLabel">Informatie over de station: <span v-text="properties.station_name"></span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="card-body">
            <p class="text-muted">
              Het station bevindt zich in de gemeente {{ properties.Gemeente }}.<br>
              De fijnstofwaarde {{ formattedProperty }} is gemeten op dit station, dat zich in de regio
              {{ properties.regio }} bevindt.<br>
            </p>
            <h6 class="text-center pt-3">Grafische representatie van {{ properties.station_name }}</h6>
            <div class="d-flex justify-content-center overflow-auto">
              <canvas ref="myChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="toast-container position-fixed bottom-0 end-0 p-3 content-none" style="z-index: 9999;">
    <div ref="liveToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-patch-check me-2"></i>
          De bestanden zijn gedownload.
          <small class="d-block mt-1">{{ timeString }}</small>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>
</template>

<script>
import InfoSidebar from './InfoSidebar.vue'
import ControlsPanel from './ControlsPanel.vue'
import FilterPanel from './FilterPanel.vue'
import { data } from '@/data/variable.js'
export default {
  name: 'SamenMetenDashboard',
  components: { InfoSidebar, ControlsPanel, FilterPanel },
  data() {
    return data
  },
  computed: {
    dayNames() {
      return Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return this.formatDate(date)
      })
    },
    buttonClass() {
      return this.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary'
    },
    formattedProperty() {
      const propertyMap = {
        pm25: 'PM2,5',
        pm10: 'PM10',
        no2: 'NO2'
      }
      return propertyMap[this.property] || this.property
    }
  },
  watch: {
    selectedDay(newVal) {
      if (this.dayNames.includes(newVal)) {
        this.updateLayer()
      }
    }
  },
  created() {
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`
    this.checkHourChange()
  },
  async mounted() {
    document.getElementById('czoom').style.zoom = '87%'
    document.getElementById('czoom2').style.zoom = '113%'
    document.getElementById('sidebar').style.zoom = '87%'
    this.initializeMap()
    this.addControls()
    this.elements = this.ids.reduce((acc, id) => {
      acc[id] = this.$refs[id]
      return acc
    }, {})
    this.geojson = await this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
        [this.regios, this.gemeentes, this.stName] = await Promise.all([
      this.getUniqueItems(this.geojson, 'regio'),
      this.getUniqueItems(this.geojson, 'Gemeente'),
      this.getUniqueItems(this.geojson, 'station_name')
    ])
    this.createCheckboxes('regio', this.regios)
    this.createCheckboxes('Gemeente', this.gemeentes)
    this.createCheckboxes('station_name', this.stName)
    this.selectedDay = this.dayNames[0]
    this.updateLayer()
  },
  methods: {
    async initializeMap() {
      this.map = new window.maplibregl.Map({ container: 'map', style: this.STYLE_URL, center: [4.218788, 52.008663], zoom: 8.9 })
      this.map.on('load', () => {
        this.addLineSourceAndLayer()
      })
    },
    async addControls() {
      this.addStyleSwitchControl()
      this.map.addControl(new window.maplibregl.FullscreenControl())
      this.map.addControl(new window.maplibregl.NavigationControl())
      this.map.addControl(new window.maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }))
    },
    reloadPage() {
      window.location.reload()
    },
    clearInput(refName) {
      this.$refs[refName].value = ''
      if (refName === 'sDate') {
        this.selectedDay = ''
      } else {
        this.updateLayer()
      }
    },
    async checkHourChange() {
      setInterval(async () => {
        this.updateLayer()
      }, 1200000)
    },
    formatDate(date) {
      const dayName = this.days[date.getDay()]
      const dateString = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
      return `${dayName} | ${dateString}`
    },
    async updateLayer() {
      const prop = this.propValues[this.elements.property.value] || this.propValues.default
      this.property = prop.property
      this.description = prop.description
      this.legendaValues = prop.legendaValues
      this.concentrationValues = prop.concentrationValues
      const selectedRegio = await this.getSelectedValues('regio')
      const selectedGemeente = await this.getSelectedValues('Gemeente')
      const selectedStName = await this.getSelectedValues('station_name')
      this.reloadLayer(this.map, this.elements.timeSlider.value, selectedRegio, selectedGemeente, selectedStName)
    },
    async reloadLayer(map, hour, selectedRegio, selectedGemeente, selectedStName) {
      try {
        const { files: localFiles = [] } = this.$refs.localFile || {}
        this.isLocalFile = localFiles.length > 0
        this.fileName = this.isLocalFile ? localFiles[0].name : 'Geojson bestand | Uploaden'
        this.isFrom = this.isLocalFile
            ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold">van jouw Local File</span>'
            : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success">onze metadata.</a>'
        const selectedDateIndex = this.dayNames.indexOf(this.elements.sDate.value)
        await this.filterGeojsonFeatures(hour, selectedDateIndex, this.elements.property.value, selectedRegio, selectedGemeente, selectedStName, this.isLocalFile)
        this.updateMapSourceAndLayer(map, this.geojson)
      } catch (error) {
        console.error(error);
      }
    },
    async filterGeojsonFeatures(hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile) {
      const now = new Date()
      now.setDate(now.getDate() - selectedDateIndex)
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour) + now.getTimezoneOffset() / 60))
      const measured_time = date.toISOString().replace('T', '%20').substring(0, 19) + '00'
      if (this.interpolationStatus === 'activate') {
        this.idw_interpolation(date.toISOString())
      } else if (this.currentLayerId && this.map.getLayer(this.currentLayerId)) {
        this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0)
      }
      const filters = {
        property: selectedProperty,
        station: selectedStName.length > 0 ? selectedStName : [],
        gemeente: selectedStName.length > 0 ? [] : selectedGemeente,
        regio: selectedStName.length > 0 || selectedGemeente.length > 0 ? [] : selectedRegio
      }
      let filteredGeojson
      if (isLocalFile) {
        filteredGeojson = await this.loadLocalFile()
      } else {
        let url1 = new URL('https://dta-samenmeten-api.azurewebsites.net/api/data/stations')
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.length > 0) url1.searchParams.append(key, value)
        })
        let url2 = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selectedProperty}&measured_time=${measured_time}`)
        let [stations, observations] = await Promise.all([this.fetchData(url1.toString()), this.fetchData(url2.toString())])
        let observationMap = new Map()
        observations.Features.forEach(o => { observationMap.set(o.properties.station_name, o) })
        filteredGeojson = {
          type: 'FeatureCollection',
          Features: stations.Features.filter(s => {
            let obs = observationMap.get(s.properties.station_name)
            if (obs) {
              obs.properties.avg_value = s.properties.avg_value
              obs.properties.max_value = s.properties.max_value
              obs.properties.min_value = s.properties.min_value
              s.properties = { ...obs.properties }
              s.geometry = obs.geometry
              return true
            }
            return false
          })
        }
      }
      this.geojson = filteredGeojson;
          [this.regios, this.gemeentes, this.stName] = await Promise.all([
        this.getUniqueItems(this.geojson, 'regio'),
        this.getUniqueItems(this.geojson, 'Gemeente'),
        this.getUniqueItems(this.geojson, 'station_name')
      ])
      this.createCheckboxes('regio', this.regios)
      this.createCheckboxes('Gemeente', this.gemeentes)
      this.createCheckboxes('station_name', this.stName)
    },
    async idw_interpolation(date) {
      let bounds = [3.773675345120739, 51.64377788724585, 5.031415001585676, 52.3325109475691]
      let layerId = 'interpolatie-' + date + '-' + this.elements.property.value
      this.rasterLayers.add(layerId)
      this.rasterLayers.forEach(id => { if (this.map.getLayer(id)) this.map.setPaintProperty(id, 'raster-opacity', id === layerId ? 1 : 0) })
      this.currentLayerId = layerId
      if (!this.map.getLayer(layerId)) {
        let url = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?...&time=${date}`
        this.map.addSource(layerId, { type: 'image', url, coordinates: [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]] })
        this.map.addLayer({ id: layerId, type: 'raster', source: layerId, paint: { 'raster-opacity': 1 } })
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
      const toastLiveExample = this.$refs.liveToast;
      const toastBootstrap = window.bootstrap.Toast.getOrCreateInstance(toastLiveExample);
      // Update the time in the toast
      const now = new Date();
      this.timeString = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
      toastBootstrap.show();
    },
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
        const url = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${properties.station_name}&property=${properties.property}&location=${properties.location_uuid}`);
        console.log(url)
        console.log(properties)
        const observationData = await this.fetchData(url.toString());
        const dataByDate = this.processData(observationData);
        const datasets = this.createDatasets(properties.property, dataByDate);
        this.$nextTick(() => {
          if (this.myChart instanceof window.Chart) {
            if (this.$refs.myChart) {
              this.myChart.destroy();
            }
          }
          if (this.$refs.myChart) {
            this.myChart = this.createChart(this.$refs.myChart, properties.property, dataByDate, datasets);
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
    },
  }
}
</script>

<style scoped>
.input-group input[type="file"] {
  display: none;
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
* ::selection {
  font-family: Arial !important;
  background-color: #d11f3d;
  color: white;
}
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
</style>
