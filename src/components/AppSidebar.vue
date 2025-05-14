<template>
  <div
      class="offcanvas offcanvas-end rounded"
      tabindex="-1"
      id="sidebar"
      ref="appSidebarOffcanvas" aria-labelledby="sidebarLabel"
      style="width: 50%; top: 1%; bottom: 1%;"
      :class="{ 'show': isVisible }"
  >
    <div class="offcanvas-header">
      <h3 class="offcanvas-title" id="sidebarLabel">Informatie over de stations</h3>
      <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close" @click="$emit('close-sidebar')"></button>
    </div>
    <div class="offcanvas-body overflow-auto position-relative">
      <div id="sidebarCarousel" class="carousel slide position-absolute top-0 start-0 w-100 h-100" data-bs-ride="carousel" v-if="carouselImages.length > 0">
        <div class="carousel-inner h-100">
          <div
              v-for="(image, index) in carouselImages"
              :key="index"
              class="carousel-item h-100"
              :class="{ active: index === 0 }"
          >
            <img :src="image.src" class="d-block w-100 h-100 object-fit-cover" :alt="image.alt">
          </div>
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#sidebarCarousel" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#sidebarCarousel" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>

      <div class="container-fluid position-relative" style="z-index: 1;"> <div class="row">
        <div class="accordion" id="sidebarAccordion">
          <div class="accordion-item">
            <h2 class="accordion-header" id="headingOneSidebar">
              <button class="accordion-button text-primary-emphasis fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOneSidebar" aria-expanded="true" aria-controls="collapseOneSidebar">
                Gemiddelde, maximum en minimaal waarde van <b class="text-primary fw-semibold">{{ formattedProperty }} nk (µg/m³)</b> van vandaag.
              </button>
            </h2>
            <div id="collapseOneSidebar" class="accordion-collapse collapse show" aria-labelledby="headingOneSidebar" data-bs-parent="#sidebarAccordion">
              <div class="accordion-body">
                <div class="col-12 table-responsive overflow-auto" style="max-height: 33vh;">
                  <table class="table table-hover table-bordered table-sm">
                    <thead>
                    <tr>
                      <th scope="col">Station</th>
                      <th scope="col">Gemiddelde</th>
                      <th scope="col">Maximum</th>
                      <th scope="col">Minimaal</th>
                    </tr>
                    </thead>
                    <tbody class="table-group-divider">
                    <tr v-if="!geojsonFeatures || geojsonFeatures.length === 0"> <td colspan="4" class="text-center">Geen station gegevens beschikbaar.</td>
                    </tr>
                    <tr v-for="item in geojsonFeatures" :key="item.properties.station_name">
                      <th scope="row">{{ item.properties.station_name }}</th>
                      <td>{{ item.properties.avg_value != null ? parseFloat(item.properties.avg_value).toFixed(1) : 'N/A' }}</td>
                      <td>{{ item.properties.max_value != null ? parseFloat(item.properties.max_value).toFixed(1) : 'N/A' }}</td>
                      <td>{{ item.properties.min_value != null ? parseFloat(item.properties.min_value).toFixed(1) : 'N/A' }}</td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header" id="headingTwoSSidebar">
              <button class="accordion-button text-primary-emphasis fw-semibold collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwoSSidebar" aria-expanded="false" aria-controls="collapseTwoSSidebar">
                Beschrijving van fijnstof | <span class="property text-primary">{{ formattedProperty }}</span>
              </button>
            </h2>
            <div id="collapseTwoSSidebar" class="accordion-collapse collapse" aria-labelledby="headingTwoSSidebar" data-bs-parent="#sidebarAccordion">
              <div class="accordion-body">
                <h6 class="description overflow-auto" v-html="description" style="max-height: 40vh;"></h6>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header" id="headingThreeSSidebar">
              <button class="accordion-button text-primary-emphasis fw-semibold collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThreeSSidebar" aria-expanded="false" aria-controls="collapseThreeSSidebar">
                Bekijk dit filmpje voor meer informatie
              </button>
            </h2>
            <div id="collapseThreeSSidebar" class="accordion-collapse collapse" aria-labelledby="headingThreeSSidebar" data-bs-parent="#sidebarAccordion">
              <div class="accordion-body">
                <h5><a href="https://samenmeten.rivm.nl/dataportaal/" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Bekijk dit filmpje voor meer informatie:</a></h5>
                <h6><a href="https://www.samenmeten.nl/zelf-meten/hoe-kan-ik-zelf-luchtkwaliteit-meten" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Hoe kan ik zelf luchtkwaliteit meten<i class="bi bi-question-lg ms-1"></i></a></h6>
                <div class="embed-responsive embed-responsive-16by9 mt-2">
                  <video controls class="embed-responsive-item w-100 rounded">
                    <source src="https://www.rovid.nl/rivm/aco/2017/rivm-aco-20171017-id2nv5d79-web-hd.mp4" type="video/mp4" />
                    Your browser does not support HTML5 video.
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
</template>

<script>
export default {
  name: 'AppSidebar',
  props: {
    isVisible: Boolean,
    geojsonFeatures: {
      type: Array,
      default: () => []
    },
    formattedProperty: String,
    description: String,
  },
  data() {
    return {
      // Corrected: Using require for assets within src
      carouselImages: [
        { src: require('@/assets/car2.png'), alt: 'Car image 2' },
        { src: require('@/assets/car3.png'), alt: 'Car image 3' },
        { src: require('@/assets/car1.png'), alt: 'Car image 1' },
      ],
      bsOffcanvasInstance: null,
      boundHandleHiddenEvent: null,
    };
  },
  watch: {
    isVisible(newValue) {
      if (this.bsOffcanvasInstance) {
        // Check internal Bootstrap state _isShown to prevent redundant calls
        if (newValue && !this.bsOffcanvasInstance._isShown) {
          this.bsOffcanvasInstance.show();
        } else if (!newValue && this.bsOffcanvasInstance._isShown) {
          this.bsOffcanvasInstance.hide();
        }
      }
    }
  },
  mounted() {
    const sidebarElement = this.$refs.appSidebarOffcanvas;
    if (window.bootstrap && sidebarElement) {
      this.bsOffcanvasInstance = new window.bootstrap.Offcanvas(sidebarElement);

      this.boundHandleHiddenEvent = this.handleHiddenEvent.bind(this);
      sidebarElement.addEventListener('hidden.bs.offcanvas', this.boundHandleHiddenEvent);

      // If initially visible, and Bootstrap hasn't shown it yet, show it.
      if (this.isVisible && !this.bsOffcanvasInstance._isShown) {
        this.bsOffcanvasInstance.show();
      }
    }
  },
  beforeUnmount() {
    const sidebarElement = this.$refs.appSidebarOffcanvas;
    if (sidebarElement && this.boundHandleHiddenEvent) {
      sidebarElement.removeEventListener('hidden.bs.offcanvas', this.boundHandleHiddenEvent);
    }
    // Attempt to dispose of the Bootstrap Offcanvas instance if the method exists
    if (this.bsOffcanvasInstance && typeof this.bsOffcanvasInstance.dispose === 'function') {
      this.bsOffcanvasInstance.dispose();
    }
    this.bsOffcanvasInstance = null; // Clear the reference
  },
  methods: {
    handleHiddenEvent() {
      // Only emit if the sidebar is intended to be closed according to Vue's state.
      // This helps prevent issues if Bootstrap closes it for other reasons (e.g. backdrop click)
      // while Vue state still thinks it should be open.
      // However, the primary goal here is to inform parent that Bootstrap did close it.
      this.$emit('close-sidebar');
    }
  },
  emits: ['close-sidebar']
};
</script>

<style scoped>
.offcanvas-body {
  background-color: #f8f9fa; /* Light background for content area */
}
.carousel {
  z-index: 0; /* Ensure carousel is behind content */
}
.object-fit-cover {
  object-fit: cover;
}
.accordion-button {
  font-size: 0.95rem;
}
.table-sm th, .table-sm td {
  padding: 0.4rem;
  font-size: 0.85rem;
}
</style>