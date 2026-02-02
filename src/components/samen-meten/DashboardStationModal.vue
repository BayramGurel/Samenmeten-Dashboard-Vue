<template>
  <!-- Station information modal -->
  <!--
    The modal displays detailed information about a selected station and a
    chart component that handles its own data fetching.
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
          <h5 class="modal-title text-center" id="modalWithBothOptionsLabel">
            Informatie over het station: <span>{{ props.properties.station_name ?? '' }}</span>
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
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
          <StationChart :station="props.properties" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import StationChart from '@/components/samen-meten/StationChart.vue';

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

// TODO: If the modal grows, consider extracting the descriptive text into a
// reusable component alongside the chart.
</script>

<style scoped>
/* Override Bootstrap modal transitions if needed. The `content-none` class
   indicates that content is hidden until the modal is shown. */
</style>
