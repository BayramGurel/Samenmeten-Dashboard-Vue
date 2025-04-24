<template>
  <div> <div class="row mb-2">
    <div class="col-12">
      <img :src="require('@/assets/PZH-logo.png')" class="img-fluid rounded d-block" title="Refresh website" @click="reloadPage" style="max-width: 70%">
      <h4 class=" text-center text-primary-emphasis m-2">Dashboard voor Luchtkwaliteitsmetingen</h4>
    </div>
  </div>
    <nav>
      <div class="nav nav-tabs" role="tablist">
        <button class="nav-link active fw-semibold" id="nav-leganda-tab" data-bs-toggle="tab" data-bs-target="#nav-leganda-cp-header" type="button" role="tab" aria-controls="nav-leganda-cp-header" aria-selected="true">Legenda voor Luchtkwaliteit </button> <button class="nav-link fw-semibold" id="nav-contact-tab" data-bs-toggle="tab" data-bs-target="#nav-contact-cp-header" type="button" role="tab" aria-controls="nav-contact-cp-header" aria-selected="false">Contactgegevens</button> </div>
    </nav>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="nav-leganda-cp-header" role="tabpanel" aria-labelledby="nav-leganda-tab" tabindex="0"> <ControlPanelLegend
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
      <div class="tab-pane fade" id="nav-contact-cp-header" role="tabpanel" aria-labelledby="nav-contact-tab" tabindex="0"> <ControlPanelContact />
      </div>
    </div>
  </div>
</template>

<script setup>
import ControlPanelLegend from './ControlPanelLegend.vue';
import ControlPanelContact from './ControlPanelContact.vue';

// Define props passed down from ControlPanel
// REMOVED propValues and days
defineProps({
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
});

// Define events bubbling up from children OR emitted directly ('reloadPage')
const emit = defineEmits([
  'reloadPage',
  'update:property',
  'update:timeValue',
  'update:selectedDay',
  'togglePlay',
  'stopSlider',
  'clearDayInput',
]);

// --- Verbatim Moved Method (adapted to emit) ---
function reloadPage() {
  emit('reloadPage');
}
</script>