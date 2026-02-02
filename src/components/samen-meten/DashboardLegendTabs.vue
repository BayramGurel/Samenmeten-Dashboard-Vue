<template>
  <!-- Top bar with logo and title -->
  <div class="container bg-white rounded pb-3">
    <div class="row mb-2">
      <div class="col-12 text-center">
        <!-- Province logo refreshes the dashboard on click -->
        <img
            :src="logoSrc"
            alt="Provincie Zuid-Holland logo"
            class="img-fluid rounded d-block mx-auto"
            title="Refresh website"
            @click="emit('reload-page')"
            style="max-width: 70%; cursor: pointer;"
        />
        <h4 class="text-center text-primary-emphasis m-2">
          Dashboard voor Luchtkwaliteitsmetingen
        </h4>
      </div>
    </div>
    <!-- Tab navigation -->
    <nav>
      <div class="nav nav-tabs" role="tablist">
        <button
            class="nav-link active fw-semibold"
            id="nav-legenda-tab"
            data-bs-toggle="tab"
            data-bs-target="#nav-legenda"
            type="button"
            role="tab"
            aria-controls="nav-legenda"
            aria-selected="true"
        >
          Legenda voor Luchtkwaliteit
        </button>
        <button
            class="nav-link fw-semibold"
            id="nav-contact-tab"
            data-bs-toggle="tab"
            data-bs-target="#nav-contact"
            type="button"
            role="tab"
            aria-controls="nav-contact"
            aria-selected="false"
        >
          Contactgegevens
        </button>
      </div>
    </nav>
    <!-- Tab panes -->
    <div class="tab-content">
      <!-- Legend & filters tab -->
      <div
          class="tab-pane fade show active"
          id="nav-legenda"
          role="tabpanel"
          aria-labelledby="nav-legenda-tab"
          tabindex="0"
      >
        <h4 class="my-2 pt-2 text-center text-primary-emphasis">
          Luchtkwaliteit filters & legenda
          <i class="bi bi-funnel"></i>
        </h4>
        <!-- Sensor type selection -->
        <div class="col-md-11 mx-auto form-floating">
          <select
              ref="propertyRef"
              class="form-select form-select-md text-primary fw-semibold text-center shadow-sm"
              id="floatingSelect"
              style="background: white !important;"
              @input="emitUpdateLayer"
          >
            <option class="fw-semibold" value="no2">Stikstofdioxide | NO₂</option>
            <option class="fw-semibold" value="pm10">Fijnstof 10 µm | PM10</option>
            <option class="fw-semibold" value="pm25" selected>Fijnstof 2.5 µm | PM2,5</option>
          </select>
          <label for="floatingSelect">Selecteer een type sensordata</label>
        </div>
        <!-- Time slider -->
        <div class="row px-3 mt-2">
          <div class="col-12">
            <label for="timeSlider">Geselecteerd uur: {{ timeValueLocal }}:00</label>
            <input
                id="timeSlider"
                ref="timeSliderRef"
                class="form-control-range w-100"
                type="range"
                min="0"
                max="23"
                step="1"
                :value="timeValueLocal"
                aria-label="Selecteer uur"
                @input="onTimeInput"
                @change="emitUpdateLayer"
                @mousedown="() => emit('stop-slider')"
                :title="`Geselecteerd uur: ${timeValueLocal}:00`"
            />
          </div>
        </div>
        <!-- Day selector and play/pause button -->
        <div class="row pt-2 px-3">
          <div class="col-md-6">
            <div class="form-floating mb-2 focused-label">
              <input
                  type="search"
                  list="dayNames"
                  :value="selectedDayLocal"
                  class="form-control text-primary fw-semibold rounded shadow-sm"
                  @input="onDayInput"
                  @click="() => emit('clear-input', 'sDate')"
                  id="floatingDayInput"
                  ref="sDateRef"
              />
              <label for="floatingDayInput">Selecteer een datum</label>
            </div>
            <datalist id="dayNames">
              <option v-for="(dayName, index) in props.dayNames" :value="dayName" :key="index">
                {{ dayName }}
              </option>
            </datalist>
          </div>
          <!-- Play/Pause -->
          <div class="col-md-6 text-center">
            <button
                id="playSlider"
                type="button"
                class="btn py-2 fw-medium w-100"
                :class="props.buttonClass"
                @click="() => emit('toggle-slider')"
            >
              <i :class="playIconClass"></i>
              {{ playButtonText }}
            </button>
          </div>
        </div>
        <!-- Legend information -->
        <p class="text-center">
          Concentratie {{ props.formattedProperty }} nk (µg/m³)
        </p>
        <div class="row px-2 text-center text-light">
          <div
              class="col-12 col-xl-6 pb-2 fw-medium"
              v-for="(value, index) in props.legendaValues"
              :key="index"
          >
            <div class="rounded" :style="{ backgroundColor: props.colors[index] }">
              <span class="Legenda">{{ value }}</span>
            </div>
          </div>
        </div>
        <div class="row pt-1">
          <h6 class="col">
            <small class="text-muted">
              {{ props.concentrationValues[0] }} Lage concentratie
            </small>
          </h6>
          <h6 class="col text-end">
            <small class="text-muted">
              Hoge concentratie {{ props.concentrationValues[1] }}
            </small>
          </h6>
        </div>
        <!-- Data source information -->
        <div class="row d-none d-xl-block">
          <div class="col pt-2 mx-2 border-top border-success-subtle">
            <!-- Note: isFrom contains trusted HTML. Ensure it is sanitized before use. -->
            <span v-html="props.isFrom"></span>
          </div>
        </div>
      </div>
      <!-- Contact tab -->
      <div
          class="tab-pane fade"
          id="nav-contact"
          role="tabpanel"
          aria-labelledby="nav-contact-tab"
          tabindex="0"
      >
        <div class="row p-2">
          <div class="card">
            <div class="card-body">
              <h3 class="card-title text-center text-success border-bottom pb-2">
                Contactgegevens
              </h3>
              <dl class="row">
                <dt class="col-sm-3 fw-bold text-success">Team</dt>
                <dd class="col-sm-9">
                  Het Team Geo van de Provincie Zuid-Holland is verantwoordelijk voor het beheer en de toepassing van geografische informatie en technologie.
                </dd>
                <dt class="col-sm-3 fw-bold text-success">Contact</dt>
                <dd class="col-sm-9">
                  Voor technische ondersteuning of feedback over de applicatie, kunt u contact opnemen via:
                  <a
                      href="mailto:teamgeo@pzh.nl"
                      class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold"
                  >
                    teamgeo@pzh.nl
                  </a>
                </dd>
                <dt class="col-sm-3 fw-bold text-success">Postadres</dt>
                <dd class="col-sm-9">
                  Provincie Zuid-Holland Contact Centrum
                  <br />
                  Postbus 90602 - 2509 LP Den Haag
                </dd>
              </dl>
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
 * Props accepted by the DashboardLegendTabs component. Each prop is typed to
 * improve maintainability and developer experience. The component does not
 * modify incoming props directly but instead uses local refs when needed.
 */
const props = defineProps<{
  timeValue: number | string;
  selectedDay: string;
  dayNames: string[];
  isPlaying: boolean;
  buttonClass: string;
  formattedProperty: string;
  legendaValues: (string | number)[];
  colors: string[];
  concentrationValues: (string | number)[];
  isFrom: string;
}>();

/**
 * Events emitted by this component. Explicitly defining the events helps
 * catch typos and offers autocompletion in editors.
 */
const emit = defineEmits<{
  (e: 'reload-page'): void;
  (e: 'update-layer'): void;
  (e: 'stop-slider'): void;
  (e: 'toggle-slider'): void;
  (e: 'clear-input', field: string): void;
  (e: 'update:timeValue', value: number | string): void;
  (e: 'update:selectedDay', value: string): void;
}>();

/**
 * Local reactive copy of timeValue. This prevents direct prop mutation. When
 * the prop updates, we synchronise the local value. When the local value
 * changes via the slider, we emit the update to the parent.
 */
const timeValueLocal = ref(props.timeValue);
watch(
    () => props.timeValue,
    (val) => {
      timeValueLocal.value = val;
    },
);
// Emit updates when local time value changes. The parent decides how to
// interpret and coerce the value (string vs number).
watch(timeValueLocal, (val) => {
  emit('update:timeValue', val);
});

/**
 * Local reactive copy of selectedDay. This mirrors the prop and emits
 * updates when the user chooses a different day.
 */
const selectedDayLocal = ref(props.selectedDay);
watch(
    () => props.selectedDay,
    (val) => {
      selectedDayLocal.value = val;
    },
);
watch(selectedDayLocal, (val) => {
  emit('update:selectedDay', val);
  // Immediately request a layer update to reflect the change.
  emit('update-layer');
});

/**
 * Compute the correct play/pause icon class and button text based on the
 * current playing state. This removes duplicated logic from the template.
 */
const playIconClass = computed(() =>
    props.isPlaying ? 'bi bi-pause-circle-fill' : 'bi bi-google-play',
);
const playButtonText = computed(() => (props.isPlaying ? 'Pauzeren' : 'Afspelen'));

/**
 * References to DOM elements. Exposed for potential parent interactions via
 * ref forwards (e.g. to reset values). Note: propertyRef, timeSliderRef and
 * sDateRef correspond to elements in the template.
 */
const propertyRef = ref<HTMLSelectElement | null>(null);
const timeSliderRef = ref<HTMLInputElement | null>(null);
const sDateRef = ref<HTMLInputElement | null>(null);

// TODO: The property select currently communicates its value to the parent via
// a ref (propertyRef) and the parent queries it directly. For better
// transparency and type safety, consider converting the sensor type into a
// v-model (e.g. via a prop and emit) similar to timeValueLocal and
// selectedDayLocal. This would decouple the parent from directly accessing
// the child's DOM.

/**
 * Computed property returning the logo path. Using require() in computed
 * ensures proper bundling and avoids dynamic string import issues.
 */
const logoSrc = computed(() => require('@/assets/PZH-logo.png'));

/**
 * Emit a layer update. Centralising this call avoids creating inline
 * functions on template bindings.
 */
function emitUpdateLayer(): void {
  emit('update-layer');
}

/**
 * Handle changes to the time slider. Update the local time value. The
 * watchers will propagate the change to the parent.
 */
function onTimeInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  // Note: range inputs emit strings by default. Leave coercion to parent.
  timeValueLocal.value = target.value;
}

/**
 * Handle day input changes. Update the local selected day. Emission of
 * updates happens in watchers.
 */
function onDayInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  selectedDayLocal.value = target.value;
}
</script>

<style scoped>
/* Custom focus styling for floating labels */
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
</style>