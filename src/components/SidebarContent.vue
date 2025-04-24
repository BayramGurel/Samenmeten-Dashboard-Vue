<template>
  <!-- Verbatim content from original component's div.offcanvas-body -->
  <div class="offcanvas-body overflow-auto position-relative">
    <div id="carouselExampleIndicators" class="carousel slide position-absolute top-0 start-0 w-100 h-100" data-bs-ride="carousel">
      <div class="carousel-inner h-100">
        <div class="carousel-item active">
          <img :src="require('@/assets/car2.png')" class="d-block w-100 h-100 object-fit-cover" alt="...">
        </div>
        <div class="carousel-item">
          <img :src="require('@/assets/car3.png')" class="d-block w-100 h-100 object-fit-cover" alt="...">
        </div>
        <div class="carousel-item">
          <img :src="require('@/assets/car1.png')" class="d-block w-100 h-100 object-fit-cover" alt="...">
        </div>
      </div>
    </div>

    <div class="container-fluid position-relative">
      <div class="row">
        <div class="accordion" id="accordionExample">
          <div class="accordion-item">
            <h2 class="accordion-header" id="headingOne">
              <button class="accordion-button text-primary-emphasis fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                <p>Gemiddelde, maximum en minimaal waarde van <b class="text-primary fw-semibold">concentration {{ formattedProperty }} nk (µg/m³)</b> van vandaag.</p>
              </button>
            </h2>
            <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
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
                    <!-- CORRECTED: Reverted to original geojson.features -->
                    <tbody class="table-group-divider" v-if="geojson && geojson.features">
                    <!-- CORRECTED: Reverted to original geojson.features -->
                    <tr v-for="item in geojson.features" :key="item.properties.station_name">
                      <th scope="row">{{ item.properties.station_name }}</th>
                      <td>{{ item.properties.avg_value }}</td>
                      <td>{{ item.properties.max_value }}</td>
                      <td>{{ item.properties.min_value }}</td>
                    </tr>
                    </tbody>
                    <tbody v-else>
                    <tr><td colspan="4">Geen gegevens beschikbaar.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="accordion-item">
            <h2 class="accordion-header" id="headingTwo">
              <button class="accordion-button text-primary-emphasis fw-semibold collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                <p>Beschrijving van fijnstof | <span class="property text-primary">{{ formattedProperty }}</span></p>
              </button>
            </h2>
            <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#accordionExample">
              <div class="accordion-body">
                <h6 class="description overflow-auto" v-html="description" style="max-height: 40vh;"></h6>
              </div>
            </div>
          </div>
          <div class="accordion-item">
            <h2 class="accordion-header" id="headingThree">
              <button class="accordion-button text-primary-emphasis fw-semibold collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                <p>Bekijk dit filmpje voor meer informatie</p>
              </button>
            </h2>
            <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#accordionExample">
              <div class="accordion-body">
                <h5><a href="https://samenmeten.rivm.nl/dataportaal/" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Bekijk dit filmpje voor meer informatie:</a></h5>
                <h6><a href="https://www.samenmeten.nl/zelf-meten/hoe-kan-ik-zelf-luchtkwaliteit-meten" target="_blank" class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Hoe kan ik zelf luchtkwaliteit meten<i class="bi bi-question-lg"></i></a></h6>
                <div class="embed-responsive embed-responsive-16by9">
                  <video controls="" class="embed-responsive-item w-100 rounded">
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
</template>

<script setup>
// No script logic moved here as per plan
// Define props needed for the template
defineProps({
  geojson: {
    type: Object,
    required: true,
  },
  formattedProperty: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  }
});

// No emits needed from this component
</script>

<style scoped>
/* Verbatim styles associated with the moved template elements */
.object-fit-cover { object-fit: cover; }
.table-responsive { /* Original styles */ }
.description { /* Original styles */ }
.embed-responsive { position: relative; display: block; width: 100%; padding: 0; overflow: hidden; }
.embed-responsive::before { display: block; content: ""; }
.embed-responsive .embed-responsive-item, .embed-responsive embed, .embed-responsive iframe, .embed-responsive object, .embed-responsive video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
.embed-responsive-16by9::before { padding-top: 56.25%; }
/* Copy all other relevant original scoped styles */
</style>