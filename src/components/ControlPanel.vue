<template>
  <div ref="controlPanelElement" class="control-panel-wrapper">
    <div class="bg-white rounded pb-3 shadow-sm">
      <div class="container">
        <div class="row mb-2 align-items-center">
          <div class="col-5 col-md-4">
            <img
                :src="require('@/assets/PZH-logo.png')"
                class="img-fluid rounded d-block pt-2"
                title="Refresh website"
                alt="Provincie Zuid-Holland Logo"
                @click="onRefreshPage"
                style="cursor: pointer; max-width: 100%; height: auto;"
            />
          </div>
          <div class="col-7 col-md-8">
            <h4 class="text-primary-emphasis m-0 pt-2 text-center">Dashboard Luchtkwaliteit</h4>
          </div>
        </div>

        <nav>
          <div class="nav nav-tabs" role="tablist">
            <button class="nav-link active fw-semibold" id="nav-legenda-tab" data-bs-toggle="tab" data-bs-target="#nav-legenda" type="button" role="tab" aria-controls="nav-legenda" aria-selected="true">Legenda & Filters</button>
            <button class="nav-link fw-semibold" id="nav-contact-tab" data-bs-toggle="tab" data-bs-target="#nav-contact" type="button" role="tab" aria-controls="nav-contact" aria-selected="false">Contact</button>
          </div>
        </nav>

        <div class="tab-content pt-2">
          <div class="tab-pane fade show active" id="nav-legenda" role="tabpanel" aria-labelledby="nav-legenda-tab" tabindex="0">
            <h5 class="my-2 text-center text-primary-emphasis">Luchtkwaliteit Selectie <i class="bi bi-funnel"></i></h5>

            <div class="mb-2 form-floating">
              <select
                  class="form-select form-select-sm text-primary fw-semibold shadow-sm"
                  id="sensorPropertySelect"
                  :value="props.selectedProperty"
                  @change="onPropertyChange"
                  aria-label="Selecteer een type sensordata"
              >
                <option class="fw-semibold" value="no2">Stikstofdioxide | NO2</option>
                <option class="fw-semibold" value="pm10">Fijnstof 10microm | PM10</option>
                <option class="fw-semibold" value="pm25">Fijnstof 2.5 microm | PM2,5</option>
              </select>
              <label for="sensorPropertySelect">Selecteer Sensordata</label>
            </div>

            <div class="mb-2 px-1">
              <label :for="`timeSlider-${fileInputId}`" class="form-label">Geselecteerd uur: {{ props.timeValue }}:00</label>
              <input
                  :id="`timeSlider-${fileInputId}`"
                  type="range"
                  class="form-range w-100"
                  min="0"
                  max="23"
                  step="1"
                  :value="props.timeValue"
                  @change="onTimeChange"
                  @mousedown="onTimeSliderInteraction"
                  :title="'Geselecteerd uur: ' + props.timeValue + ':00'"
              />
            </div>

            <div class="row g-2 mb-2 align-items-center">
              <div class="col-md-7">
                <div class="form-floating">
                  <input
                      type="search"
                      list="dayNamesDatalist"
                      :value="props.selectedDay"
                      @input="onDateChange"
                      class="form-control form-control-sm text-primary fw-semibold shadow-sm"
                      id="dateSelect"
                      placeholder="Selecteer datum"
                      ref="dateInputRef"
                      aria-label="Selecteer een datum"
                  />
                  <label for="dateSelect">Selecteer Datum</label>
                  <datalist id="dayNamesDatalist">
                    <option v-for="dayName in props.dayNames" :value="dayName" :key="dayName"></option>
                  </datalist>
                </div>
              </div>
              <div class="col-md-5">
                <button
                    type="button"
                    class="btn py-2 fw-medium w-100"
                    :class="buttonClass"
                    @click="onPlayButtonClick"
                >
                  <i :class="props.isPlaying ? 'bi bi-pause-circle-fill' : 'bi bi-play-circle-fill'"></i>
                  {{ props.isPlaying ? 'Pauzeren' : 'Afspelen' }}
                </button>
              </div>
            </div>


            <p class="text-center mb-1 mt-3">Concentratie {{ props.formattedProperty }} (µg/m³)</p>
            <div class="row g-1 px-2 text-center text-light">
              <div
                  class="col fw-medium"
                  v-for="(value, index) in props.legendaValues"
                  :key="`legend-${index}`"
              >
                <div class="rounded p-1" :style="{ backgroundColor: props.legendColors[index] || '#888' }">
                  {{ value }}
                </div>
              </div>
            </div>
            <div class="row pt-1 px-2">
              <small class="col text-muted text-start">{{ props.concentrationValues[0] }} Laag</small>
              <small class="col text-muted text-end">Hoog {{ props.concentrationValues[1] }}</small>
            </div>
            <div class="row pt-2">
              <div class="col mx-2 border-top border-success-subtle">
                <small class="text-muted fst-italic" v-html="props.isFromText"></small>
              </div>
            </div>
          </div>

          <div class="tab-pane fade" id="nav-contact" role="tabpanel" aria-labelledby="nav-contact-tab" tabindex="0">
            <div class="p-2">
              <div class="card border-light shadow-sm">
                <div class="card-body">
                  <h5 class="card-title text-center text-success border-bottom pb-2 mb-3">Contactgegevens</h5>
                  <dl class="row">
                    <dt class="col-sm-3 text-success">Team</dt>
                    <dd class="col-sm-9">Het Team Geo van de Provincie Zuid-Holland.</dd>
                    <dt class="col-sm-3 text-success">Contact</dt>
                    <dd class="col-sm-9">
                      <a href="mailto:teamgeo@pzh.nl" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">teamgeo@pzh.nl</a>
                    </dd>
                    <dt class="col-sm-3 text-success">Adres</dt>
                    <dd class="col-sm-9">Provincie Zuid-Holland<br>Postbus 90602<br>2509 LP Den Haag</dd>
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
        <div class="nav nav-tabs" role="tablist">
          <button class="nav-link active fw-semibold" id="nav-filter-tab" data-bs-toggle="tab" data-bs-target="#nav-filter" type="button" role="tab" aria-controls="nav-filter" aria-selected="true">Gegevens Filteren</button>
          <button class="nav-link fw-semibold" id="nav-analysis-tab" data-bs-toggle="tab" data-bs-target="#nav-analysis" type="button" role="tab" aria-controls="nav-analysis" aria-selected="false">Analyse</button>
          <button class="nav-link fw-semibold" id="nav-files-tab" data-bs-toggle="tab" data-bs-target="#nav-files" type="button" role="tab" aria-controls="nav-files" aria-selected="false">Bestanden</button>
        </div>
      </nav>

      <div class="tab-content pt-2">
        <div class="tab-pane fade show active" id="nav-filter" role="tabpanel" aria-labelledby="nav-filter-tab" tabindex="0">
          <h5 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">Filter Stations</h5>
          <div class="accordion accordion-flush" id="advancedFilterAccordion">
            <div class="accordion-item">
              <h2 class="accordion-header" :id="`headingRegio-${fileInputId}`">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapseRegio-${fileInputId}`" aria-expanded="false" :aria-controls="`collapseRegio-${fileInputId}`">
                  Selecteer Regio
                  <span class="ms-auto badge rounded-pill" :class="selectedRegioCount > 0 ? 'bg-primary' : 'bg-secondary'">
                    {{ selectedRegioCount }}
                  </span>
                </button>
              </h2>
              <div :id="`collapseRegio-${fileInputId}`" class="accordion-collapse collapse" :aria-labelledby="`headingRegio-${fileInputId}`" data-bs-parent="#advancedFilterAccordion">
                <div class="accordion-body filter-options-body">
                  <div v-for="checkbox in localRegioOptions" :key="checkbox.id" class="form-check form-check-sm">
                    <input type="checkbox" :id="`regio-${checkbox.id}`" v-model="checkbox.checked" @change="onFilterCheckboxChange" class="form-check-input">
                    <label :for="`regio-${checkbox.id}`" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                  <div v-if="!localRegioOptions.length" class="text-muted small fst-italic">Geen regio's beschikbaar.</div>
                </div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" :id="`headingGemeente-${fileInputId}`">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapseGemeente-${fileInputId}`" aria-expanded="false" :aria-controls="`collapseGemeente-${fileInputId}`">
                  Selecteer Gemeente
                  <span class="ms-auto badge rounded-pill" :class="selectedGemeenteCount > 0 ? 'bg-primary' : 'bg-secondary'">
                     {{ selectedGemeenteCount }}
                   </span>
                </button>
              </h2>
              <div :id="`collapseGemeente-${fileInputId}`" class="accordion-collapse collapse" :aria-labelledby="`headingGemeente-${fileInputId}`" data-bs-parent="#advancedFilterAccordion">
                <div class="accordion-body filter-options-body">
                  <div v-for="checkbox in localGemeenteOptions" :key="checkbox.id" class="form-check form-check-sm">
                    <input type="checkbox" :id="`gemeente-${checkbox.id}`" v-model="checkbox.checked" @change="onFilterCheckboxChange" class="form-check-input">
                    <label :for="`gemeente-${checkbox.id}`" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                  <div v-if="!localGemeenteOptions.length" class="text-muted small fst-italic">Geen gemeentes beschikbaar.</div>
                </div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" :id="`headingStation-${fileInputId}`">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapseStation-${fileInputId}`" aria-expanded="false" :aria-controls="`collapseStation-${fileInputId}`">
                  Selecteer Station
                  <span class="ms-auto badge rounded-pill" :class="selectedStationCount > 0 ? 'bg-primary' : 'bg-secondary'">
                    {{ selectedStationCount }}
                  </span>
                </button>
              </h2>
              <div :id="`collapseStation-${fileInputId}`" class="accordion-collapse collapse" :aria-labelledby="`headingStation-${fileInputId}`" data-bs-parent="#advancedFilterAccordion">
                <div class="accordion-body filter-options-body">
                  <div class="mb-2 form-floating">
                    <input
                        type="search"
                        list="stationNamesDatalist"
                        v-model="localSearchTerm"
                        @input="onStationSearchInput"
                        @change="onStationSearchChange"
                        ref="searchInputRef"
                        class="form-control form-control-sm"
                        id="stationSearchInput"
                        placeholder="Zoek station..."
                        aria-label="Zoek naar een station"
                    />
                    <label for="stationSearchInput">Zoek station...</label>
                    <datalist id="stationNamesDatalist">
                      <option v-for="option in localStationOptions" :key="option.id" :value="option.label"></option>
                    </datalist>
                  </div>
                  <div v-for="checkbox in filteredStationOptions" :key="checkbox.id" class="form-check form-check-sm">
                    <input type="checkbox" :id="`station-${checkbox.id}`" v-model="checkbox.checked" @change="onFilterCheckboxChange" class="form-check-input">
                    <label :for="`station-${checkbox.id}`" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                  <div v-if="!localStationOptions.length" class="text-muted small fst-italic">Geen stations beschikbaar.</div>
                  <div v-if="localStationOptions.length && !filteredStationOptions.length" class="text-muted small fst-italic">Geen stations gevonden voor zoekterm.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tab-pane fade" id="nav-analysis" role="tabpanel" aria-labelledby="nav-analysis-tab" tabindex="0">
          <h5 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">IDW Interpolatie</h5>
          <div class="row p-2 align-items-center">
            <div class="col-12 mb-2 small">
              De ‘IDW Interpolatie’ voorspelt luchtkwaliteitswaarden op ongemeten locaties. Punten dichtbij hebben meer invloed. Beheer de zichtbaarheid met de knoppen hieronder.
              <br><br>
              <span class="fw-semibold">Let op:</span> Eerste keer laden kan even duren. Nauwkeurigheid hangt af van meetpunten.
            </div>
            <div class="col-4 col-md-3 text-center">
              <img :src="require('@/assets/interpolatie-legenda.png')" class="img-fluid rounded" alt="Interpolatie Legenda">
            </div>
            <div class="col-8 col-md-9">
              <div class="btn-group w-100" role="group" aria-label="Interpolatie status">
                <input type="radio" class="btn-check" name="interpolationRadio" :id="`interp-disable-${fileInputId}`" value="disable" v-model="localInterpolationStatus" @change="onInterpolationStatusChange" autocomplete="off">
                <label class="btn btn-outline-danger" :for="`interp-disable-${fileInputId}`">Verbergen</label>

                <input type="radio" class="btn-check" name="interpolationRadio" :id="`interp-activate-${fileInputId}`" value="activate" v-model="localInterpolationStatus" @change="onInterpolationStatusChange" autocomplete="off">
                <label class="btn btn-outline-primary" :for="`interp-activate-${fileInputId}`">Weergeven</label>
              </div>
            </div>
          </div>
        </div>

        <section id="nav-files" class="tab-pane fade" role="tabpanel" aria-labelledby="nav-files-tab" tabindex="0">
          <h5 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">Downloaden & Uploaden</h5>
          <article class="p-2 small">
            <p>Download de momenteel gefilterde gegevens als GeoJSON of CSV. U kunt ook uw eigen GeoJSON-bestand uploaden ter visualisatie (dit overschrijft tijdelijk de servergegevens).</p>
          </article>
          <div class="row g-2 p-2">
            <div class="col-12 col-md-6">
              <button v-if="props.isLocalFile" class="btn btn-danger w-100 fw-medium" type="button" @click="revertToServer">
                ← Terug naar Server Data
              </button>
              <div v-else class="dropdown w-100">
                <button class="btn btn-primary dropdown-toggle w-100 fw-medium" type="button" :id="`downloadMenuButton-${fileInputId}`" data-bs-toggle="dropdown" aria-expanded="false">
                  Download Huidige Data
                </button>
                <ul class="dropdown-menu" :aria-labelledby="`downloadMenuButton-${fileInputId}`">
                  <li><a class="dropdown-item" href="#" @click.prevent="requestDownload('geojson')">Download GeoJSON</a></li>
                  <li><a class="dropdown-item" href="#" @click.prevent="requestDownload('csv')">Download CSV</a></li>
                </ul>
              </div>
            </div>
            <div class="col-12 col-md-6">
              <label :for="fileInputId" class="btn btn-outline-success w-100 fw-medium text-truncate" :title="uploadButtonTitle">
                <i class="bi bi-upload me-1"></i> {{ uploadButtonLabel }}
              </label>
              <input
                  type="file"
                  :id="fileInputId"
                  ref="fileInputRef"
                  @change="handleFileChange"
                  class="d-none"
                  accept=".geojson,application/geo+json"
              >
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import cloneDeep from 'lodash/cloneDeep'; // Ensure lodash is installed

const props = defineProps({
  dayNames: { type: Array, default: () => [] },
  selectedDay: { type: String, default: '' },
  timeValue: { type: Number, default: 0 }, // Default to 0, parent should provide initial
  selectedProperty: { type: String, default: 'pm25' },
  isPlaying: { type: Boolean, default: false },
  legendaValues: { type: Array, default: () => [] },
  legendColors: { type: Array, default: () => ['#ccc', '#ccc', '#ccc', '#ccc'] },
  concentrationValues: { type: Array, default: () => [] },
  formattedProperty: { type: String, default: 'N/A' },
  isFromText: { type: String, default: '' },
  regioOptions: { type: Array, default: () => [] }, // Expecting array of {id, label, checked}
  gemeenteOptions: { type: Array, default: () => [] }, // Expecting array of {id, label, checked}
  stationOptions: { type: Array, default: () => [] }, // Expecting array of {id, label, checked}
  isLocalFile: { type: Boolean, default: false },
  fileName: { type: String, default: 'Geojson bestand | Uploaden' },
  interpolationStatus: { type: String, default: 'disable' },
  // searchTerm prop removed - search term is managed locally
});

const emit = defineEmits([
  'property-change',      // (payload: string - new property value)
  'time-change',          // (payload: number - new time value)
  'date-change',          // (payload: string - new date value)
  // 'date-clear' event removed, using date-change with empty string
  'play-toggle',          // (payload: boolean - new playing state)
  'advanced-filter-change',// (payload: { regio: object[], gemeente: object[], station_name: object[] })
  // 'station-search-input' removed - handled locally
  'station-search-select', // (payload: string - selected station label)
  'interpolation-change', // (payload: string - 'activate' or 'disable')
  'download-request',     // (payload: string - 'geojson' or 'csv')
  'file-upload',          // (payload: File object)
  'clear-local-file',     // (no payload)
  'refresh-page',         // (no payload)
]);

// --- Refs ---
const controlPanelElement = ref(null); // Ref for the main div if needed
const dateInputRef = ref(null);        // Ref for the date input element
const fileInputRef = ref(null);        // Ref for the hidden file input element
const searchInputRef = ref(null);      // Ref for the station search input

// Local copies of filter options and state
// Use cloneDeep to ensure reactivity works correctly with nested 'checked' property
const localRegioOptions = ref([]);
const localGemeenteOptions = ref([]);
const localStationOptions = ref([]);
const localInterpolationStatus = ref(props.interpolationStatus);
const localSearchTerm = ref(''); // Search term is now managed locally

// --- Computed Properties ---
// Generate a unique ID for associating file input label and input
const fileInputId = computed(() => `file-input-${Math.random().toString(36).substring(7)}`);
// Dynamic class for the play/pause button
const buttonClass = computed(() => props.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary');
// Counts for filter badges
const selectedRegioCount = computed(() => localRegioOptions.value.filter(o => o.checked).length);
const selectedGemeenteCount = computed(() => localGemeenteOptions.value.filter(o => o.checked).length);
const selectedStationCount = computed(() => localStationOptions.value.filter(o => o.checked).length);
// Filter station list based on local search term for display in the accordion
const filteredStationOptions = computed(() => {
  if (!localSearchTerm.value) return localStationOptions.value;
  const searchTermLower = localSearchTerm.value.toLowerCase();
  return localStationOptions.value.filter(o => o.label.toLowerCase().includes(searchTermLower));
});
// Dynamic text/title for the upload button
const uploadButtonLabel = computed(() => props.isLocalFile ? props.fileName : 'Upload GeoJSON');
const uploadButtonTitle = computed(() => props.isLocalFile ? `Actief: ${props.fileName}` : 'Upload GeoJSON bestand');

// --- Watchers ---
// Sync local interpolation status if prop changes externally
watch(() => props.interpolationStatus, (newVal) => localInterpolationStatus.value = newVal);

// Update local filter options when parent provides new data
watch(() => [props.regioOptions, props.gemeenteOptions, props.stationOptions],
    () => {
      // Use cloneDeep to prevent modifying props and ensure reactivity on 'checked' changes
      localRegioOptions.value = cloneDeep(props.regioOptions);
      localGemeenteOptions.value = cloneDeep(props.gemeenteOptions);
      localStationOptions.value = cloneDeep(props.stationOptions);
    }, { deep: true, immediate: true } // deep watch needed for array of objects, immediate to run on init
);

// --- Event Handlers ---
const onPropertyChange = (event) => emit('property-change', event.target.value);
const onTimeChange = (event) => emit('time-change', parseInt(event.target.value, 10));
const onTimeSliderInteraction = () => { if (props.isPlaying) emit('play-toggle', false); }; // Stop play on manual slider use
const onDateChange = (event) => emit('date-change', event.target.value);
// Optional: If a dedicated clear button is added:
// const clearDateInput = () => {
//   if (dateInputRef.value) dateInputRef.value.value = ''; // Clear visually
//   emit('date-change', ''); // Emit empty string
// };
const onPlayButtonClick = () => emit('play-toggle', !props.isPlaying);
// Emit the complete set of local filter states when any checkbox changes
const onFilterCheckboxChange = () => {
  emit('advanced-filter-change', {
    regio: localRegioOptions.value,
    gemeente: localGemeenteOptions.value,
    station_name: localStationOptions.value,
  });
};
// Handler for the station search input (updates local term for filtering)
const onStationSearchInput = () => {
  // No need to emit here if parent doesn't need live search term
  // Filtering is handled locally by filteredStationOptions computed prop
};
// Handler for when station search input loses focus or value changes (e.g., selection from datalist)
const onStationSearchChange = () => {
  const searchTermLower = localSearchTerm.value.toLowerCase();
  const exactMatch = localStationOptions.value.find(o => o.label.toLowerCase() === searchTermLower);
  // If an exact match is found (likely from datalist selection), emit selection event
  if (exactMatch) {
    emit('station-search-select', exactMatch.label);
  }
};
// Emit interpolation status change based on local v-model
const onInterpolationStatusChange = () => emit('interpolation-change', localInterpolationStatus.value);
// Emit download request with the desired format
const requestDownload = (format) => emit('download-request', format);
// Handle file selection from the hidden input
const handleFileChange = (event) => {
  const file = event.target.files?.[0]; // Use optional chaining
  if (file) {
    // Validate file type/extension
    if (file.type === 'application/geo+json' || file.name.toLowerCase().endsWith('.geojson')) {
      emit('file-upload', file); // Emit the valid File object
    } else {
      // Show error and reset input if invalid
      alert('Ongeldig bestandstype. Selecteer a.u.b. een .geojson bestand.');
      if (fileInputRef.value) fileInputRef.value.value = null;
    }
  }
};
// Handle click on "Back to Server" button
const revertToServer = () => {
  if (fileInputRef.value) fileInputRef.value.value = null; // Reset file input
  emit('clear-local-file'); // Signal parent to clear local file state
};
// Handle click on refresh logo
const onRefreshPage = () => emit('refresh-page');

</script>

<style scoped>
/* Scoped styles specific to ControlPanel */
.control-panel-wrapper {
  /* Adjust max-width as needed */
  width: 380px;
  max-width: 90vw;
}

/* Limit height and enable scrolling for filter option lists */
.filter-options-body {
  max-height: 20vh; /* Adjust as needed */
  overflow-y: auto;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* Smaller font size for form checks inside filters */
.form-check-sm .form-check-label {
  font-size: 0.875rem;
}
.form-check-sm .form-check-input {
  margin-top: 0.2em; /* Adjust vertical alignment */
}

/* Ensure dropdowns don't get hidden */
.dropdown-menu {
  z-index: 1050; /* Ensure it's above map controls */
}

/* Truncate upload button text if needed */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>