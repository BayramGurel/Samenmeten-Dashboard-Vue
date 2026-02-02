<template>
  <!-- Map container with sidebar and offcanvas overlay. The offcanvas displays
       additional information about stations when triggered. -->
  <div id="map" class="position-absolute w-100 h-100">
    <!-- Sidebar offcanvas containing carousel, tables and descriptive text -->
    <div
        class="offcanvas offcanvas-end rounded"
        tabindex="-1"
        id="sidebar"
        style="width: 50%; top: 1%; bottom: 1%;"
    >
      <div class="offcanvas-header">
        <h3 class="offcanvas-title">Informatie over de stations</h3>
        <button
            type="button"
            class="btn-close text-reset"
            data-bs-dismiss="offcanvas"
            aria-label="Sluiten"
        ></button>
      </div>
      <div class="offcanvas-body overflow-auto position-relative">
        <!-- Carousel displaying illustrative images. Each image has meaningful
             alt text for accessibility. -->
        <div
            id="carouselExampleIndicators"
            class="carousel slide position-absolute top-0 start-0 w-100 h-100"
            data-bs-ride="carousel"
        >
          <div class="carousel-inner h-100">
            <div class="carousel-item active">
              <img
                  :src="car2"
                  class="d-block w-100 h-100 object-fit-cover"
                  alt="Landschap met meetstation"
              />
            </div>
            <div class="carousel-item">
              <img
                  :src="car3"
                  class="d-block w-100 h-100 object-fit-cover"
                  alt="Stad en luchtkwaliteitsmeting"
              />
            </div>
            <div class="carousel-item">
              <img
                  :src="car1"
                  class="d-block w-100 h-100 object-fit-cover"
                  alt="Fabriek met luchtmeting"
              />
            </div>
          </div>
        </div>
        <!-- Accordion with data table, description and video -->
        <div class="container-fluid position-relative">
          <div class="row">
            <div class="accordion" id="accordionExample">
              <!-- Average/Max/Min table accordion item -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingOne">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseOne"
                      aria-expanded="true"
                      aria-controls="collapseOne"
                  >
                    <span>
                      Gemiddelde, maximum en minimaal waarde van
                      <b class="text-primary fw-semibold">
                        concentratie {{ props.formattedProperty }} nk (µg/m³)
                      </b>
                      van vandaag.
                    </span>
                  </button>
                </h2>
                <div
                    id="collapseOne"
                    class="accordion-collapse collapse show"
                    aria-labelledby="headingOne"
                    data-bs-parent="#accordionExample"
                >
                  <div class="accordion-body">
                    <div
                        class="col-12 table-responsive overflow-auto"
                        style="max-height: 33vh;"
                    >
                      <table class="table table-hover table-bordered">
                        <thead>
                        <tr>
                          <th scope="col">Station</th>
                          <th scope="col">Gemiddelde</th>
                          <th scope="col">Maximum</th>
                          <th scope="col">Minimaal</th>
                        </tr>
                        </thead>
                        <tbody class="table-group-divider">
                        <tr
                            v-for="feature in tableRows"
                            :key="feature.properties.station_name"
                        >
                          <th scope="row">{{ feature.properties.station_name }}</th>
                          <td>{{ feature.properties.avg_value }}</td>
                          <td>{{ feature.properties.max_value }}</td>
                          <td>{{ feature.properties.min_value }}</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Description accordion item -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingTwo">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseTwo"
                      aria-expanded="false"
                      aria-controls="collapseTwo"
                  >
                    <span>
                      Beschrijving van fijnstof |
                      <span class="property text-primary">{{ props.formattedProperty }}</span>
                    </span>
                  </button>
                </h2>
                <div
                    id="collapseTwo"
                    class="accordion-collapse collapse"
                    aria-labelledby="headingTwo"
                    data-bs-parent="#accordionExample"
                >
                  <div class="accordion-body">
                    <!-- Note: description may contain HTML from a trusted source. Ensure
                         it is sanitised before passing to this component. -->
                    <h6
                        class="description overflow-auto"
                        v-html="props.description"
                        style="max-height: 40vh;"
                    ></h6>
                  </div>
                </div>
              </div>
              <!-- Video accordion item -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingThree">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseThree"
                      aria-expanded="false"
                      aria-controls="collapseThree"
                  >
                    <span>Bekijk dit filmpje voor meer informatie</span>
                  </button>
                </h2>
                <div
                    id="collapseThree"
                    class="accordion-collapse collapse"
                    aria-labelledby="headingThree"
                    data-bs-parent="#accordionExample"
                >
                  <div class="accordion-body">
                    <h5>
                      <a
                          href="https://samenmeten.rivm.nl/dataportaal/"
                          target="_blank"
                          class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                      >
                        Bekijk dit filmpje voor meer informatie:
                      </a>
                    </h5>
                    <h6>
                      <a
                          href="https://www.samenmeten.nl/zelf-meten/hoe-kan-ik-zelf-luchtkwaliteit-meten"
                          target="_blank"
                          class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                      >
                        Hoe kan ik zelf luchtkwaliteit meten
                        <i class="bi bi-question-lg"></i>
                      </a>
                    </h6>
                    <div class="ratio ratio-16x9">
                      <video
                          controls
                          class="w-100 rounded"
                          aria-label="Informatief filmpje over luchtkwaliteit"
                      >
                        <source
                            src="https://www.rovid.nl/rivm/aco/2017/rivm-aco-20171017-id2nv5d79-web-hd.mp4"
                            type="video/mp4"
                        />
                        Uw browser ondersteunt HTML5 video niet.
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
    <!-- Button to open the sidebar offcanvas -->
    <button
        class="btn btn-light position-fixed top-50 end-0 translate-middle-y"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#sidebar"
        aria-controls="sidebar"
        data-bs-backdrop="false"
        style="z-index: 2;"
    >
      <i class="bi bi-list"></i> Aanvullende informatie
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';

/**
 * Type definition for a GeoJSON Feature with relevant properties. Extend this
 * interface as needed to include other properties available in your data.
 */
interface FeatureProperties {
  station_name?: string;
  avg_value?: number | string;
  max_value?: number | string;
  min_value?: number | string;
  [key: string]: unknown;
}

interface Feature {
  properties: FeatureProperties;
  // geometry and other fields are omitted here since they are not used
}

interface FeatureCollection {
  features: Feature[];
}

// Define props accepted by this component. Destructure them via setup script.
const props = defineProps<{
  geojson: FeatureCollection | null;
  formattedProperty: string;
  description: string;
}>();

/**
 * Compute the rows for the table from the provided GeoJSON. This computed
 * property ensures that any updates to props.geojson automatically
 * recompute the rows without extra watchers.
 */
const tableRows = computed(() => {
  return props.geojson?.features ?? [];
});

/**
 * Require images via computed properties so bundlers resolve them correctly.
 */
const car1 = computed(() => require('@/assets/car1.png'));
const car2 = computed(() => require('@/assets/car2.png'));
const car3 = computed(() => require('@/assets/car3.png'));

// TODO: Consider extracting the carousel, table and video into their own
// components to simplify this sidebar component. This would enhance
// reusability and make each part easier to test individually.
</script>

<style scoped>
/* Additional scoped styles can be defined here if needed. The component
   currently relies on Bootstrap classes for layout and styling. */
</style>
