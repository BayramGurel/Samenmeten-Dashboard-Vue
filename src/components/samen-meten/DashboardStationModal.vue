<template>
  <div class="modal fade content-none" id="modalWithBothOptions" tabindex="-1" aria-labelledby="modalWithBothOptionsLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl" id="czoom2">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title text-center" id="modalWithBothOptionsLabel">Informatie over de station: <span v-text="properties.station_name"></span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="card-body">
            <p class="text-muted">
              Het station bevindt zich in de gemeente {{ properties.Gemeente }}.<br>
              De fijnstofwaarde {{ formattedProperty }} is gemeten op dit station, dat zich in de regio
              {{ properties.regio }} bevindt.<br>
            </p>
            <h6 class="text-center pt-3">Grafische representatie van {{ properties.station_name }}</h6>
            <div class="d-flex justify-content-center overflow-auto">
              <canvas ref="myChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardStationModal',
  props: {
    formattedProperty: {
      type: String,
      required: true,
    },
    properties: {
      type: Object,
      required: true,
    },
  },
};
</script>
