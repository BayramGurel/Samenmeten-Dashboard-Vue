<template>
  <!-- Station information modal -->
  <!--
    The modal displays detailed information about a selected station and a
    canvas for chart rendering. It uses Bootstrap's modal classes and
    accessibility attributes. The content is inert when hidden.
  -->
  <div
      class="modal fade content-none"
      id="modalWithBothOptions"
      tabindex="-1"
      aria-labelledby="modalWithBothOptionsLabel"
      aria-hidden="true"
  >
    <div class="modal-dialog modal-xl" id="czoom2">
      <div class="modal-content">
        <div class="modal-header">
          <!-- The title references the current station name. Using {{ }} ensures
               safe output escaping. -->
          <h5 class="modal-title text-center" id="modalWithBothOptionsLabel">
            Informatie over het station: <span>{{ props.properties.station_name ?? '' }}</span>
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Descriptive text about the station. The template engine escapes
               dynamic values automatically. -->
          <p class="text-muted">
            Het station bevindt zich in de gemeente
            {{ props.properties.Gemeente ?? 'Onbekend' }}.<br />
            De fijnstofwaarde {{ props.formattedProperty }} is gemeten op dit
            station, dat zich in de regio
            {{ props.properties.regio ?? 'Onbekend' }} bevindt.
          </p>
          <h6 class="text-center pt-3">
            Grafische representatie van {{ props.properties.station_name ?? '' }}
          </h6>
          <div class="d-flex justify-content-center overflow-auto">
            <!-- Chart canvas. An ARIA role and label are provided for screen readers. -->
            <canvas
                ref="chartRef"
                aria-label="Grafiek van station {{ props.properties.station_name ?? '' }}"
                role="img"
            ></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineExpose } from 'vue';

/**
 * Represents a subset of station properties required by the modal. Extend this
 * interface if additional fields are needed. Using `undefined` on optional
 * properties allows for graceful handling of missing data.
 */
const props = defineProps({
  formattedProperty: {
    type: String,
    default: '',
  },
  properties: {
    type: Object,
    default: () => ({}),
  },
});

// Reference to the canvas element. The parent is responsible for creating
// and destroying the Chart.js instance, using this ref to access the canvas.
const chartRef = ref(null);

// Expose the chart reference so that the parent can access it via the
// component's instance (e.g. using `ref="stationModal"`).
defineExpose({ chartRef });

// Note: No additional logic is handled in this modal. Data binding and chart
// management should be handled by the parent component. Consider moving
// chart initialisation into a composable (e.g. useChart) for better
// separation of concerns.
</script>

<style scoped>
/* Override Bootstrap modal transitions if needed. The `content-none` class
   indicates that content is hidden until the modal is shown. */
</style>
