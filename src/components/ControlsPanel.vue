<template>
  <div class="controls-container bg-white rounded shadow-sm">
    <div class="p-3 border-bottom">
      <img
          :src="logoPath"
          class="img-fluid rounded d-block mx-auto mb-2"
          title="Refresh website"
          @click="$emit('reload-page')"
          style="max-width: 60%; cursor: pointer;"
      >
      <h4 class="text-center text-primary-emphasis m-0">Dashboard Luchtkwaliteitsmetingen</h4>
    </div>

    <ul class="nav nav-tabs nav-fill p-2" id="mainControlsTab" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active fw-semibold" id="tab-legenda-filters" data-bs-toggle="tab" data-bs-target="#legenda-filters-content" type="button" role="tab" aria-controls="legenda-filters-content" aria-selected="true">Legenda & Filters</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link fw-semibold" id="tab-files-analysis" data-bs-toggle="tab" data-bs-target="#files-analysis-content" type="button" role="tab" aria-controls="files-analysis-content" aria-selected="false">Bestanden & Analyse</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link fw-semibold" id="tab-contact" data-bs-toggle="tab" data-bs-target="#contact-content" type="button" role="tab" aria-controls="contact-content" aria-selected="false">Contact</button>
      </li>
    </ul>

    <div class="tab-content p-3" id="mainControlsTabContent" style="max-height: calc(100vh - 250px); overflow-y: auto;">
      <div class="tab-pane fade show active" id="legenda-filters-content" role="tabpanel" aria-labelledby="tab-legenda-filters">
        <div class="form-floating mb-3">
          <select
              class="form-select form-select-md text-primary fw-semibold text-center shadow-sm"
              id="selectProperty"
              :value="property"
              @input="$emit('update:property', $event.target.value)"
          >
            <option class="fw-semibold" value="no2">Stikstofdioxide | NO2</option>
            <option class="fw-semibold" value="pm10">Fijnstof 10µm | PM10</option>
            <option class="fw-semibold" value="pm25">Fijnstof 2.5µm | PM2,5</option>
          </select>
          <label for="selectProperty">Selecteer type sensordata</label>
        </div>

        <div class="mb-3">
          <label :for="'timeSliderControls'" class="form-label">Geselecteerd uur: {{ timeValue }}:00</label>
          <input
              :id="'timeSliderControls'"
              class="form-range w-100"
              type="range" min="0" max="23" step="1"
              :value="timeValue"
              @change="$emit('update:timeValue', parseInt($event.target.value))"
              @mousedown="$emit('stop-slider')"
              :title="'Geselecteerd uur: ' + timeValue + ':00'"
          >
        </div>

        <div class="row mb-3">
          <div class="col-md-7">
            <div class="form-floating focused-label">
              <input
                  type="search"
                  list="dayNamesControls"
                  :value="selectedDay"
                  @input="$emit('update:selectedDay', $event.target.value)"
                  class="form-control text-primary fw-semibold rounded shadow-sm"
                  @click="$emit('clear-input', 'sDate')"
                  id="selectDayControls"
                  ref="sDateInput"
              >
              <label for="selectDayControls">Selecteer een datum</label>
            </div>
            <datalist id="dayNamesControls">
              <option v-for="(dayName, index) in dayNames" :value="dayName" :key="index">{{ dayName }}</option>
            </datalist>
          </div>
          <div class="col-md-5 text-center mt-2 mt-md-0">
            <button type="button" class="btn py-2 fw-medium w-100" :class="buttonClass" @click="$emit('toggle-play')">
              <i v-if="isPlaying" class="bi bi-pause-circle-fill"></i>
              <i v-else class="bi bi-play-circle-fill"></i>
              {{ isPlaying ? 'Pauzeren' : 'Afspelen' }}
            </button>
          </div>
        </div>

        <p class="text-center small mb-1">Concentratie {{ formattedProperty }} nk (µg/m³)</p>
        <div class="row gx-1 text-center text-white small">
          <div class="col pb-1 fw-medium" v-for="(value, index) in legendaValues" :key="index">
            <div class="rounded p-1" :style="{ backgroundColor: colors[index] }"><span>{{ value }}</span></div>
          </div>
        </div>
        <div class="row pt-1 small">
          <div class="col"><small class="text-muted">{{ concentrationValues[0] }} Lage conc.</small></div>
          <div class="col text-end"><small class="text-muted">Hoge conc. {{ concentrationValues[1] }}</small></div>
        </div>
        <div class="pt-2 mt-2 border-top border-success-subtle small">
          <span v-html="isFrom"></span>
        </div>

        <h5 class="py-3 text-center text-primary-emphasis border-bottom border-secondary-subtle mt-3">Filteren van stations</h5>
        <div class="accordion accordion-flush" id="filtersAccordionControls">
          <FilterAccordionItem title="Regio" :items="filterCheckboxes.regio" :count="filterCheckboxes.regio.filter(i => i.checked).length" @filter-change="emitFilterChange('regio', $event)" item-id-prefix="regioCtrl" />
          <FilterAccordionItem title="Gemeente" :items="filterCheckboxes.gemeente" :count="filterCheckboxes.gemeente.filter(i => i.checked).length" @filter-change="emitFilterChange('gemeente', $event)" item-id-prefix="gemeenteCtrl" />
          <FilterAccordionItemSearchable
              title="Station"
              :items="filterCheckboxes.station_name"
              :count="filterCheckboxes.station_name.filter(i => i.checked).length"
              :search-query="stationSearchQuery" @update:searchQuery="$emit('update:stationSearchQuery', $event)" @filter-change="emitFilterChange('station_name', $event)"
              @select-matching="$emit('select-matching-stations')"
              item-id-prefix="stationCtrl"
          />
        </div>
      </div>

      <div class="tab-pane fade" id="files-analysis-content" role="tabpanel" aria-labelledby="tab-files-analysis">
        <h5 class="text-center mb-2 pb-2 border-bottom border-primary fw-semibold text-primary">Dashboardgegevens</h5>
        <p class="text-start text-primary-emphasis small">
          Upload een GeoJSON-bestand voor visualisatie of download de huidige gegevens.
        </p>
        <div class="row mb-3 gx-2">
          <div class="col-12 col-md-6 mb-2 mb-md-0">
            <div class="dropdown w-100">
              <button v-if="!isLocalFile" class="btn btn-primary dropdown-toggle py-2 px-3 w-100 fw-medium" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                Download Data
              </button>
              <button v-else class="btn btn-danger py-2 px-3 w-100 fw-medium" type="button" @click="$emit('local-file-cleared')">
                ← Terug naar serverdata
              </button>
              <ul class="dropdown-menu w-100">
                <li><a class="dropdown-item" href="#" @click.prevent="$emit('download-geojson')">GeoJSON</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="$emit('download-csv')">CSV</a></li>
              </ul>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <label for="uploadGeojsonFile" class="btn btn-info text-white py-2 px-3 w-100 fw-medium text-truncate" :title="isLocalFile ? fileName : 'Upload GeoJSON bestand'">
              <i class="bi bi-upload me-1"></i> {{ isLocalFile ? fileName : 'Upload GeoJSON' }}
            </label>
            <input type="file" id="uploadGeojsonFile" @change="handleFileUpload" accept=".geojson,.json" class="d-none" ref="localFileInput">
          </div>
        </div>

        <h5 class="pb-2 text-primary border-bottom border-primary mt-4">IDW Interpolatie</h5>
        <div class="my-2 small">
          <p>Voorspelt luchtkwaliteitswaarden op ongemeten locaties. Meetpunten dichtbij hebben meer invloed. Er kan een kleine vertraging zijn bij eerste gebruik.</p>
          <div class="text-center my-2">
            <img :src="interpolationLegendPath" class="img-fluid rounded mw-100" style="max-height: 100px;">
          </div>
        </div>
        <div class="btn-group btn-group-sm w-100 mt-2" role="group">
          <input type="radio" class="btn-check" name="interpolationToggle" id="idwDisable" value="disable" :checked="interpolationStatus === 'disable'" @change="$emit('update:interpolationStatus', 'disable')">
          <label class="btn btn-outline-danger" for="idwDisable">Verbergen</label>
          <input type="radio" class="btn-check" name="interpolationToggle" id="idwActivate" value="activate" :checked="interpolationStatus === 'activate'" @change="$emit('update:interpolationStatus', 'activate')">
          <label class="btn btn-outline-primary" for="idwActivate">Weergeven op kaart</label>
        </div>
      </div>

      <div class="tab-pane fade" id="contact-content" role="tabpanel" aria-labelledby="tab-contact">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title text-center text-success border-bottom pb-2">Contactgegevens</h5>
            <dl class="row small">
              <dt class="col-sm-4 font-weight-bold text-success">Team</dt>
              <dd class="col-sm-8">Het Team Geo van de Provincie Zuid-Holland is verantwoordelijk voor het beheer en de toepassing van geografische informatie en technologie.</dd>
              <dt class="col-sm-4 font-weight-bold text-success">Contact</dt>
              <dd class="col-sm-8">Voor technische ondersteuning of feedback, mail naar: <a href="mailto:teamgeo@pzh.nl" class="link-success fw-semibold">teamgeo@pzh.nl</a></dd>
              <dt class="col-sm-4 font-weight-bold text-success">Postadres</dt>
              <dd class="col-sm-8">Provincie Zuid-Holland Contact Centrum<br>Postbus 90602 - 2509 LP Den Haag</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FilterAccordionItem from './FilterAccordionItem.vue';
import FilterAccordionItemSearchable from './FilterAccordionItemSearchable.vue';

export default {
  name: 'ControlsPanel',
  components: {
    FilterAccordionItem,
    FilterAccordionItemSearchable,
  },
  props: {
    initialTimeValue: Number,
    initialSelectedDay: String,
    initialProperty: String,
    dayNames: Array,
    formattedProperty: String,
    legendaValues: Array,
    colors: Array,
    concentrationValues: Array,
    isFrom: String,
    filterCheckboxes: Object,
    stationSearchQuery: String, // Prop for v-model
    isLocalFile: Boolean,
    fileName: String,
    initialInterpolationStatus: String,
    isPlaying: Boolean,
    buttonClass: String,
  },
  data() {
    return {
      // Corrected: Using require for assets within src, assuming 'assets' is a subfolder of 'src'
      logoPath: require('@/assets/PZH-logo.png'),
      interpolationLegendPath: require('@/assets/interpolatie-legenda.png'),
    };
  },
  computed: {
    timeValue() { return this.initialTimeValue; },
    selectedDay() { return this.initialSelectedDay; },
    property() { return this.initialProperty; },
    interpolationStatus() { return this.initialInterpolationStatus; }
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.$emit('file-uploaded', file);
      }
    },
    emitFilterChange(type, checkedItemIds) {
      this.$emit('filters-updated', { type: type, checkedItems: checkedItemIds });
    },
    clearDateInput() {
      if (this.$refs.sDateInput) {
        this.$refs.sDateInput.value = '';
      }
      this.$emit('clear-input', 'sDate');
    }
  },
  emits: [
    'update:timeValue', 'update:selectedDay', 'update:property', 'update:interpolationStatus',
    'update:stationSearchQuery', // For v-model binding with stationSearchQuery
    'filters-updated', 'toggle-play', 'stop-slider', 'reload-page', 'clear-input',
    'select-matching-stations', 'download-geojson', 'download-csv',
    'local-file-cleared', 'file-uploaded'
  ]
};
</script>

<style scoped>
.controls-container {
  font-size: 0.9rem;
}
.form-select-md { font-size: 0.9rem; }
.form-range::-webkit-slider-thumb { background-color: #0d6efd; }
.form-range::-moz-range-thumb { background-color: #0d6efd; }
.nav-tabs .nav-link {
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
}
.accordion-button { font-size: 0.9rem; }
.btn { font-size: 0.9rem; }

#mainControlsTabContent {
  scrollbar-width: thin;
  scrollbar-color: #adb5bd #f8f9fa;
}
#mainControlsTabContent::-webkit-scrollbar {
  width: 8px;
}
#mainControlsTabContent::-webkit-scrollbar-track {
  background: #f8f9fa;
}
#mainControlsTabContent::-webkit-scrollbar-thumb {
  background-color: #adb5bd;
  border-radius: 4px;
  border: 2px solid #f8f9fa;
}
.focused-label .form-control:focus ~ label,
.focused-label .form-control:not(:placeholder-shown) ~ label {
  color: #007bff;
}
</style>
