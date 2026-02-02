<template>
  <!-- Container for filtering and tools -->
  <div class="bg-white rounded p-2 mt-2">
    <!-- Tab navigation. Using Bootstrap's data attributes for tab control while
         still maintaining semantic roles and accessibility properties. -->
    <nav>
      <div class="nav nav-tabs" role="tablist">
        <button
            class="nav-link fw-semibold"
            id="nav-filter-tab"
            data-bs-toggle="tab"
            data-bs-target="#nav-filter"
            type="button"
            role="tab"
            aria-controls="nav-filter"
            :aria-selected="true"
        >Gegevens filteren</button>
        <button
            class="nav-link fw-semibold"
            id="nav-wms-tab"
            data-bs-toggle="tab"
            data-bs-target="#nav-wms"
            type="button"
            role="tab"
            aria-controls="nav-wms"
            :aria-selected="false"
        >Analysis tools</button>
        <button
            class="nav-link fw-semibold"
            id="nav-bestanden-tab"
            data-bs-toggle="tab"
            data-bs-target="#nav-bestanden"
            type="button"
            role="tab"
            aria-controls="nav-bestanden"
            :aria-selected="false"
        >Bestandenbeheer</button>
      </div>
    </nav>
    <div class="tab-content">
      <!-- Filter pane -->
      <div
          class="tab-pane fade show active"
          id="nav-filter"
          role="tabpanel"
          aria-labelledby="nav-filter-tab"
          tabindex="0"
      >
        <h3 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">
          Filteren van stations
        </h3>
        <div class="row p-2">
          <!-- Accordion for filters -->
          <div class="accordion accordion-flush" id="uniqueAccordionExample">
            <!-- Regio filter -->
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingOne">
                <button
                    class="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#uniqueCollapseOne"
                    aria-expanded="false"
                    aria-controls="uniqueCollapseOne"
                >
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Regio</span>
                  <span :class="getBadgeClass(props.regio)">
                    {{ regioBadge }}
                  </span>
                </button>
              </h2>
              <div
                  id="uniqueCollapseOne"
                  class="accordion-collapse collapse"
                  aria-labelledby="uniqueHeadingOne"
                  data-bs-parent="#uniqueAccordionExample"
              >
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div
                      v-for="checkbox in props.regio"
                      :key="checkbox.id"
                      class="form-check"
                  >
                    <input
                        type="checkbox"
                        :id="checkbox.id"
                        :value="checkbox.id"
                        name="regio"
                        v-model="checkbox.checked"
                        @input="emitUpdateLayer"
                        class="form-check-input"
                    />
                    <label :for="checkbox.id" class="form-check-label">
                      {{ checkbox.label }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <!-- Gemeente filter -->
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingTwo">
                <button
                    class="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#uniqueCollapseTwo"
                    aria-expanded="false"
                    aria-controls="uniqueCollapseTwo"
                >
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Gemeente</span>
                  <span :class="getBadgeClass(props.gemeente)">
                    {{ gemeenteBadge }}
                  </span>
                </button>
              </h2>
              <div
                  id="uniqueCollapseTwo"
                  class="accordion-collapse collapse"
                  aria-labelledby="uniqueHeadingTwo"
                  data-bs-parent="#uniqueAccordionExample"
              >
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div
                      v-for="checkbox in props.gemeente"
                      :key="checkbox.id"
                      class="form-check"
                  >
                    <input
                        type="checkbox"
                        :id="checkbox.id"
                        :value="checkbox.id"
                        name="Gemeente"
                        v-model="checkbox.checked"
                        @input="emitUpdateLayer"
                        class="form-check-input"
                    />
                    <label :for="checkbox.id" class="form-check-label">
                      {{ checkbox.label }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <!-- Station filter -->
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingThree">
                <button
                    class="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#uniqueCollapseThree"
                    aria-expanded="false"
                    aria-controls="uniqueCollapseThree"
                >
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Station</span>
                  <span :class="getBadgeClass(props.stationName)">
                    {{ stationBadge }}
                  </span>
                </button>
              </h2>
              <div
                  id="uniqueCollapseThree"
                  class="accordion-collapse collapse"
                  aria-labelledby="uniqueHeadingThree"
                  data-bs-parent="#uniqueAccordionExample"
              >
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <!-- Search input for station names -->
                  <div class="form-floating mb-2 focused-label">
                    <input
                        type="search"
                        :value="searchValue"
                        class="form-control text-primary rounded shadow-sm"
                        @input="onSearchInput"
                        list="stations"
                        id="floatingSearch"
                        placeholder=" "
                        aria-label="Zoek naar een station"
                    />
                    <label for="floatingSearch">Zoeken naar een station</label>
                  </div>
                  <datalist id="stations">
                    <option
                        v-for="checkbox in props.stationName"
                        :key="checkbox.id"
                        :value="checkbox.label"
                    ></option>
                  </datalist>
                  <div
                      v-for="checkbox in props.stationName"
                      :key="checkbox.id"
                      class="form-check"
                  >
                    <input
                        type="checkbox"
                        :id="checkbox.id"
                        :value="checkbox.id"
                        name="station_name"
                        v-model="checkbox.checked"
                        @input="emitUpdateLayer"
                        class="form-check-input"
                    />
                    <label :for="checkbox.id" class="form-check-label">
                      {{ checkbox.label }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Files pane -->
      <section
          id="nav-bestanden"
          class="tab-pane fade"
          role="tabpanel"
          aria-labelledby="nav-bestanden-tab"
          tabindex="0"
      >
        <div class="container p-2">
          <!-- Header and description -->
          <header class="text-center mb-2">
            <h4 class="pb-2 border-bottom border-primary fw-semibold text-primary">
              Dashboardgegevens downloaden & uploaden
            </h4>
          </header>
          <article>
            <h5 class="text-start fw-medium text-primary-emphasis pb-2">
              Visualisatie en Analyse van GeoJSON-gegevens
            </h5>
            <p class="text-start text-primary-emphasis">
              Bij het uploaden van een GeoJSON-bestand faciliteert het dashboard een platform voor de visualisatie van de ingesloten gegevens. Deze bestanden bevatten cruciale informatie die nodig is voor gedetailleerde analyse en visualisatie. Het dashboard fungeert als een effectief instrument voor het interpreteren en begrijpen van deze gegevens.
            </p>
          </article>
          <!-- File upload/download section -->
          <div class="row mb-2">
            <div class="col-12 col-xl-6">
              <div class="dropdown mt-3 w-100">
                <button
                    class="btn py-2 px-3 w-100 fw-medium"
                    :class="isLocalFile ? 'btn-danger' : 'btn-primary dropdown-toggle'"
                    type="button"
                    id="dropdownMenuButton1"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    v-if="!isLocalFile"
                >
                  Local Bestand | Downloaden
                </button>
                <button
                    v-else
                    class="btn btn-danger py-2 px-3 w-100 fw-medium"
                    type="button"
                    @click="emit('clear-input', 'localFile')"
                >
                  ← Terug naar server
                </button>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                  <li>
                    <a class="dropdown-item" href="#" @click.prevent="emit('download-geojson')">
                      GeoJSON
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" href="#" @click.prevent="emit('download-csv')">
                      CSV
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div class="col-12 col-xl-6">
              <div class="input-group mt-3 w-100">
                <label
                    for="inputGroupFile04"
                    class="btn custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate"
                    style="max-width: 100%;"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    :title="isLocalFile ? fileName : 'Uploaden | Geojson bestand'"
                >
                  {{ isLocalFile ? fileName : 'Uploaden | Geojson bestand' }}
                </label>
                <input
                    type="file"
                    id="inputGroupFile04"
                    aria-label="Upload"
                    ref="localFileRef"
                    @change="emitUpdateLayer"
                    class="py-2 px-3 w-100"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <!-- WMS/Interpolation pane -->
      <div
          class="tab-pane fade"
          id="nav-wms"
          role="tabpanel"
          aria-labelledby="nav-wms-tab"
          tabindex="0"
      >
        <div class="row p-2">
          <div class="col text-center">
            <h3 class="pb-2 text-primary border-bottom border-primary">IDW interpolatie</h3>
            <div class="row my-3">
              <div class="col-10 text-start">
                De ‘IDW Interpolatie’ is een krachtige functie die luchtkwaliteitswaarden op ongemeten locaties voorspelt, waarbij meetpunten in de nabijheid een grotere invloed hebben. Met de ‘Verbergen’ en ‘Weergeven op kaart’ opties kunt u de zichtbaarheid van deze voorspelde waarden op de kaart beheren.
                <br /><br />Houd er rekening mee dat er bij het eerste gebruik een kleine vertraging kan optreden, maar bij latere toepassingen wordt de interpolatie vloeiend weergegeven. De nauwkeurigheid van de voorspellingen is afhankelijk van de kwaliteit en spreiding van de meetpunten.
              </div>
              <div class="col">
                <!-- Static interpolation legend image. Consider exposing this image as a prop if it may change -->
                <img
                    :src="require('@/assets/interpolatie-legenda.png')"
                    alt="Interpolatie legenda"
                    class="img-fluid rounded w-auto h-75"
                />
              </div>
              <div class="btn-group btn-group-sm mt-2" role="group" aria-label="Interpolatie bediening">
                <input
                    type="radio"
                    class="btn-check"
                    name="interpolationOptions"
                    value="disable"
                    id="disable"
                    autocomplete="off"
                    :checked="interpolationValue === 'disable'"
                    @change="onInterpolationChange('disable')"
                />
                <label class="btn btn-outline-danger" for="disable">Verbergen</label>
                <input
                    type="radio"
                    class="btn-check"
                    name="interpolationOptions"
                    value="activate"
                    id="activate"
                    autocomplete="off"
                    :checked="interpolationValue === 'activate'"
                    @change="onInterpolationChange('activate')"
                />
                <label class="btn btn-outline-primary" for="activate">Weergeven op kaart</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits } from 'vue';

/**
 * Represents a single checkbox option (e.g. regio, gemeente, station). Each
 * option holds its identifier, display label and checked state.
 */
interface OptionItem {
  id: string;
  label: string;
  checked: boolean;
}

// Define component props with full type information. This allows consumers
// of the component to see what data they must provide and enables better
// intellisense in editors.
const props = defineProps<{
  regio: OptionItem[];
  gemeente: OptionItem[];
  stationName: OptionItem[];
  search: string;
  interpolationStatus: string;
  isLocalFile: boolean;
  fileName: string;
}>();

// Define custom events emitted by this component. Using defineEmits makes
// event signatures explicit and helps catch typos when emitting events.
const emit = defineEmits<{
  (e: 'update-layer'): void;
  (e: 'select-matching-stations'): void;
  (e: 'update:search', value: string): void;
  (e: 'update:interpolationStatus', value: string): void;
  (e: 'clear-input', refName: string): void;
  (e: 'download-geojson'): void;
  (e: 'download-csv'): void;
}>();

/**
 * Reactive search field value. We mirror the incoming prop value so that
 * local edits do not immediately mutate the parent. Changes to searchValue
 * trigger the appropriate events to update the parent state.
 */
const searchValue = ref(props.search);

// Keep local search in sync with the prop if it changes from the parent.
watch(
    () => props.search,
    (val) => {
      searchValue.value = val;
    },
);

// When the user types in the search box, emit updates to the parent and
// request selection filtering. A small debounce could be added here if
// performance becomes an issue.
watch(
    searchValue,
    (val) => {
      emit('update:search', val);
      emit('select-matching-stations');
    },
);

/**
 * Reactive value for the interpolation status radio group. We mirror the
 * incoming prop and emit updates whenever the user changes the selection.
 */
const interpolationValue = ref(props.interpolationStatus);

// Keep local interpolation status in sync with the prop.
watch(
    () => props.interpolationStatus,
    (val) => {
      interpolationValue.value = val;
    },
);

// Whenever the local interpolation status changes, propagate the change and
// request the layer to be reloaded.
watch(
    interpolationValue,
    (val) => {
      emit('update:interpolationStatus', val);
      emit('update-layer');
    },
);

/**
 * Computed badge labels for each filter category. Returns the count of
 * options or a placeholder when no data is available.
 */
const regioBadge = computed(() =>
    props.regio.length > 0 ? props.regio.length.toString() : 'Geen gegevens',
);
const gemeenteBadge = computed(() =>
    props.gemeente.length > 0 ? props.gemeente.length.toString() : 'Geen gegevens',
);
const stationBadge = computed(() =>
    props.stationName.length > 0 ? props.stationName.length.toString() : 'Geen gegevens',
);

/**
 * Utility to determine the badge CSS class based on the length of the list.
 */
function getBadgeClass(list: OptionItem[]) {
  return list.length === 0
      ? 'badge rounded-pill bg-danger'
      : 'badge rounded-pill bg-primary';
}

/**
 * Handler for search input. Updates the local search value. Could be replaced
 * with v-model on the input but using an explicit handler improves testability.
 */
function onSearchInput(event: Event): void {
  searchValue.value = (event.target as HTMLInputElement).value;
}

/**
 * Handler for radio button changes in the interpolation section. Update the
 * local interpolation value which will cascade through watchers.
 */
function onInterpolationChange(value: string): void {
  interpolationValue.value = value;
}

/**
 * Emit the update-layer event. This helper avoids creating an inline
 * anonymous function on every checkbox. It improves performance and
 * readability by centralising the emit logic.
 */
function emitUpdateLayer(): void {
  emit('update-layer');
}

/**
 * Provide a ref for the local file input. The parent can reset this input
 * via the clear-input event.
 */
const localFileRef = ref<HTMLInputElement | null>(null);
</script>

<style scoped>
/* Minimal component styles. In a larger application consider extracting
   common styles into a separate stylesheet or using utility classes. */
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
</style>