<template>
  <div>
    <div class="bg-white rounded pb-3 shadow-sm">
      <div class="container">
        <div class="row mb-2 align-items-center">
          <div class="col-5">
            <img
                :src="logoPzh"
                class="img-fluid rounded d-block"
                title="Refresh website"
                @click="emit('refresh-page')"
                style="max-width: 70%; cursor: pointer;"
                alt="Provincie Zuid-Holland Logo"
            >
          </div>
          <div class="col-7">
            <h4 class="text-end text-primary-emphasis m-0 small-h4">Dashboard Luchtkwaliteit</h4>
          </div>
        </div>

        <nav>
          <div class="nav nav-tabs nav-justified" role="tablist">
            <button class="nav-link active fw-semibold" id="nav-legenda-tab" data-bs-toggle="tab" data-bs-target="#nav-legenda-panel" type="button" role="tab" aria-controls="nav-legenda-panel" aria-selected="true">Legenda & Selectie</button>
            <button class="nav-link fw-semibold" id="nav-contact-tab" data-bs-toggle="tab" data-bs-target="#nav-contact-panel" type="button" role="tab" aria-controls="nav-contact-panel" aria-selected="false">Contact</button>
          </div>
        </nav>

        <div class="tab-content mt-2">
          <div class="tab-pane fade show active" id="nav-legenda-panel" role="tabpanel" aria-labelledby="nav-legenda-tab" tabindex="0">
            <h5 class="my-2 pt-1 text-center text-primary-emphasis border-bottom pb-2">Parameters & Legenda <i class="bi bi-funnel"></i></h5>

            <div class="col-md-11 mx-auto mb-2">
              <div class="form-floating">
                <select
                    class="form-select form-select-sm text-primary fw-semibold text-center shadow-sm"
                    id="propertySelect"
                    v-model="localSelectedProperty"
                    @change="onPropertyChange"
                    :disabled="isLoading"
                    style="background: white !important;"
                >
                  <option class="fw-semibold" value="no2">Stikstofdioxide | NO₂</option>
                  <option class="fw-semibold" value="pm10">Fijnstof | PM10</option>
                  <option class="fw-semibold" value="pm25">Fijnstof | PM2,5</option>
                </select>
                <label for="propertySelect" class="small">Selecteer sensor parameter</label>
              </div>
            </div>

            <div class="row px-3 mb-2">
              <div class="col-12">
                <label for="timeSlider" class="form-label small mb-0">Geselecteerd uur: {{ localTimeValue }}:00</label>
                <input
                    id="timeSlider"
                    class="form-range w-100"
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    v-model.number="localTimeValue"
                    @change="onTimeChange"
                    @input="updateTimeDisplay"
                    :disabled="isLoading"
                    :title="'Geselecteerd uur: ' + localTimeValue + ':00'"
                >
              </div>
            </div>

            <div class="row pt-1 px-3 align-items-center">
              <div class="col-md-7 mb-2 mb-md-0">
                <div class="form-floating">
                  <input
                      type="search"
                      list="dayNamesList"
                      v-model="localSelectedDay"
                      class="form-control form-control-sm text-primary fw-semibold rounded shadow-sm"
                      @change="onDateChange"
                      @click="clearDateInput"
                      :disabled="isLoading"
                      id="dateSelectInput"
                      placeholder="Selecteer datum"
                  >
                  <label for="dateSelectInput" class="small">Selecteer een datum</label>
                </div>
                <datalist id="dayNamesList">
                  <option v-for="(dayName, index) in dayNames" :value="dayName" :key="index"></option>
                </datalist>
              </div>
              <div class="col-md-5 text-center">
                <button
                    type="button"
                    class="btn btn-sm py-2 fw-medium w-100"
                    :class="buttonClass"
                    @click="emit('play-toggle')"
                    :disabled="isLoading"
                >
                  <i v-if="isPlaying" class="bi bi-pause-circle-fill me-1"></i>
                  <i v-else class="bi bi-play-circle-fill me-1"></i>
                  {{ isPlaying ? 'Pauzeren' : 'Afspelen' }}
                </button>
              </div>
            </div>

            <p class="text-center small mt-3 mb-1">Concentratie {{ formattedProperty }} (µg/m³)</p>
            <div class="row px-2 text-center text-white small">
              <div class="col-6 col-xl-3 pb-1 fw-medium" v-for="(value, index) in legendaValues" :key="index">
                <div class="rounded p-1" :style="{ backgroundColor: colors[index] }">{{ value }}</div>
              </div>
            </div>
            <div class="row pt-1 px-2">
              <h6 class="col mb-0"><small class="text-muted" style="font-size: 0.75em;">{{ concentrationValues[0] }} Lage concentratie</small></h6>
              <h6 class="col text-end mb-0"><small class="text-muted" style="font-size: 0.75em;">Hoge concentratie {{ concentrationValues[1] }}</small></h6>
            </div>

            <div class="row d-none d-md-block">
              <div class="col pt-2 mx-2 border-top border-success-subtle">
                <span v-html="isFrom" class="small"></span>
              </div>
            </div>
          </div>

          <div class="tab-pane fade" id="nav-contact-panel" role="tabpanel" aria-labelledby="nav-contact-tab" tabindex="0">
            <div class="row p-2">
              <div class="card border-light">
                <div class="card-body p-2">
                  <h5 class="card-title text-center text-success border-bottom pb-2">Contactgegevens</h5>
                  <dl class="row small">
                    <dt class="col-sm-3 font-weight-bold text-success">Team</dt>
                    <dd class="col-sm-9">Team Geo van de Provincie Zuid-Holland.</dd>
                    <dt class="col-sm-3 font-weight-bold text-success">Contact</dt>
                    <dd class="col-sm-9">Technische ondersteuning/feedback: <a href="mailto:teamgeo@pzh.nl" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">teamgeo@pzh.nl</a></dd>
                    <dt class="col-sm-3 font-weight-bold text-success">Postadres</dt>
                    <dd class="col-sm-9">Provincie Zuid-Holland Contact Centrum<br>Postbus 90602 - 2509 LP Den Haag</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded p-2 mt-2 shadow-sm">
      <nav>
        <div class="nav nav-tabs nav-justified" role="tablist">
          <button class="nav-link active fw-semibold" id="nav-filter-tab" data-bs-toggle="tab" data-bs-target="#nav-filter-panel" type="button" role="tab" aria-controls="nav-filter-panel" aria-selected="true">Filters</button>
          <button class="nav-link fw-semibold" id="nav-wms-tab" data-bs-toggle="tab" data-bs-target="#nav-wms-panel" type="button" role="tab" aria-controls="nav-wms-panel" aria-selected="false">Analyse</button>
          <button class="nav-link fw-semibold" id="nav-bestanden-tab" data-bs-toggle="tab" data-bs-target="#nav-bestanden-panel" type="button" role="tab" aria-controls="nav-bestanden-panel" aria-selected="false">Bestanden</button>
        </div>
      </nav>

      <div class="tab-content mt-2">
        <div class="tab-pane fade show active" id="nav-filter-panel" role="tabpanel" aria-labelledby="nav-filter-tab" tabindex="0">
          <h5 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">Filteren van Stations</h5>
          <div class="row p-1">
            <div class="accordion accordion-flush" id="filterAccordion">
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseRegio" aria-expanded="false" aria-controls="collapseRegio">
                    <span class="me-2 fw-medium text-primary-emphasis small">Selecteer Regio</span>
                    <span :class="badgeClass(localFilterOptions.regio)">
                      {{ badgeCount(localFilterOptions.regio) }}
                    </span>
                  </button>
                </h2>
                <div id="collapseRegio" class="accordion-collapse collapse" data-bs-parent="#filterAccordion">
                  <div class="accordion-body p-2 filter-scroll-container">
                    <div v-for="checkbox in localFilterOptions.regio" :key="checkbox.id" class="form-check form-check-sm">
                      <input type="checkbox" :id="`regio-${checkbox.id}`" :value="checkbox.id" v-model="checkbox.checked" @change="onFilterChange" class="form-check-input" :disabled="isLoading">
                      <label :for="`regio-${checkbox.id}`" class="form-check-label small">{{ checkbox.label }}</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseGemeente" aria-expanded="false" aria-controls="collapseGemeente">
                    <span class="me-2 fw-medium text-primary-emphasis small">Selecteer Gemeente</span>
                    <span :class="badgeClass(localFilterOptions.Gemeente)">
                      {{ badgeCount(localFilterOptions.Gemeente) }}
                    </span>
                  </button>
                </h2>
                <div id="collapseGemeente" class="accordion-collapse collapse" data-bs-parent="#filterAccordion">
                  <div class="accordion-body p-2 filter-scroll-container">
                    <div v-for="checkbox in localFilterOptions.Gemeente" :key="checkbox.id" class="form-check form-check-sm">
                      <input type="checkbox" :id="`gemeente-${checkbox.id}`" :value="checkbox.id" v-model="checkbox.checked" @change="onFilterChange" class="form-check-input" :disabled="isLoading">
                      <label :for="`gemeente-${checkbox.id}`" class="form-check-label small">{{ checkbox.label }}</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseStation" aria-expanded="false" aria-controls="collapseStation">
                    <span class="me-2 fw-medium text-primary-emphasis small">Selecteer Station</span>
                    <span :class="badgeClass(localFilterOptions.station_name)">
                     {{ badgeCount(localFilterOptions.station_name) }}
                    </span>
                  </button>
                </h2>
                <div id="collapseStation" class="accordion-collapse collapse" data-bs-parent="#filterAccordion">
                  <div class="accordion-body p-2 filter-scroll-container">
                    <div class="form-floating mb-2">
                      <input
                          type="search"
                          v-model="stationSearch"
                          class="form-control form-control-sm text-primary rounded shadow-sm"
                          @input="handleStationSearchInput"
                          list="stationOptionsList"
                          id="stationSearchInput"
                          placeholder="Zoek station"
                          :disabled="isLoading"
                      >
                      <label for="stationSearchInput" class="small">Zoek station</label>
                    </div>
                    <datalist id="stationOptionsList">
                      <option v-for="checkbox in localFilterOptions.station_name" :key="checkbox.id" :value="checkbox.label"></option>
                    </datalist>
                    <div v-for="checkbox in filteredStationOptions" :key="checkbox.id" class="form-check form-check-sm">
                      <input type="checkbox" :id="`station-${checkbox.id}`" :value="checkbox.id" v-model="checkbox.checked" @change="onFilterChange" class="form-check-input" :disabled="isLoading">
                      <label :for="`station-${checkbox.id}`" class="form-check-label small">{{ checkbox.label }}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane fade" id="nav-wms-panel" role="tabpanel" aria-labelledby="nav-wms-tab" tabindex="0">
          <div class="row p-2">
            <div class="col text-center">
              <h5 class="pb-2 text-primary border-bottom border-primary">IDW Interpolatie</h5>
              <div class="row my-2 align-items-center">
                <div class="col-md-8 text-start small">
                  Voorspelt luchtkwaliteit op ongemeten locaties (IDW). Punten dichtbij hebben meer invloed. Beheer zichtbaarheid met de knoppen. Een kleine vertraging kan optreden bij eerste gebruik. Nauwkeurigheid hangt af van meetpunten.
                </div>
                <div class="col-md-4 text-center text-md-end">
                  <img :src="interpolatieLegenda" class="img-fluid rounded" style="max-height: 70px;" alt="Interpolatie Legenda">
                </div>
              </div>
              <div class="btn-group btn-group-sm mt-2 w-100" role="group" aria-label="Interpolation Toggle">
                <input type="radio" class="btn-check" name="interpolationToggle" value="disable" id="disableInterpolation" autocomplete="off" v-model="localInterpolationStatus" @change="onInterpolationChange" :disabled="isLoading">
                <label class="btn btn-outline-danger" for="disableInterpolation">Verbergen</label>

                <input type="radio" class="btn-check" name="interpolationToggle" value="activate" id="activateInterpolation" autocomplete="off" v-model="localInterpolationStatus" @change="onInterpolationChange" :disabled="isLoading">
                <label class="btn btn-outline-primary" for="activateInterpolation">Weergeven</label>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane fade" id="nav-bestanden-panel" role="tabpanel" aria-labelledby="nav-bestanden-tab" tabindex="0">
          <section class="container p-2">
            <header class="text-center mb-2">
              <h5 class="pb-2 border-bottom border-primary fw-semibold text-primary">Bestandsbeheer</h5>
            </header>
            <article class="mb-3">
              <p class="text-start small">Download de huidige gefilterde gegevens als GeoJSON of CSV. U kunt ook uw eigen GeoJSON-bestand uploaden voor visualisatie (vereist specifieke datastructuur).</p>
            </article>
            <div class="row mb-2">
              <div class="col-12 col-xl-6 mb-2 mb-xl-0">
                <div class="dropdown w-100">
                  <button
                      class="btn btn-primary dropdown-toggle btn-sm py-2 px-3 w-100 fw-medium"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      v-if="!isLocalFile"
                      :disabled="isLoading"
                  >
                    <i class="bi bi-download me-1"></i> Download Data
                  </button>
                  <button
                      class="btn btn-danger btn-sm py-2 px-3 w-100 fw-medium"
                      type="button"
                      v-else
                      @click="emit('clear-local-file')"
                      :disabled="isLoading"
                  >
                    <i class="bi bi-arrow-left-circle me-1"></i> Terug naar Server Data
                  </button>
                  <ul class="dropdown-menu w-100">
                    <li><a class="dropdown-item" href="#" @click.prevent="onDownloadClick('geojson')">Download GeoJSON</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent="onDownloadClick('csv')">Download CSV</a></li>
                  </ul>
                </div>
              </div>
              <div class="col-12 col-xl-6">
                <div class="input-group">
                  <label
                      :for="fileInputId"
                      class="btn btn-sm custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate"
                      :class="{'btn-info': !isLocalFile, 'btn-success': isLocalFile}"
                      :title="isLocalFile ? fileName : 'Upload GeoJSON bestand'"
                      style="max-width: 100%; overflow: hidden;"
                  >
                    <i class="bi bi-upload me-1"></i> {{ isLocalFile ? fileName : 'Upload GeoJSON...' }}
                  </label>
                  <input
                      type="file"
                      :id="fileInputId"
                      ref="localFileRef"
                      @change="onFileInput"
                      class="d-none"
                      accept=".geojson,application/geo+json"
                      :disabled="isLoading"
                  >
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { cloneDeep } from 'lodash-es';

import logoPzh from '@/assets/PZH-logo.png';
import interpolatieLegenda from '@/assets/interpolatie-legenda.png';

const props = defineProps({
  dayNames: { type: Array, default: () => [] },
  selectedDay: { type: String, default: '' },
  timeValue: { type: Number, default: () => new Date().getHours() },
  isPlaying: { type: Boolean, default: false },
  selectedProperty: { type: String, default: 'pm25' },
  formattedProperty: { type: String, default: 'PM2,5' },
  legendaValues: { type: Array, default: () => [] },
  concentrationValues: { type: Array, default: () => [] },
  colors: { type: Array, default: () => [] },
  isFrom: { type: String, default: '' },
  filterOptions: { type: Object, default: () => ({ regio: [], Gemeente: [], station_name: [] }) },
  isLocalFile: { type: Boolean, default: false },
  fileName: { type: String, default: 'Uploaden | Geojson bestand' },
  interpolationStatus: { type: String, default: 'disable' },
  isLoading: { type: Boolean, default: false }
});

const emit = defineEmits([
  'property-change',
  'time-change',
  'date-change',
  'play-toggle',
  'advanced-filter-change',
  'station-search-select',
  'interpolation-change',
  'download-request',
  'file-upload',
  'clear-local-file',
  'refresh-page'
]);

const localSelectedProperty = ref(props.selectedProperty);
const localTimeValue = ref(props.timeValue);
const localSelectedDay = ref(props.selectedDay);
const localInterpolationStatus = ref(props.interpolationStatus);
const stationSearch = ref('');
const localFileRef = ref(null);
const fileInputId = `file-input-${Math.random().toString(36).substring(7)}`;

const localFilterOptions = reactive({
  regio: [],
  Gemeente: [],
  station_name: []
});

const buttonClass = computed(() => {
  return props.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary';
});

const filteredStationOptions = computed(() => {
  if (!stationSearch.value) {
    return localFilterOptions.station_name;
  }
  const searchTerm = stationSearch.value.toLowerCase();
  return localFilterOptions.station_name.filter(option =>
      option.label.toLowerCase().includes(searchTerm)
  );
});

const badgeClass = (options) => {
  if (!Array.isArray(options)) return 'badge rounded-pill bg-secondary ms-1 small'; // Handle potential initialization issues
  const count = options.filter(cb => cb.checked).length;
  return {
    'badge rounded-pill': true,
    'bg-danger text-white': count === 0,
    'bg-primary text-white': count > 0,
    'ms-1': true,
    'small': true
  };
};

const badgeCount = (options) => {
  if (!Array.isArray(options)) return '0'; // Handle potential initialization issues
  const count = options.filter(cb => cb.checked).length;
  return count > 0 ? count : '0';
};

watch(() => props.selectedProperty, (newVal) => { localSelectedProperty.value = newVal; });
watch(() => props.timeValue, (newVal) => { localTimeValue.value = newVal; });
watch(() => props.selectedDay, (newVal) => { localSelectedDay.value = newVal; });
watch(() => props.interpolationStatus, (newVal) => { localInterpolationStatus.value = newVal; });

watch(() => props.filterOptions, (newVal) => {
  const cloned = cloneDeep(newVal);
  localFilterOptions.regio = cloned.regio || [];
  localFilterOptions.Gemeente = cloned.Gemeente || [];
  localFilterOptions.station_name = cloned.station_name || [];
}, { deep: true, immediate: true });


watch(localFilterOptions, (newVal) => {
  emit('advanced-filter-change', newVal);
}, { deep: true });

function onPropertyChange() {
  emit('property-change', localSelectedProperty.value);
}

function onTimeChange() {
  emit('time-change', localTimeValue.value);
}

function updateTimeDisplay(event) {
  localTimeValue.value = parseInt(event.target.value, 10);
}

function onDateChange() {
  emit('date-change', localSelectedDay.value);
}

function clearDateInput() {
  if (localSelectedDay.value !== '') {
    localSelectedDay.value = '';
    emit('date-change', '');
  }
}

function onFilterChange() {
  // Emission handled by watcher
}

function handleStationSearchInput() {
  const exactMatch = localFilterOptions.station_name.find(
      option => option.label.toLowerCase() === stationSearch.value.toLowerCase()
  );
  if (exactMatch) {
    emit('station-search-select', exactMatch.label);
  }
}

function onInterpolationChange() {
  emit('interpolation-change', localInterpolationStatus.value);
}

function onDownloadClick(format) {
  emit('download-request', format);
}

function onFileInput(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (file) {
    emit('file-upload', file);
  }
  if (localFileRef.value) {
    localFileRef.value.value = null;
  }
}

</script>

<style scoped>
.filter-scroll-container {
  max-height: 18vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 5px;
}

.small-h4 {
  font-size: 1rem;
  font-weight: 600;
}

.form-select-sm, .form-control-sm, .btn-sm, .form-check-sm .form-check-label, .form-check-sm .form-check-input {
  font-size: 0.8rem;
}

.form-check-sm {
  padding-left: 1.5em;
  margin-bottom: 0.25rem;
}

.form-floating > label.small {
  font-size: 0.75rem;
  padding-top: 0.4rem;
}
.form-floating > .form-control-sm {
  min-height: calc(1.5em + 0.8rem + 2px);
  padding-top: 1rem;
}
.form-floating > .form-control-sm:not(:placeholder-shown) ~ label.small {
  transform: scale(.75) translateY(-0.5rem) translateX(0.15rem);
}

.custom-file-upload {
  cursor: pointer;
  display: inline-block;
}

.btn-check + .btn:hover {
  opacity: 0.9;
}

.filter-scroll-container::-webkit-scrollbar {
  width: 6px;
}
.filter-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
.filter-scroll-container::-webkit-scrollbar-thumb {
  background: #aaa;
  border-radius: 3px;
}
.filter-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.nav-tabs.nav-justified .nav-link {
  white-space: nowrap;
  font-size: 0.85rem;
  padding: 0.5rem 0.25rem;
}

.accordion-button.collapsed::after {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%230d6efd'%3e%3cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3e%3c/svg%3e");
}
.accordion-button:not(.collapsed)::after {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%230d6efd'%3e%3cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3e%3c/svg%3e");
  transform: rotate(-180deg);
}
.accordion-button:focus {
  box-shadow: none;
  border-color: rgba(0,0,0,.125);
}

</style>