<template>
  <div> <nav>
    <div class="nav nav-tabs" role="tablist">
      <button class="nav-link active fw-semibold" id="nav-filter-tab-lower" data-bs-toggle="tab" data-bs-target="#nav-filter-lower" type="button" role="tab" aria-controls="nav-filter-lower" aria-selected="true">Gegevens filteren</button>
      <button class="nav-link fw-semibold" id="nav-wms-tab-lower" data-bs-toggle="tab" data-bs-target="#nav-wms-lower" type="button" role="tab" aria-controls="nav-wms-lower" aria-selected="false">Analysis tools</button>
      <button class="nav-link fw-semibold" id="nav-bestanden-tab-lower" data-bs-toggle="tab" data-bs-target="#nav-bestanden-lower" type="button" role="tab" aria-controls="nav-bestanden-lower" aria-selected="false">Bestandenbeheer</button>
    </div>
  </nav>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="nav-filter-lower" role="tabpanel" aria-labelledby="nav-filter-tab-lower" tabindex="0"> <ControlPanelFilters
          :regio="regio"
          :Gemeente="Gemeente"
          :station_name="station_name"
          :search="search"
          @updateFilter="$emit('updateFilter', $event)"
          @update:search="$emit('update:search', $event)"
          @selectMatchingStations="$emit('selectMatchingStations', $event)"
      />
      </div>
      <div class="tab-pane fade" id="nav-wms-lower" role="tabpanel" aria-labelledby="nav-wms-tab-lower" tabindex="0"> <ControlPanelAnalysis
          :interpolationStatus="interpolationStatus"
          @update:interpolationStatus="$emit('update:interpolationStatus', $event)"
      />
      </div>
      <div class="tab-pane fade" id="nav-bestanden-lower" role="tabpanel" aria-labelledby="nav-bestanden-tab-lower" tabindex="0"> <ControlPanelFiles
          :isLocalFile="isLocalFile"
          :fileName="fileName"
          :geojson="geojson"
          :property="property"
          @downloadGeoJSON="$emit('downloadGeoJSON')"
          @downloadCSV="$emit('downloadCSV')"
          @clearLocalFile="$emit('clearLocalFile')"
          @fileUploaded="$emit('fileUploaded', $event)"
      />
      </div>
    </div>
  </div>
</template>

<script setup>
// Import necessary child components
import ControlPanelFilters from './ControlPanelFilters.vue';
import ControlPanelAnalysis from './ControlPanelAnalysis.vue';
import ControlPanelFiles from './ControlPanelFiles.vue'; // Assume this will be the next component

// Define ALL props passed down from ControlPanel parent
defineProps({
  // Props for Filters
  regio: Array,
  Gemeente: Array,
  station_name: Array,
  search: String,
  // Props for Analysis
  interpolationStatus: String,
  // Props for Files
  isLocalFile: Boolean,
  fileName: String,
  geojson: Object, // Needed for download action eventually passed up
  property: String, // Needed for download action eventually passed up
});

// Define ALL events bubbling up from children
defineEmits([
  // Events from Filters
  'updateFilter',
  'update:search',
  'selectMatchingStations',
  // Events from Analysis
  'update:interpolationStatus',
  // Events from Files
  'downloadGeoJSON',
  'downloadCSV',
  'clearLocalFile',
  'fileUploaded',
]);

// No internal script logic moved here
</script>

<style scoped>
/* Verbatim styles specific to the lower nav tabs structure, if any */
.nav-tabs .nav-link { /* Example - copy original */
  /* ... */
}
</style>