<template>
  <div> <div class="container bg-white rounded pb-3">
    <ControlPanelHeader
        @reloadPage="$emit('reloadPage')"
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
        @update:property="$emit('update:property', $event)"
        @update:timeValue="$emit('update:timeValue', $event)"
        @update:selectedDay="$emit('update:selectedDay', $event)"
        @togglePlay="$emit('togglePlay')"
        @stopSlider="$emit('stopSlider')"
        @clearDayInput="$emit('clearDayInput')"
    />
  </div>

    <div class="bg-white rounded p-2 mt-2">
      <ControlPanelTabs
          :regio="regio"
          :Gemeente="Gemeente"
          :station_name="station_name"
          :search="search"
          :isLocalFile="isLocalFile"
          :fileName="fileName"
          :interpolationStatus="interpolationStatus"
          :geojson="geojson"
          :property="property"
          @updateFilter="$emit('updateFilter', $event)"
          @update:search="$emit('update:search', $event)"
          @selectMatchingStations="$emit('selectMatchingStations', $event)"
          @update:interpolationStatus="$emit('update:interpolationStatus', $event)"
          @downloadGeoJSON="$emit('downloadGeoJSON')"
          @downloadCSV="$emit('downloadCSV')"
          @clearLocalFile="$emit('clearLocalFile')"
          @fileUploaded="$emit('fileUploaded', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import ControlPanelHeader from './ControlPanelHeader.vue';
import ControlPanelTabs from './ControlPanelTabs.vue';

// Define ALL props that need to be passed down through this component
// REMOVED propValues and days
defineProps({
  // Props for ControlPanelHeader -> ControlPanelLegend
  property: String,
  timeValue: Number,
  selectedDay: String,
  dayNames: Array,
  isPlaying: Boolean,
  formattedProperty: String,
  legendaValues: Array,
  colors: Array,
  concentrationValues: Array,
  isFrom: String,
  // propValues: Object, // Removed
  // days: Array, // Removed
  geojson: Object, // Still needed for download actions passed through Tabs->Files

  // Props for ControlPanelTabs -> ControlPanelFilters
  regio: Array,
  Gemeente: Array,
  station_name: Array,
  search: String,
  // Props for ControlPanelTabs -> ControlPanelFiles
  isLocalFile: Boolean,
  fileName: String,
  // Props for ControlPanelTabs -> ControlPanelAnalysis
  interpolationStatus: String,
});

// Define ALL events that need to bubble up through this component
defineEmits([
  // Events from ControlPanelHeader / ControlPanelLegend
  'reloadPage',
  'update:property',
  'update:timeValue',
  'update:selectedDay',
  'togglePlay',
  'stopSlider',
  'clearDayInput',
  // Events from ControlPanelTabs / ControlPanelFilters
  'updateFilter',
  'update:search',
  'selectMatchingStations',
  // Events from ControlPanelTabs / ControlPanelAnalysis
  'update:interpolationStatus',
  // Events from ControlPanelTabs / ControlPanelFiles
  'downloadGeoJSON',
  'downloadCSV',
  'clearLocalFile',
  'fileUploaded',
]);

// No internal script logic moved here
</script>