<template>
  <div> <h3 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">Filteren van stations</h3>
    <div class="row p-2">
      <div class="accordion accordion-flush" id="uniqueAccordionExample">
        <div class="accordion-item">
          <h2 class="accordion-header" id="uniqueHeadingOne">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseOne" aria-expanded="false" aria-controls="uniqueCollapseOne">
              <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Regio</span>
              <span :class="{'badge rounded-pill bg-danger': regio.length === 0, 'badge rounded-pill bg-primary': regio.length > 0}">
                {{ regio.length > 0 ? regio.length : 'Geen gegevens' }}
              </span>
            </button>
          </h2>
          <div id="uniqueCollapseOne" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingOne" data-bs-parent="#uniqueAccordionExample">
            <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
              <div v-for="checkbox in regio" :key="checkbox.id" class="form-check">
                <input
                    type="checkbox"
                    :id="checkbox.id + '-regio-filter'" :value="checkbox.id"
                    :name="'regio'"
                    :checked="checkbox.checked"
                    @input="emitUpdateFilter('regio', checkbox.id, $event.target.checked)"
                    class="form-check-input"
                >
                <label :for="checkbox.id + '-regio-filter'" class="form-check-label">{{ checkbox.label }}</label>
              </div>
            </div>
          </div>
        </div>
        <div class="accordion-item">
          <h2 class="accordion-header" id="uniqueHeadingTwo">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseTwo" aria-expanded="false" aria-controls="uniqueCollapseTwo">
              <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Gemeente</span>
              <span :class="{'badge rounded-pill bg-danger': Gemeente.length === 0, 'badge rounded-pill bg-primary': Gemeente.length > 0}">
                {{ Gemeente.length > 0 ? Gemeente.length : 'Geen gegevens' }}
              </span>
            </button>
          </h2>
          <div id="uniqueCollapseTwo" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingTwo" data-bs-parent="#uniqueAccordionExample">
            <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
              <div v-for="checkbox in Gemeente" :key="checkbox.id" class="form-check">
                <input
                    type="checkbox"
                    :id="checkbox.id + '-gemeente-filter'" :value="checkbox.id"
                    :name="'Gemeente'"
                    :checked="checkbox.checked"
                    @input="emitUpdateFilter('Gemeente', checkbox.id, $event.target.checked)"
                    class="form-check-input"
                >
                <label :for="checkbox.id + '-gemeente-filter'" class="form-check-label">{{ checkbox.label }}</label>
              </div>
            </div>
          </div>
        </div>
        <div class="accordion-item">
          <h2 class="accordion-header" id="uniqueHeadingThree">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseThree" aria-expanded="false" aria-controls="uniqueCollapseThree">
              <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Station</span>
              <span :class="{'badge rounded-pill bg-danger': station_name.length === 0, 'badge rounded-pill bg-primary': station_name.length > 0}">
                {{ station_name.length > 0 ? station_name.length : 'Geen gegevens' }}
              </span>
            </button>
          </h2>
          <div id="uniqueCollapseThree" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingThree" data-bs-parent="#uniqueAccordionExample">
            <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
              <div class="form-floating mb-2 focused-label">
                <input
                    type="search"
                    :value="search"
                    @input="handleSearchInput($event.target.value)"
                    ref="searchInputRef"
                    class="form-control text-primary rounded shadow-sm"
                    list="stationsDataList" id="stationSearchInput"
                    placeholder=" "
                >
                <label for="stationSearchInput">Zoeken naar een station</label>
              </div>
              <datalist id="stationsDataList"> <option v-for="checkbox in station_name" :key="checkbox.id + '-opt'" :value="checkbox.label"></option>
              </datalist>
              <div v-for="checkbox in station_name" :key="checkbox.id" class="form-check">
                <input
                    type="checkbox"
                    :id="checkbox.id + '-station-filter'" :value="checkbox.id"
                    :name="'station_name'"
                    :checked="checkbox.checked"
                    @input="emitUpdateFilter('station_name', checkbox.id, $event.target.checked)"
                    class="form-check-input"
                >
                <label :for="checkbox.id + '-station-filter'" class="form-check-label">{{ checkbox.label }}</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Define Props
const props = defineProps({
  regio: Array,
  Gemeente: Array,
  station_name: Array,
  search: String,
});

// Define Emits
const emit = defineEmits([
  'updateFilter',         // { type: 'regio'|'Gemeente'|'station_name', id: any, checked: boolean }
  'update:search',        // string
  'selectMatchingStations'// string (search term)
]);

// --- Verbatim Moved Refs ---
// Renamed slightly for clarity
const searchInputRef = ref(null);

// --- Verbatim Moved Methods (adapted for emit) ---
// async removed as not needed
function selectMatchingStationsLocal() {
  // This method originally modified parent state directly and called updateLayer.
  // Now it only emits an event asking the parent to perform the action.
  // It uses the current search term from props.
  emit('selectMatchingStations', props.search);
}

// Helper method for checkbox emits
function emitUpdateFilter(type, id, checked) {
  emit('updateFilter', { type, id, checked });
}

// Handler for search input to update parent state and trigger matching logic
function handleSearchInput(value) {
  emit('update:search', value);
  // Call the local method that emits the action request
  selectMatchingStationsLocal();
}

</script>