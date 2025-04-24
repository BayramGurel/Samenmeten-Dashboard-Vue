<template>
  <section id="nav-bestanden" class="tab-pane fade" role="tabpanel" aria-labelledby="nav-bestanden-tab-lower" tabindex="0"> <div class="container p-2">
    <header class="text-center mb-2">
      <h4 class="pb-2 border-bottom border-primary fw-semibold text-primary">Dashboardgegevens downloaden & uploaden</h4>
    </header>
    <article>
      <h5 class="text-start fw-medium text-primary-emphasis pb-2">Visualisatie en Analyse van GeoJSON-gegevens </h5>
      <p class="text-start text-primary-emphasis">Bij het uploaden van een GeoJSON-bestand faciliteert het dashboard een platform voor de visualisatie van de ingesloten gegevens. Deze bestanden bevatten cruciale informatie die nodig is voor gedetailleerde analyse en visualisatie. Het dashboard fungeert als een effectief instrument voor het interpreteren en begrijpen van deze gegevens.</p>
    </article>
    <div class="row mb-2">
      <div class="col-12 col-xl-6">
        <div class="dropdown mt-3 w-100">
          <button class="btn btn-primary dropdown-toggle py-2 px-3 w-100 fw-medium" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false" v-if="!isLocalFile">
            Local Bestand | Downloaden
          </button>
          <button class="btn btn-danger py-2 px-3 w-100 fw-medium" type="button" v-else @click="clearInputLocal('localFile')">
            ← Terug naar server
          </button>
          <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
            <li><a class="dropdown-item" href="#" @click.prevent="emit('downloadGeoJSON')">GeoJSON</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="emit('downloadCSV')">CSV</a></li>
          </ul>
        </div>
      </div>
      <div class="col-12 col-xl-6 text-end">
        <div class="input-group mt-3 text-white w-100">
          <label for="inputGroupFile04-cp-files" class="btn custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate" style="max-width: 100%;" data-bs-toggle="tooltip" data-bs-placement="right" :title="isLocalFile ? fileName : 'Uploaden | Geojson bestand'">{{ isLocalFile ? fileName : 'Uploaden | Geojson bestand' }}</label>
          <input
              type="file"
              id="inputGroupFile04-cp-files" aria-describedby="inputGroupFileAddon04"
              aria-label="Upload"
              ref="localFileRef"
              @input="handleFileInput($event)"
              class="py-2 px-3 w-100"
              accept=".geojson,application/json" >
        </div>
      </div>
    </div>
  </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

// Define Props
defineProps({
  isLocalFile: Boolean,
  fileName: String,
  // Props needed for download actions (passed up eventually)
  // geojson: Object,
  // property: String,
});

// Define Emits
const emit = defineEmits([
  'downloadGeoJSON',
  'downloadCSV',
  'clearLocalFile', // Emitted when 'Terug naar server' is clicked
  'fileUploaded'    // Emits the File object when a file is selected
]);

// --- Verbatim Moved Refs ---
// Renamed slightly for clarity
const localFileRef = ref(null);

// --- Verbatim Moved Methods (adapted for emit) ---
// Method 'clearInput' specific for 'localFile' ref
function clearInputLocal(refName) {
  if (refName === 'localFile') {
    // Clear the file input visually
    if (localFileRef.value) {
      localFileRef.value.value = ''; // Reset file input
    }
    // Emit event for parent to handle state clearing and data reload
    emit('clearLocalFile');
  }
  // No need to handle other refNames as this is specific to this component
}

// Handle file input change
function handleFileInput(event) {
  const file = event.target.files ? event.target.files[0] : null;
  // Emit the file object (or null if cleared)
  // Parent handler (handleFileUploaded) will read and process the file
  emit('fileUploaded', file);
}
</script>