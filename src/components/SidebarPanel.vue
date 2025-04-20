<template>
  <div>
    <button
        class="btn btn-light position-fixed top-50 end-0 translate-middle-y shadow-sm sidebar-toggle-btn"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#infoSidebar"
        aria-controls="infoSidebar"
        data-bs-backdrop="false"
        style="z-index: 1040;"
        title="Toon/Verberg aanvullende informatie"
    >
      <i class="bi bi-list me-1"></i> Info
    </button>

    <div
        id="infoSidebar"
        ref="sidebarElement"
        class="offcanvas offcanvas-end rounded shadow"
        tabindex="-1"
        aria-labelledby="infoSidebarLabel"
        style="width: 50%; top: 1%; bottom: 1%;"
    >
      <div class="offcanvas-header border-bottom">
        <h4 id="infoSidebarLabel" class="offcanvas-title">
          Informatie over de stations
        </h4>
        <button
            type="button"
            class="btn-close text-reset"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
        ></button>
      </div>

      <div class="offcanvas-body overflow-hidden position-relative p-0">
        <div
            id="sidebarCarousel"
            class="carousel slide position-absolute top-0 start-0 w-100 h-100"
            data-bs-ride="carousel"
            data-bs-interval="5000"
        >
          <div class="carousel-inner h-100">
            <div class="carousel-item active h-100">
              <img
                  :src="require('@/assets/car2.png')"
                  class="d-block w-100 h-100 object-fit-cover carousel-img-overlay"
                  alt="Achtergrond afbeelding 1"
              />
            </div>
            <div class="carousel-item h-100">
              <img
                  :src="require('@/assets/car3.png')"
                  class="d-block w-100 h-100 object-fit-cover carousel-img-overlay"
                  alt="Achtergrond afbeelding 2"
              />
            </div>
            <div class="carousel-item h-100">
              <img
                  :src="require('@/assets/car1.png')"
                  class="d-block w-100 h-100 object-fit-cover carousel-img-overlay"
                  alt="Achtergrond afbeelding 3"
              />
            </div>
          </div>
        </div>

        <div class="container-fluid position-relative sidebar-content p-3 h-100 overflow-auto">
          <div class="row">
            <div id="sidebarAccordion" class="accordion">

              <div class="accordion-item bg-light bg-opacity-75 mb-2">
                <h2 id="headingOne" class="accordion-header">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold shadow-sm"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseOne"
                      aria-expanded="true"
                      aria-controls="collapseOne"
                  >
                    <p class="mb-0 small">
                      Samenvatting:
                      <b class="text-primary fw-semibold">{{ formattedProperty }} (µg/m³)</b> Vandaag
                    </p>
                  </button>
                </h2>
                <div
                    id="collapseOne"
                    class="accordion-collapse collapse show"
                    aria-labelledby="headingOne"
                    data-bs-parent="#sidebarAccordion"
                >
                  <div class="accordion-body p-2">
                    <div v-if="stationFeatures && stationFeatures.length > 0" class="table-responsive data-table-container">
                      <table class="table table-hover table-bordered table-sm caption-top small">
                        <caption>Overzicht van {{ stationFeatures.length }} station(s)</caption>
                        <thead class="table-light">
                        <tr>
                          <th scope="col">Station</th>
                          <th scope="col" class="text-end">Gem.</th>
                          <th scope="col" class="text-end">Max.</th>
                          <th scope="col" class="text-end">Min.</th>
                        </tr>
                        </thead>
                        <tbody class="table-group-divider">
                        <tr v-for="(item, index) in stationFeatures" :key="item.properties?.station_name || `station-${index}`">
                          <th scope="row">{{ item.properties?.station_name || 'N/A' }}</th>
                          <td class="text-end">{{ formatValue(item.properties?.avg_value) }}</td>
                          <td class="text-end">{{ formatValue(item.properties?.max_value) }}</td>
                          <td class="text-end">{{ formatValue(item.properties?.min_value) }}</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>
                    <div v-else class="text-center text-muted p-3 small">
                      Geen station gegevens beschikbaar voor de huidige selectie.
                    </div>
                  </div>
                </div>
              </div>

              <div class="accordion-item bg-light bg-opacity-75 mb-2">
                <h2 id="headingTwo" class="accordion-header">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold collapsed shadow-sm"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseTwo"
                      aria-expanded="false"
                      aria-controls="collapseTwo"
                  >
                    <p class="mb-0 small">
                      Beschrijving | <span class="property text-primary">{{ formattedProperty }}</span>
                    </p>
                  </button>
                </h2>
                <div
                    id="collapseTwo"
                    class="accordion-collapse collapse"
                    aria-labelledby="headingTwo"
                    data-bs-parent="#sidebarAccordion"
                >
                  <div class="accordion-body description-container small">
                    <div v-if="description" v-html="description"></div>
                    <div v-else class="text-muted">Geen beschrijving beschikbaar.</div>
                  </div>
                </div>
              </div>

              <div class="accordion-item bg-light bg-opacity-75">
                <h2 id="headingThree" class="accordion-header">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold collapsed shadow-sm"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseThree"
                      aria-expanded="false"
                      aria-controls="collapseThree"
                  >
                    <p class="mb-0 small">Meer informatie (video & links)</p>
                  </button>
                </h2>
                <div
                    id="collapseThree"
                    class="accordion-collapse collapse"
                    aria-labelledby="headingThree"
                    data-bs-parent="#sidebarAccordion"
                >
                  <div class="accordion-body small">
                    <h6 class="mb-2">
                      <a
                          href="https://samenmeten.rivm.nl/dataportaal/"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                      >
                        RIVM Dataportaal <i class="bi bi-box-arrow-up-right small"></i>
                      </a>
                    </h6>
                    <h6 class="mb-3">
                      <a
                          href="https://www.samenmeten.nl/zelf-meten/hoe-kan-ik-zelf-luchtkwaliteit-meten"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                      >
                        Zelf luchtkwaliteit meten? <i class="bi bi-question-lg"></i><i class="bi bi-box-arrow-up-right small"></i>
                      </a>
                    </h6>
                    <div class="embed-responsive embed-responsive-16by9 video-container">
                      <video controls preload="metadata" class="embed-responsive-item w-100 rounded shadow-sm">
                        <source
                            src="https://www.rovid.nl/rivm/aco/2017/rivm-aco-20171017-id2nv5d79-web-hd.mp4"
                            type="video/mp4"
                        />
                        Uw browser ondersteunt de video tag niet.
                      </video>
                    </div>
                  </div>
                </div>
              </div> </div> </div> </div> </div> </div> </div>
</template>

<script setup>
import { computed, ref } from 'vue';
// Note: Assumes Bootstrap's JS for Offcanvas, Carousel, Accordion, Collapse
// is loaded globally or initialized correctly within your Vue application setup.

const props = defineProps({
  geojson: {
    type: Object,
    default: () => ({ type: 'FeatureCollection', features: [] }),
    // Optional validator for geojson structure
    validator: (value) => {
      return value && typeof value === 'object' && value.type === 'FeatureCollection' && Array.isArray(value.features || value.Features);
    }
  },
  formattedProperty: { type: String, default: 'N/A' },
  description: { type: String, default: '' }, // Caution: Used with v-html
});

// Template ref for the sidebar element (optional usage)
const sidebarElement = ref(null);

// Computed property to safely access the features array
const stationFeatures = computed(() => {
  // Handles both 'features' and 'Features', returns empty array if invalid
  return props.geojson?.features || props.geojson?.Features || [];
});

// Helper function to format numerical values for the table
const formatValue = (value) => {
  // Check for null, undefined, or NaN
  if (value == null || isNaN(value)) return 'N/A';
  // Convert to number and format to 2 decimal places
  return Number(value).toFixed(2);
};
</script>

<style scoped>
.sidebar-toggle-btn {
  /* Adjust position/style if needed */
  z-index: 1041; /* Ensure button is above offcanvas when closed */
}

.offcanvas-body {
  /* Prevent scrollbars on the body itself, content div will handle scroll */
  overflow: hidden;
}

.carousel-img-overlay {
  /* Add filter for better text readability over images */
  filter: brightness(0.6) blur(1px);
  /* Ensure it covers the area */
  object-fit: cover;
}

.sidebar-content {
  /* Ensure content is above the carousel */
  z-index: 1;
  /* Add a semi-transparent background to make text readable over the carousel */
  /* background-color: rgba(255, 255, 255, 0.85); /* Example: White with 85% opacity */
  /* Alternatively, style text color directly */
  /* color: #fff; */

  /* Make this div scrollable instead of the offcanvas body */
  overflow-y: auto;
  height: 100%; /* Needs height to enable overflow */
}

.accordion-item {
  /* Example: Add slight transparency to accordion items */
  background-color: rgba(248, 249, 250, 0.9); /* Light background with opacity */
  border: none;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}
.accordion-button {
  background-color: rgba(233, 236, 239, 0.9); /* Slightly darker button background */
  border-radius: calc(0.25rem - 1px);
}
.accordion-button:not(.collapsed) {
  background-color: rgba(206, 212, 218, 0.9);
}
.accordion-body {
  background-color: rgba(255, 255, 255, 0.85); /* Lighter body background */
  border-radius: 0 0 calc(0.25rem - 1px) calc(0.25rem - 1px);
}


/* Limit height of scrollable areas within accordion */
.data-table-container {
  max-height: 30vh; /* Adjust as needed */
  overflow-y: auto;
}

.description-container {
  max-height: 35vh; /* Adjust as needed */
  overflow-y: auto;
}

.video-container video {
  max-width: 100%;
  height: auto;
}
</style>