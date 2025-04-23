<template>
  <div>
    <button
        class="btn btn-light position-fixed top-50 end-0 translate-middle-y shadow-sm"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#sidebarInfoPanel"
        aria-controls="sidebarInfoPanel"
        data-bs-backdrop="false"
        style="z-index: 1040;"
    >
      <i class="bi bi-list me-1"></i> Aanvullende Informatie
    </button>

    <div
        class="offcanvas offcanvas-end rounded"
        tabindex="-1"
        id="sidebarInfoPanel"
        aria-labelledby="sidebarInfoPanelLabel"
        style="width: 45%; top: 1%; bottom: 1%; max-width: 600px;"
    >
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title text-primary-emphasis" id="sidebarInfoPanelLabel">Stationsinformatie & Details</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>

      <div class="offcanvas-body overflow-hidden position-relative p-0">
        <div id="sidebarCarousel" class="carousel slide position-absolute top-0 start-0 w-100 h-100" data-bs-ride="carousel">
          <div class="carousel-inner h-100">
            <div class="carousel-item active h-100">
              <img :src="car2" class="d-block w-100 h-100 object-fit-cover" alt="Background Image 2">
            </div>
            <div class="carousel-item h-100">
              <img :src="car3" class="d-block w-100 h-100 object-fit-cover" alt="Background Image 3">
            </div>
            <div class="carousel-item h-100">
              <img :src="car1" class="d-block w-100 h-100 object-fit-cover" alt="Background Image 1">
            </div>
          </div>
        </div>

        <div class="container-fluid position-relative h-100 overflow-auto p-3" style="background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(2px);">
          <div class="row">
            <div class="accordion" id="sidebarAccordion">

              <div class="accordion-item bg-transparent border-secondary mb-2">
                <h2 class="accordion-header" id="headingTabel">
                  <button class="accordion-button text-primary-emphasis fw-semibold py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTabel" aria-expanded="true" aria-controls="collapseTabel">
                    Samenvatting <b class="text-primary ms-1">{{ formattedProperty }}</b> (Dag Gem/Max/Min, µg/m³)
                  </button>
                </h2>
                <div id="collapseTabel" class="accordion-collapse collapse show" aria-labelledby="headingTabel" data-bs-parent="#sidebarAccordion">
                  <div class="accordion-body p-0">
                    <div class="table-responsive data-table-container">
                      <table v-if="hasTableData" class="table table-sm table-hover table-bordered caption-top small bg-light">
                        <caption>Stations in huidige selectie</caption>
                        <thead class="table-light">
                        <tr>
                          <th scope="col">Station</th>
                          <th scope="col">Gem.</th>
                          <th scope="col">Max.</th>
                          <th scope="col">Min.</th>
                        </tr>
                        </thead>
                        <tbody class="table-group-divider">
                        <tr v-for="item in tableData" :key="item.properties?.station_name || item.id">
                          <th scope="row">{{ item.properties?.station_name || 'N/A' }}</th>
                          <td>{{ formatValue(item.properties?.avg_value) }}</td>
                          <td>{{ formatValue(item.properties?.max_value) }}</td>
                          <td>{{ formatValue(item.properties?.min_value) }}</td>
                        </tr>
                        </tbody>
                      </table>
                      <p v-else class="text-center text-muted p-3 small">Geen stationsdata beschikbaar voor de huidige selectie en tijd.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="accordion-item bg-transparent border-secondary mb-2">
                <h2 class="accordion-header" id="headingBeschrijving">
                  <button class="accordion-button text-primary-emphasis fw-semibold collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseBeschrijving" aria-expanded="false" aria-controls="collapseBeschrijving">
                    Beschrijving <span class="text-primary ms-1">{{ formattedProperty }}</span>
                  </button>
                </h2>
                <div id="collapseBeschrijving" class="accordion-collapse collapse" aria-labelledby="headingBeschrijving" data-bs-parent="#sidebarAccordion">
                  <div class="accordion-body p-2">
                    <div class="description-container small bg-light p-2 rounded" v-html="description"></div>
                  </div>
                </div>
              </div>

              <div class="accordion-item bg-transparent border-secondary">
                <h2 class="accordion-header" id="headingVideo">
                  <button class="accordion-button text-primary-emphasis fw-semibold collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseVideo" aria-expanded="false" aria-controls="collapseVideo">
                    Meer Informatie & Video
                  </button>
                </h2>
                <div id="collapseVideo" class="accordion-collapse collapse" aria-labelledby="headingVideo" data-bs-parent="#sidebarAccordion">
                  <div class="accordion-body p-2">
                    <div class="bg-light p-2 rounded">
                      <h6 class="small"><a href="https://samenmeten.rivm.nl/dataportaal/" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">RIVM Samenmeten Dataportaal</a></h6>
                      <h6 class="small"><a href="https://www.samenmeten.nl/zelf-meten/hoe-kan-ik-zelf-luchtkwaliteit-meten" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Hoe kan ik zelf luchtkwaliteit meten? <i class="bi bi-box-arrow-up-right small"></i></a></h6>
                      <div class="ratio ratio-16x9 mt-2">
                        <video controls class="rounded" preload="metadata">
                          <source src="https://www.rovid.nl/rivm/aco/2017/rivm-aco-20171017-id2nv5d79-web-hd.mp4" type="video/mp4">
                          Uw browser ondersteunt geen HTML5 video.
                        </video>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';

import car1 from '@/assets/car1.png';
import car2 from '@/assets/car2.png';
import car3 from '@/assets/car3.png';

const props = defineProps({
  geojson: {
    type: Object,
    required: true,
    default: () => ({ type: 'FeatureCollection', features: [] })
  },
  formattedProperty: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});

const hasTableData = computed(() => {
  return props.geojson && props.geojson.features && props.geojson.features.length > 0;
});

const tableData = computed(() => {
  if (!hasTableData.value) {
    return [];
  }
  return [...props.geojson.features].sort((a, b) => {
    const nameA = a.properties?.station_name || '';
    const nameB = b.properties?.station_name || '';
    return nameA.localeCompare(nameB);
  });
});

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return typeof value === 'number' ? value.toFixed(1) : value;
};

</script>

<style scoped>
.offcanvas {
  z-index: 1045;
  border-left: 1px solid #dee2e6;
  box-shadow: -0.25rem 0 1rem rgba(0, 0, 0, 0.15);
}

.object-fit-cover {
  object-fit: cover;
}

.carousel-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.15);
}

.data-table-container {
  max-height: 30vh;
  overflow-y: auto;
}
.description-container {
  max-height: 35vh;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.95);
}

.data-table-container::-webkit-scrollbar,
.description-container::-webkit-scrollbar,
.container-fluid.position-relative.h-100.overflow-auto::-webkit-scrollbar {
  width: 6px;
}
.data-table-container::-webkit-scrollbar-track,
.description-container::-webkit-scrollbar-track,
.container-fluid.position-relative.h-100.overflow-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
.data-table-container::-webkit-scrollbar-thumb,
.description-container::-webkit-scrollbar-thumb,
.container-fluid.position-relative.h-100.overflow-auto::-webkit-scrollbar-thumb {
  background: #aaa;
  border-radius: 3px;
}
.data-table-container::-webkit-scrollbar-thumb:hover,
.description-container::-webkit-scrollbar-thumb:hover,
.container-fluid.position-relative.h-100.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #777;
}

.accordion-button {
  background-color: rgba(248, 249, 250, 0.8);
}
.accordion-button:not(.collapsed) {
  background-color: rgba(230, 242, 255, 0.9);
  color: #0c63e4;
}

.accordion-item.bg-transparent {
  border: none;
}
.accordion-item.bg-transparent .accordion-header {
  border: 1px solid rgba(0,0,0,.125);
  border-radius: var(--bs-accordion-border-radius);
}
.accordion-item.bg-transparent .accordion-collapse {
  border: 1px solid rgba(0,0,0,.125);
  border-top: none;
  border-radius: 0 0 var(--bs-accordion-border-radius) var(--bs-accordion-border-radius);
}
.accordion-button:focus {
  box-shadow: none;
}

</style>