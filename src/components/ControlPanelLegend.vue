<template>
  <div> <h4 class="my-2 pt-2 text-center text-primary-emphasis">Luchtkwaliteit filters & legenda <i class="bi bi-funnel"></i></h4>

    <div class="col-md-11 mx-auto form-floating">
      <select
          ref="propertyRef"
          class="form-select form-select-md text-primary fw-semibold text-center shadow-sm"
          id="floatingSelect"
          :value="property"
          @input="emit('update:property', $event.target.value)"
          style="background: white !important;"
      >
        <option class="fw-semibold" value="no2">Stikstofdioxide | N02</option>
        <option class="fw-semibold" value="pm10">Fijnstof 10microm | PM10</option>
        <option class="fw-semibold" value="pm25">Fijnstof 2.5 microm | PM2,5</option>
      </select>
      <label for="floatingSelect">Selecteer een type sensordata</label>
    </div>

    <div class="row px-3 mt-2">
      <div class="col-12">
        <label for="timeSlider">Geselecteerd uur: {{ timeValue }}:00</label>
        <input
            id="timeSlider"
            ref="timeSliderRef"
            class="form-control-range w-100"
            type="range"
            min="0" max="23" step="1"
            :value="timeValue"
            @input="updateLocalTimeValue($event.target.value)"
            @change="emit('update:timeValue', localTimeValue)"
            @mousedown="emit('stopSlider')"
            :title="'Geselecteerd uur: ' + timeValue + ':00'"
        >
      </div>
    </div>

    <div class="row pt-2 px-3">
      <div class="col-md-6">
        <div class="form-floating mb-2 focused-label">
          <input
              type="search"
              list="dayNamesDataList"
              :value="selectedDay"
              @input="emit('update:selectedDay', $event.target.value)"
              @click="clearInputLocal('sDate')"
              class="form-control text-primary fw-semibold rounded shadow-sm"
              id="floatingInput"
              ref="sDateRef"
          >
          <label for="floatingInput">Selecteer een datum</label>
        </div>
        <datalist id="dayNamesDataList"> <option v-for="(dayName, index) in dayNames" :value="dayName" :key="index">{{ dayName }}</option>
        </datalist>
      </div>

      <div class="col-md-6 text-center">
        <button id="playSlider" type="button" class="btn py-2 fw-medium w-100" :class="localButtonClass" @click="emit('togglePlay')">
          <i v-if="isPlaying" class="bi bi-pause-circle-fill"></i>
          <i v-else class="bi bi-google-play"></i>
          {{ isPlaying ? 'Pauzeren' : 'Afspelen' }}
        </button>
      </div>
    </div>


    <p class="text-center">Concentratie {{ formattedProperty }} nk (µg/m³)</p>
    <div class="row px-2 text-center text-light">
      <div class="col-12 col-xl-6 pb-2 fw-medium" v-for="(value, index) in legendaValues" :key="index">
        <div class="rounded" :style="{ backgroundColor: colors[index] }"><span class='Legenda'>{{ value }}</span></div>
      </div>
    </div>
    <div class="row pt-1">
      <h6 class="col"><small class="text-muted">{{ concentrationValues[0] }} Lage concentratie</small></h6>
      <h6 class="col text-end"><small class="text-muted">Hoge concentratie {{ concentrationValues[1] }}</small></h6>
    </div>
    <div class="row d-none d-xl-block">
      <div class="col pt-2 mx-2 border-top border-success-subtle">
        <span v-html="isFrom"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Define Props received from parent
const props = defineProps({
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
  // Below might not be needed if computed props don't rely on them directly anymore
  // propValues: Object,
  // days: Array,
});

// Define Emits to signal changes/actions to parent
const emit = defineEmits([
  'update:property',
  'update:timeValue',
  'update:selectedDay',
  'togglePlay',       // Request parent to toggle play state and start/stop internal slider
  'stopSlider',       // Inform parent slider interaction started (e.g., mousedown)
  'clearDayInput',    // Request parent to clear selectedDay state
]);

// --- Verbatim Moved Refs ---
// Renamed slightly to avoid conflicts if component used multiple times (good practice)
const propertyRef = ref(null);
const timeSliderRef = ref(null);
const sDateRef = ref(null);

// --- Local state for v-model on range slider ---
// Needed because v-model can't be directly tied to a prop
const localTimeValue = ref(props.timeValue);
// Keep local value synced with prop changes
watch(() => props.timeValue, (newValue) => {
  localTimeValue.value = newValue;
});
// Helper function to update local state during input before emitting final change
function updateLocalTimeValue(value) {
  localTimeValue.value = Number(value);
}


// --- Verbatim Moved Computed Property ---
const localButtonClass = computed(() => {
  // Uses isPlaying prop directly
  return props.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary';
});

// --- Verbatim Moved Methods (adapted for emit) ---
// toggleSlider(), startSlider(), stopSlider() - Logic remains in parent, triggered by 'togglePlay' emit

// clearInput method (specific version for sDate)
function clearInputLocal(refName) {
  // This method originally cleared the input's value directly via ref
  // AND updated parent state (selectedDay = '').
  // Here, we only need to signal the parent to clear the state.
  if (refName === 'sDate') {
    // Optionally clear the local input visually if needed, though binding should update it
    // if (sDateRef.value) sDateRef.value.value = '';
    emit('clearDayInput'); // Ask parent to clear the selectedDay state
  }
  // No need to handle other refNames here as this component only has sDate ref needing this action
}

</script>