<template>
  <div>
    <div class="offcanvas offcanvas-end rounded" tabindex="-1" id="sidebar" style="width: 50%; top: 1%; bottom: 1%;">
      <div class="offcanvas-header">
        <h3 class="offcanvas-title">Informatie over de stations</h3>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body overflow-auto position-relative">
        <div class="carousel position-absolute top-0 start-0 w-100 h-100">
          <div class="carousel-inner h-100">
            <div
                v-for="(src, index) in images"
                :key="index"
                :class="['carousel-item', { active: index === activeSlide }]"
                class="h-100"
            >
              <img :src="src" class="d-block w-100 h-100 object-fit-cover" alt="slide" />
            </div>
          </div>
          <button class="carousel-control-prev" type="button" @click="prevSlide">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
          </button>
          <button class="carousel-control-next" type="button" @click="nextSlide">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
          </button>
        </div>
        <div class="container-fluid position-relative" style="margin-top: 30vh;">
          <div class="row">
            <div class="accordion" id="infoAccordion">
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingOne">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold"
                      :class="{ collapsed: activeAccordion !== 0 }"
                      type="button"
                      @click="toggleAccordion(0)"
                      :aria-expanded="activeAccordion === 0"
                      aria-controls="collapseOne"
                  >
                    <p>
                      Gemiddelde, maximum en minimaal waarde van <b class="text-primary fw-semibold">concentration {{ formattedProperty }} nk (µg/m³)</b> van vandaag.
                    </p>
                  </button>
                </h2>
                <div
                    id="collapseOne"
                    class="accordion-collapse collapse"
                    :class="{ show: activeAccordion === 0 }"
                    aria-labelledby="headingOne"
                    data-bs-parent="#infoAccordion"
                >
                  <div class="accordion-body">
                    <div class="col-12 table-responsive overflow-auto" style="max-height: 33vh;">
                      <table class="table table-hover table-bordered">
                        <thead>
                        <tr>
                          <th scope="col">Station</th>
                          <th scope="col">Gemiddelde</th>
                          <th scope="col">maximum</th>
                          <th scope="col">Minimaal</th>
                        </tr>
                        </thead>
                        <tbody class="table-group-divider">
                        <tr v-for="item in geojson.features" :key="item.properties.station_name">
                          <th scope="row">{{ item.properties.station_name }}</th>
                          <td>{{ item.properties.avg_value }}</td>
                          <td>{{ item.properties.max_value }}</td>
                          <td>{{ item.properties.min_value }}</td>
                        </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingTwo">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold"
                      :class="{ collapsed: activeAccordion !== 1 }"
                      type="button"
                      @click="toggleAccordion(1)"
                      :aria-expanded="activeAccordion === 1"
                      aria-controls="collapseTwo"
                  >
                    <p>Beschrijving van fijnstof | <span class="property text-primary">{{ formattedProperty }}</span></p>
                  </button>
                </h2>
                <div
                    id="collapseTwo"
                    class="accordion-collapse collapse"
                    :class="{ show: activeAccordion === 1 }"
                    aria-labelledby="headingTwo"
                    data-bs-parent="#infoAccordion"
                >
                  <div class="accordion-body">
                    <h6 class="description overflow-auto" v-html="description" style="max-height: 40vh;"></h6>
                  </div>
                </div>
              </div>
              <div class="accordion-item">
                <h2 class="accordion-header" id="headingThree">
                  <button
                      class="accordion-button text-primary-emphasis fw-semibold"
                      :class="{ collapsed: activeAccordion !== 2 }"
                      type="button"
                      @click="toggleAccordion(2)"
                      :aria-expanded="activeAccordion === 2"
                      aria-controls="collapseThree"
                  >
                    <p>Bekijk dit filmpje voor meer informatie</p>
                  </button>
                </h2>
                <div
                    id="collapseThree"
                    class="accordion-collapse collapse"
                    :class="{ show: activeAccordion === 2 }"
                    aria-labelledby="headingThree"
                    data-bs-parent="#infoAccordion"
                >
                  <div class="accordion-body">
                    <h5><a href="https://samenmeten.rivm.nl/dataportaal/" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Bekijk dit filmpje voor meer informatie:</a></h5>
                    <h6><a href="https://www.samenmeten.nl/zelf-meten/hoe-kan-ik-zelf-luchtkwaliteit-meten" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Hoe kan ik zelf luchtkwaliteit meten<i class="bi bi-question-lg"></i></a></h6>
                    <div class="embed-responsive embed-responsive-16by9">
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
    <button class="btn btn-light position-fixed top-50 end-0 translate-middle-y" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar" data-bs-backdrop="false" style="z-index: 2;">
      <i class="bi bi-list"></i> Aanvullende informatie
    </button>
  </div>
</template>

<script>
export default {
  name: 'InfoSidebar',
  props: {
    geojson: { type: Object, required: true },
    formattedProperty: { type: String, required: true },
    description: { type: String, required: true }
  },
  data() {
    return {
      images: [
        require('@/assets/car2.png'),
        require('@/assets/car3.png'),
        require('@/assets/car1.png')
      ],
      activeSlide: 0,
      activeAccordion: 0,
      carouselInterval: null
    };
  },
  mounted() {
    this.carouselInterval = setInterval(this.nextSlide, 5000);
  },
  beforeUnmount() {
    clearInterval(this.carouselInterval);
  },
  methods: {
    nextSlide() {
      this.activeSlide = (this.activeSlide + 1) % this.images.length;
    },
    prevSlide() {
      this.activeSlide = (this.activeSlide - 1 + this.images.length) % this.images.length;
    },
    toggleAccordion(index) {
      this.activeAccordion = this.activeAccordion === index ? -1 : index;
    }
  }
};
</script>
