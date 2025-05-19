<template>
  <!-- Maplibre map | Sidebar | Created by Bayram Gurel-->
  <div id="map" class="position-absolute w-100 h-100">
    <div class="offcanvas offcanvas-end rounded" tabindex="-1" id="sidebar" style="width: 50%; top: 1%; bottom: 1%;">
      <div class="offcanvas-header">
        <h3 class="offcanvas-title">Informatie over de stations</h3>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
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
    </div>
    <button class="btn btn-light  position-fixed top-50 end-0 translate-middle-y" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar" data-bs-backdrop="false" style="z-index: 2;">
      <i class="bi bi-list"></i> Aanvullende informatie
    </button>
  </div>
  <!--  Above the map  -->
  <div class="container-fluid" id="czoom">
    <div class="position-absolute start-0 shadow mt-3 ms-3 col-md-4 col-8 custom-div">
      <!--  The logo | Hour slider | upload GeoJSON file  -->
      <div class="container bg-white rounded pb-3">
        <div class="row mb-2">
          <div class="col-12">
            <img :src="require('@/assets/PZH-logo.png')" class="img-fluid rounded d-block" title="Refresh website" @click="reloadPage" style="max-width: 70%">
            <h4 class=" text-center text-primary-emphasis m-2">Dashboard voor Luchtkwaliteitsmetingen</h4>
          </div>
        </div>
        <nav>
          <div class="nav nav-tabs" role="tablist">
            <button class="nav-link active fw-semibold" id="nav-leganda-tab" data-bs-toggle="tab" data-bs-target="#nav-leganda" type="button" role="tab" aria-controls="nav-leganda" aria-selected="true">Legenda voor Luchtkwaliteit </button>
            <button class="nav-link fw-semibold" id="nav-contact-tab" data-bs-toggle="tab" data-bs-target="#nav-contact" type="button" role="tab" aria-controls="nav-contact" aria-selected="false">Contactgegevens</button>
          </div>
        </nav>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="nav-leganda" role="tabpanel" aria-labelledby="nav-leganda-tab" tabindex="0">
            <!-- Luchtkwaliteit filters & legenda -->
            <h4 class="my-2 pt-2 text-center text-primary-emphasis">Luchtkwaliteit filters & legenda <i class="bi bi-funnel"></i></h4>

            <!-- SensorData Selection -->
            <div class="col-md-11 mx-auto form-floating">
              <select ref="property" class="form-select form-select-md text-primary fw-semibold text-center shadow-sm" id="floatingSelect" @input="updateLayer" style="background: white !important;">
                <option class="fw-semibold" value="no2">Stikstofdioxide | N02</option>
                <option class="fw-semibold" value="pm10">Fijnstof 10microm | PM10</option>
                <option class="fw-semibold" selected value="pm25">Fijnstof 2.5 microm | PM2,5</option>
              </select>
              <label for="floatingSelect">Selecteer een type sensordata</label>
            </div>
            <!-- Time Selection -->
            <div class="row px-3 mt-2">
              <div class="col-12">
                <label for="timeSlider">Geselecteerd uur: {{ timeValue }}:00</label>
                <input id="timeSlider" ref="timeSlider" class="form-control-range w-100" type="range" min="0" max="23" step="1" v-model="timeValue" @change="updateLayer" @mousedown="stopSlider" :title="'Geselecteerd uur: ' + timeValue + ':00'">
              </div>
            </div>

            <!-- Day Selection -->
            <div class="row pt-2 px-3">
              <div class="col-md-6">
                <div class="form-floating mb-2 focused-label">
                  <input type="search" list="dayNames" v-model="selectedDay" class="form-control text-primary fw-semibold rounded shadow-sm" @input="updateLayer" @click="clearInput('sDate')" id="floatingInput" ref="sDate">
                  <label for="floatingInput">Selecteer een datum</label>
                </div>
                <datalist id="dayNames">
                  <option v-for="(dayName, index) in dayNames" :value="dayName" :key="index">{{ dayName }}</option>
                </datalist>
              </div>

              <!-- Play/Pause Button -->
              <div class="col-md-6 text-center">
                <button id="playSlider" type="button" class="btn py-2 fw-medium w-100" :class="buttonClass" @click="toggleSlider">
                  <i v-if="isPlaying" class="bi bi-pause-circle-fill"></i>
                  <i v-else class="bi bi-google-play"></i>
                  {{ isPlaying ? 'Pauzeren' : 'Afspelen' }}
                </button>
              </div>
            </div>


            <p class="text-center">Concentratie {{ formattedProperty }} nk (µg/m³)</p>
            <!--                <div class="bar rounded">&nbsp;</div>-->
            <div class="row px-2 text-center text-light">
              <div class="col-12 col-xl-6 pb-2 fw-medium" v-for="(value, index) in legendaValues" :key="index">
                <div class="rounded" :style="{ backgroundColor: colors[index] }"><span class='Legenda'>{{ value }}</span></div>
              </div>
            </div>
            <div class="row pt-1">
              <h6 class="col"><small class="text-muted">{{ concentrationValues[0] }} Lage concentratie</small></h6>
              <h6 class="col text-end"><small class="text-muted">Hoge concentratie {{ concentrationValues[1] }}</small></h6>
            </div>
            <div class="row d-none d-xl-block">
              <div class="col pt-2 mx-2 border-top border-success-subtle">
                <span v-html="isFrom"></span>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="nav-contact" role="tabpanel" aria-labelledby="nav-contact-tab" tabindex="0">
            <div class="row p-2">
              <div class="card">
                <div class="card-body">
                  <h3 class="card-title text-center text-success border-bottom pb-2">Contactgegevens</h3>
                  <dl class="row">
                    <dt class="col-sm-3 font-weight-bold text-success">Team</dt>
                    <dd class="col-sm-9">Het Team Geo van de Provincie Zuid-Holland is verantwoordelijk voor het beheer en de toepassing van geografische informatie en technologie.</dd>
                    <dt class="col-sm-3 font-weight-bold text-success">Contact</dt>
                    <dd class="col-sm-9">Voor technische ondersteuning of feedback over de applicatie, kunt u contact opnemen via: <a href="mailto:teamgeo@pzh.nl" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">teamgeo@pzh.nl</a></dd>
                    <dt class="col-sm-3 font-weight-bold text-success">Postadres</dt>
                    <dd class="col-sm-9">Provincie Zuid-Holland Contact Centrum<br>Postbus 90602 - 2509 LP Den Haag</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- filter -->
      <div class="bg-white rounded p-2 mt-2">
        <nav>
          <div class="nav nav-tabs" role="tablist">
            <button class="nav-link active fw-semibold" id="nav-filter-tab" data-bs-toggle="tab" data-bs-target="#nav-filter" type="button" role="tab" aria-controls="nav-filter" aria-selected="true">Gegevens filteren</button>
            <button class="nav-link fw-semibold" id="nav-wms-tab" data-bs-toggle="tab" data-bs-target="#nav-wms" type="button" role="tab" aria-controls="nav-wms" aria-selected="false">Analysis tools</button>
            <button class="nav-link fw-semibold" id="nav-bestanden-tab" data-bs-toggle="tab" data-bs-target="#nav-bestanden" type="button" role="tab" aria-controls="nav-bestanden" aria-selected="false">Bestandenbeheer</button>
          </div>
        </nav>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="nav-filter" role="tabpanel" aria-labelledby="nav-filter-tab" tabindex="0">
            <h3 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">Filteren van stations</h3>
            <div class="row p-2">
              <div class="accordion accordion-flush" id="uniqueAccordionExample">
                <div class="accordion-item">
                  <h2 class="accordion-header" id="uniqueHeadingOne">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseOne" aria-expanded="false" aria-controls="uniqueCollapseOne">
                      <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Regio</span>
                      <span :class="{'badge rounded-pill bg-danger': regio.length === 0, 'badge rounded-pill bg-primary': regio.length > 0}">
                        {{ regio.length > 0 ? regio.length : 'Geen gegevens' }}
                      </span>
                    </button>
                  </h2>
                  <div id="uniqueCollapseOne" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingOne" data-bs-parent="#uniqueAccordionExample">
                    <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                      <div v-for="checkbox in regio" :key="checkbox.id" class="form-check">
                        <input type="checkbox" :id="checkbox.id" :value="checkbox.id" :name="'regio'" v-model="checkbox.checked" @input="updateLayer" class="form-check-input">
                        <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="accordion-item">
                  <h2 class="accordion-header" id="uniqueHeadingTwo">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseTwo" aria-expanded="false" aria-controls="uniqueCollapseTwo">
                      <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Gemeente</span>
                      <span :class="{'badge rounded-pill bg-danger': Gemeente.length === 0, 'badge rounded-pill bg-primary': Gemeente.length > 0}">
                        {{ Gemeente.length > 0 ? Gemeente.length : 'Geen gegevens' }}
                      </span>
                    </button>
                  </h2>
                  <div id="uniqueCollapseTwo" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingTwo" data-bs-parent="#uniqueAccordionExample">
                    <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                      <div v-for="checkbox in Gemeente" :key="checkbox.id" class="form-check">
                        <input type="checkbox" :id="checkbox.id" :value="checkbox.id" :name="'Gemeente'" v-model="checkbox.checked" @input="updateLayer" class="form-check-input">
                        <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="accordion-item">
                  <h2 class="accordion-header" id="uniqueHeadingThree">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseThree" aria-expanded="false" aria-controls="uniqueCollapseThree">
                      <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Station</span>
                      <span :class="{'badge rounded-pill bg-danger': station_name.length === 0, 'badge rounded-pill bg-primary': station_name.length > 0}">
                        {{ station_name.length > 0 ? station_name.length : 'Geen gegevens' }}
                      </span>
                    </button>
                  </h2>
                  <div id="uniqueCollapseThree" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingThree" data-bs-parent="#uniqueAccordionExample">
                    <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                      <div class="form-floating mb-2 focused-label">
                        <input type="search" v-model="search" ref="searchInput" class="form-control text-primary rounded shadow-sm" @input="selectMatchingStations" list="stations" id="floatingInput" placeholder=" ">
                        <label for="floatingInput">Zoeken naar een station</label>
                      </div>
                      <datalist id="stations">
                        <option v-for="checkbox in station_name" :key="checkbox.id" :value="checkbox.label"></option>
                      </datalist>
                      <div v-for="checkbox in station_name" :key="checkbox.id" class="form-check">
                        <input type="checkbox" :id="checkbox.id" :value="checkbox.id" :name="'station_name'" v-model="checkbox.checked" @input="updateLayer" class="form-check-input">
                        <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <section id="nav-bestanden" class="tab-pane fade" role="tabpanel" aria-labelledby="nav-bestanden-tab" tabindex="0">
            <div class="container p-2">
              <!-- Header -->
              <header class="text-center mb-2">
                <h4 class="pb-2 border-bottom border-primary fw-semibold text-primary">Dashboardgegevens downloaden & uploaden</h4>
              </header>
              <!-- Article -->
              <article>
                <h5 class="text-start fw-medium text-primary-emphasis pb-2">Visualisatie en Analyse van GeoJSON-gegevens </h5>
                <p class="text-start text-primary-emphasis">Bij het uploaden van een GeoJSON-bestand faciliteert het dashboard een platform voor de visualisatie van de ingesloten gegevens. Deze bestanden bevatten cruciale informatie die nodig is voor gedetailleerde analyse en visualisatie. Het dashboard fungeert als een effectief instrument voor het interpreteren en begrijpen van deze gegevens.</p>
              </article>
              <!-- File Upload Section -->
              <div class="row mb-2">
                <div class="col-12 col-xl-6">
                  <div class="dropdown mt-3 w-100">
                    <button class="btn btn-primary dropdown-toggle py-2 px-3 w-100 fw-medium" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false" v-if="!isLocalFile">
                      Local Bestand | Downloaden
                    </button>
                    <button class="btn btn-danger py-2 px-3 w-100 fw-medium" type="button" v-else @click="clearInput('localFile')">
                      ← Terug naar server
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                      <li><a class="dropdown-item" @click="downloadGeoJSON">GeoJSON</a></li>
                      <li><a class="dropdown-item" @click="downloadCSV">CSV</a></li>
                    </ul>
                  </div>
                </div>
                <div class="col-12 col-xl-6 text-end">
                  <div class="input-group mt-3 text-white w-100">
                    <label for="inputGroupFile04" class="btn custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate" style="max-width: 100%;" data-bs-toggle="tooltip" data-bs-placement="right" :title="isLocalFile ? fileName : 'Uploaden | Geojson bestand'">{{ isLocalFile ? fileName : 'Uploaden | Geojson bestand' }}</label>
                    <input type="file" id="inputGroupFile04" aria-describedby="inputGroupFileAddon04" aria-label="Upload" ref="localFile" @input="updateLayer" class="py-2 px-3 w-100">
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div class="tab-pane fade" id="nav-wms" role="tabpanel" aria-labelledby="nav-wms-tab" tabindex="0">
            <div class="row p-2">
              <div class="col text-center">
                <h3 class="pb-2 text-primary border-bottom border-primary">IDW interpolatie</h3>
                <div class="row my-3">
                  <div class="col-10 text-start">
                    De ‘IDW Interpolatie’ is een krachtige functie die luchtkwaliteitswaarden op ongemeten locaties
                    voorspelt, waarbij meetpunten in de nabijheid een grotere invloed hebben. Met de ‘Verbergen’ en
                    ‘Weergeven op kaart’ opties kunt u de zichtbaarheid van deze voorspelde waarden op de kaart beheren.<br><br>Houd er
                    rekening mee dat er bij het eerste gebruik een kleine vertraging kan optreden, maar bij latere
                    toepassingen wordt de interpolatie vloeiend weergegeven. De nauwkeurigheid van de voorspellingen is
                    afhankelijk van de kwaliteit en spreiding van de meetpunten.
                  </div>
                  <div class="col">
                    <img :src="require('@/assets/interpolatie-legenda.png')" class="img-fluid rounded w-auto h-75">
                  </div>
                  <div class="btn-group btn-group-sm mt-2" role="group" aria-label="Basic radio toggle button group">
                    <input type="radio" class="btn-check" name="btnradio" value="disable" id="disable" autocomplete="off" v-model="interpolationStatus" @change="updateLayer">
                    <label class="btn btn-outline-danger" for="disable">Verbergen</label>
                    <input type="radio" class="btn-check" name="btnradio" value="activate" id="activate" autocomplete="off" v-model="interpolationStatus" @change="updateLayer">
                    <label class="btn btn-outline-primary" for="activate">Weergeven op kaart</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div class="toast-container position-fixed bottom-0 end-0 p-3 content-none" style="z-index: 9999;">
      <div ref="liveToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi bi-patch-check me-2"></i>
            De bestanden zijn gedownload.
            <small class="d-block mt-1">{{ timeString }}</small>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// npm run build
// npm install gh-pages --save-dev
// npm run deploy

// Created by Bayram Gurel
import { data } from '@/data/variable.js';

export default {
  name: 'SamenMetenDashboard',
  data() {
    return data;
  },

  computed: {
    dayNames() {
      return Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return this.formatDate(date);
      });
    },
    buttonClass() {
      return this.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary';
    },
    formattedProperty() {
      const propertyMap = {
        'pm25': 'PM2,5',
        'pm10': 'PM10',
        'no2': 'NO2'
      };

      return propertyMap[this.property] || this.property;
    }
  },

  watch: {
    selectedDay(newVal) {
      if (this.dayNames.includes(newVal)) {
        this.updateLayer();
      }
    },
  },

  created() {
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`;
    this.checkHourChange();
  },

  async mounted() {
    document.getElementById('czoom').style.zoom = "87%";
    document.getElementById('czoom2').style.zoom = "113%";
    document.getElementById('sidebar').style.zoom = "87%";


    this.initializeMap();
    this.addControls();
    this.elements = this.ids.reduce((acc, id) => {
      acc[id] = this.$refs[id];
      return acc;
    }, {});

    this.geojson = await this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');

    [this.regios, this.gemeentes, this.stName] = await Promise.all([
      this.getUniqueItems(this.geojson, 'regio'),
      this.getUniqueItems(this.geojson, 'Gemeente'),
      this.getUniqueItems(this.geojson, 'station_name')
    ]);

    this.createCheckboxes('regio', this.regios);
    this.createCheckboxes('Gemeente', this.gemeentes);
    this.createCheckboxes('station_name', this.stName);
    this.selectedDay = this.dayNames[0];
    this.updateLayer();
  },
  beforeUnmount() {
    this._destroyChart();
  },
  methods: {
    async initializeMap() {
      this.map = new window.maplibregl.Map({
        container: 'map',
        style: this.STYLE_URL,
        center: [4.218788, 52.008663],
        zoom: 8.9,
      });

      this.map.on('load', () => {
        this.addLineSourceAndLayer();
        this.addWindLayer();
      });
    },

    async addLineSourceAndLayer() {
      if (!this.map.getSource('line')) {
        this.map.addSource('line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: this.bbox
            }
          }
        });
      }
      if (!this.map.getLayer('line')) {
        this.map.addLayer({
          id: 'line',
          type: 'line',
          source: 'line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ff0000',
            'line-width': 1.4,
            'line-opacity': 0.8,
            'line-blur': 0.5
          }
        });
      }
    },

    _destroyChart() {
      if (this.myChart) {
        this.myChart.destroy();
        this.myChart = null;
        console.log('chart destroyed');
      }
    },

    async addControls() {
      this.addStyleSwitchControl();
      this.map.addControl(new window.maplibregl.FullscreenControl());
      this.map.addControl(new window.maplibregl.NavigationControl());
      this.map.addControl(new window.maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }));
    },

    addStyleSwitchControl() {
      const styleSwitcher = this.createStyleSwitcher();
      const styleSwitchControl = this.createStyleSwitchControl(styleSwitcher);

      this.map.addControl(styleSwitchControl);
    },

    createStyleSwitcher() {
      const styleSwitcherContainer = document.createElement('div');
      styleSwitcherContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group';

      const label = document.createElement('label');
      label.className = 'fw-semibold text-success';
      label.innerText = 'Selecteer achtergrond:';
      styleSwitcherContainer.appendChild(label);

      const styleSwitcher = document.createElement('select');
      styleSwitcher.className = 'form-select form-select-sm'; // Bootstrap's form control class
      styleSwitcher.style.fontSize = '1.2em';
      styleSwitcher.style.cursor = 'pointer';

      const styles = this.STYLE_URLS.map(url => `${url}${this.API_KEY}`);

      styles.forEach((style, index) => {
        const option = document.createElement('option');
        option.value = style;
        option.text = this.STYLE_NAMES[index] || `Style ${index + 1}`;
        styleSwitcher.appendChild(option);
      });

      styleSwitcher.onchange = async (event) => {
        try {
          this.map.setStyle(event.target.value);
          setTimeout(() => {
            this.updateLayer();
            this.addLineSourceAndLayer();
          }, 50);
        } catch (error) {
          console.error('An error occurred while switching styles:', error);
        }
      };

      styleSwitcherContainer.appendChild(styleSwitcher);

      return styleSwitcherContainer;
    },

    createStyleSwitchControl(styleSwitcher) {
      return {
        onAdd: () => {
          return styleSwitcher;
        },
        onRemove: function () {
        },
        getDefaultPosition: function () {
          return 'top-right';
        },
      };
    },


    async reloadPage() {
      window.location.reload();
    },
    clearInput(refName) {
      this.$refs[refName].value = '';
      if (refName === 'sDate') {
        this.selectedDay = '';
      } else {
        this.updateLayer()
      }
    },

    async checkHourChange() {
      setInterval(async () => {
        this.updateLayer();
      }, 1000 * 60 * 20);
    },

    formatDate(date) {
      const dayName = this.days[date.getDay()];
      const dateString = date.toLocaleDateString('nl-NL', {day: 'numeric', month: 'long', year: 'numeric'});
      return `${dayName} | ${dateString}`;
    },

    async toggleSlider() {
      this.isPlaying = !this.isPlaying;
      this.isPlaying ? this.startSlider() : this.stopSlider();
    },
    async startSlider() {
      this.interval && clearInterval(this.interval);
      const today = this.formatDate(new Date());
      const maxHour = this.selectedDay === today ? new Date().getHours() : 23;
      this.timeValue = 0;
      this.updateLayer();
      this.interval = setInterval(() => {
        if (this.timeValue < maxHour) {
          this.timeValue++;
          this.updateLayer();
        } else {
          this.stopSlider();
          this.isPlaying = false;
        }
      }, 1550);
    },
    stopSlider() {
      clearInterval(this.interval);
      this.interval = null;
    },

    async selectMatchingStations() {
      const lowerCaseSearch = this.search.toLowerCase();
      this.station_name.forEach(station => {
        station.checked = station.label.toLowerCase() === lowerCaseSearch;
      });
      this.updateLayer();
    },

    async fetchData(url) {
      let response = await fetch(url, {method: "GET", credentials: "include", keepalive: true});

      return await response.json();
    },

    async loadLocalFile() {
      try {
        let geojson = JSON.parse(await this.elements.localFile.files[0].text());
        geojson.Features = geojson.features;
        delete geojson.features;
        return geojson;
      } catch (error) {
        console.error('Error reading local file:', error);
        throw error;
      }
    },


    async getUniqueItems(geojson, uniqueColumn) {
      return [...new Set(geojson.Features.map(Feature => Feature.properties?.[uniqueColumn]))];
    },

    async createCheckboxes(id, items) {
      const selectedItems = this[id] ? this[id].filter(i => i.checked).map(i => i.id) : [];
      this[id] = items.sort().map(item => ({
        id: item,
        label: item,
        checked: selectedItems.includes(item)
      }));
    },

    async getSelectedValues(name) {
      return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(input => input.value);
    },

    // Created by Bayram Gurel
    async updateLayer() {
      const prop = this.propValues[this.elements.property.value] || this.propValues.default;
      this.property = prop.property;
      this.description = prop.description;
      this.legendaValues = prop.legendaValues;
      this.concentrationValues = prop.concentrationValues;

      const selectedRegio = await this.getSelectedValues('regio');
      const selectedGemeente = await this.getSelectedValues('Gemeente');
      const selectedStName = await this.getSelectedValues('station_name');
      this.reloadLayer(this.map, this.elements.timeSlider.value, selectedRegio, selectedGemeente, selectedStName).catch(error => console.error('Error reloading layer:', error));
    },

    async reloadLayer(map, hour, selectedRegio, selectedGemeente, selectedStName) {
      try {
        const {files: localFiles = []} = this.$refs.localFile || {};
        this.isLocalFile = localFiles.length > 0;
        this.fileName = this.isLocalFile ? localFiles[0].name : 'Geojson bestand | Uploaden'; // Update the label text
        this.isFrom = this.isLocalFile ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold"">van jouw Local File</span>' : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata. Bekijk de metadata voor details over de serverdata.</a>';
        // console.time('myTimer');
        const selectedDateIndex = this.dayNames.indexOf(this.elements.sDate.value);
        await this.filterGeojsonFeatures(hour, selectedDateIndex, this.elements.property.value, selectedRegio, selectedGemeente, selectedStName, this.isLocalFile); // console.timeEnd('myTimer');
        this.updateMapSourceAndLayer(map, this.geojson);
      } catch (error) {
        console.error(error);
      }
    },

    async filterGeojsonFeatures(hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile) {
      const now = new Date();
      now.setDate(now.getDate() - selectedDateIndex);

      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour) + now.getTimezoneOffset() / 60));
      const measured_time = date.toISOString().replace('T', '%20').substring(0, 19) + '00';

      if (this.interpolationStatus === 'activate') {
        this.idw_interpolation(date.toISOString());
      } else if (this.currentLayerId && this.map.getLayer(this.currentLayerId)) {
        this.map.setPaintProperty(this.currentLayerId, 'raster-opacity', 0);
      }

      const filters = {
        'property': selectedProperty,
        'station': selectedStName.length > 0 ? selectedStName : [],
        'gemeente': selectedStName.length > 0 ? [] : (selectedGemeente.length > 0 ? selectedGemeente : []),
        'regio': selectedStName.length > 0 || selectedGemeente.length > 0 ? [] : (selectedRegio.length > 0 ? selectedRegio : [])
      };

      let filteredGeojson;
      if (isLocalFile) {
        filteredGeojson = await this.loadLocalFile(isLocalFile);
      } else {
        let url1 = new URL('https://dta-samenmeten-api.azurewebsites.net/api/data/stations');
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.length > 0) url1.searchParams.append(key, value);
        });

        let url2 = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selectedProperty}&measured_time=${measured_time}`);

        // Fetch data in parallel
        let [stations, observations] = await Promise.all([this.fetchData(url1.toString()), this.fetchData(url2.toString())]);

        let observationMap = new Map();
        observations.Features.forEach(observation => {
          observationMap.set(observation.properties.station_name, observation);
        });

        filteredGeojson = {
          type: 'FeatureCollection',
          Features: stations.Features.filter(station => {
            let matchingObservation = observationMap.get(station.properties.station_name);
            if (matchingObservation) {
              matchingObservation.properties.avg_value = station.properties.avg_value;
              matchingObservation.properties.max_value = station.properties.max_value;
              matchingObservation.properties.min_value = station.properties.min_value;
              station.properties = {...matchingObservation.properties};
              station.geometry = matchingObservation.geometry;
              return true;
            }
            return false;
          })
        };
      }
      this.geojson = filteredGeojson;

      [this.regios, this.gemeentes, this.stName] = await Promise.all([this.getUniqueItems(this.geojson, 'regio'), this.getUniqueItems(this.geojson, 'Gemeente'), this.getUniqueItems(this.geojson, 'station_name')]);

      this.createCheckboxes('regio', this.regios);
      this.createCheckboxes('Gemeente', this.gemeentes);
      this.createCheckboxes('station_name', this.stName);
    },

    // Created by Bayram Gurel
    async idw_interpolation(date) {
      let bounds = [3.773675345120739, 51.64377788724585, 5.031415001585676, 52.3325109475691];
      let layerId = 'interpolatie-' + date + '-' + this.elements.property.value;

      // Add the layerId to the rasterLayers set if it's not already there
      this.rasterLayers.add(layerId);

      // Set the opacity of all layers to 0, except for the current one
      this.rasterLayers.forEach(id => {
        if (this.map.getLayer(id)) {
          this.map.setPaintProperty(id, 'raster-opacity', id === layerId ? 1 : 0);
        }
      });

      this.currentLayerId = layerId;

      if (!this.map.getLayer(layerId)) {
        let url = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${this.elements.property.value}_sqldb&bbox=${bounds.join(',')}&time=${date}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`;
        console.log(url)
        this.map.addSource(layerId, {
          'type': 'image',
          'url': url,
          'coordinates': [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]]
        });
        this.map.addLayer({'id': layerId, 'type': 'raster', 'source': layerId, 'paint': {'raster-opacity': 1}});
      }
    },

    async downloadGeoJSON() {
      let dataStr = JSON.stringify(this.geojson);
      let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      let link = document.createElement('a');
      link.href = dataUri;
      link.download = `PZH-Luchtkwaliteit_${this.property}.geojson`;
      this.toast();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    async downloadCSV() {
      const CSV_HEADER = 'Station naam;Datum en tijd;Property;Regio;Gemeente;Value;Unit\n';
      const DEFAULT_VALUE = 'N/A';
      let csv = CSV_HEADER;

      this.geojson.features.forEach(feature => {
        let properties = feature.properties;
        let station_name = properties?.station_name || DEFAULT_VALUE;
        let measured_time = properties?.measured_time ? new Date(properties.measured_time).toISOString() : DEFAULT_VALUE; // Change here
        let property = properties?.property || DEFAULT_VALUE;
        let regio = properties?.regio || DEFAULT_VALUE;
        let gemeente = properties?.Gemeente || DEFAULT_VALUE;
        let value = properties?.value !== undefined ? `${properties.value.toFixed(2)}` : DEFAULT_VALUE;
        let unit = properties?.unit || DEFAULT_VALUE;

        csv += `${station_name}; ${measured_time}; ${property}; ${regio}; ${gemeente}; ${value}; ${unit}\n`; // Added newline character here
      });

      let link = document.createElement('a');
      link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      link.download = 'Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.csv';
      this.toast();

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    async toast() {
      // Show the toast
      const toastLiveExample = this.$refs.liveToast;
      const toastBootstrap = window.bootstrap.Toast.getOrCreateInstance(toastLiveExample);
      // Update the time in the toast
      const now = new Date();
      this.timeString = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
      toastBootstrap.show();
    },
    //
    // async downloadPDF(geojson) {
    //   let doc = new window.jsPDF();
    //   let canvas = document.createElement('canvas');
    //   canvas.width = 200;
    //   canvas.height = 100;
    //   let ctx = canvas.getContext('2d');
    //
    //   let labels = geojson.features.map(feature => feature.properties?.station_name || 'N/A');
    //   let data = geojson.features.map(feature => feature.properties?.value || 0);
    //
    //   let chart = new window.Chart(ctx, {
    //     type: 'bar',
    //     data: {
    //       labels: labels,
    //       datasets: [{
    //         label: 'Value',
    //         data: data,
    //         backgroundColor: 'rgba(75, 192, 192, 0.2)',
    //         borderColor: 'rgba(75, 192, 192, 1)',
    //         borderWidth: 1
    //       }]
    //     },
    //     options: {
    //       animation: {
    //         onComplete: function() {
    //           canvas.toBlob(function(blob) {
    //             if (blob) {
    //               let img = new Image();
    //               img.onload = function() {
    //                 doc.addImage(img, 'PNG', 10, 10, 180, 90);
    //                 doc.save('Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.pdf');
    //               };
    //               img.src = URL.createObjectURL(blob);
    //             } else {
    //               console.log('Blob does not exist');
    //             }
    //           });
    //         }
    //       },
    //       scales: {
    //         y: {
    //           beginAtZero: true
    //         }
    //       }
    //     }
    //   });
    // },


    updateMapSourceAndLayer(map, geojson) {
      if (!geojson || !geojson.Features) return;
      geojson.features = geojson.Features;
      delete geojson.Features;
      if (!map.getSource('stations')) {
        map.addSource("stations", {type: 'geojson', data: geojson});
      } else {
        map.getSource('stations').setData(geojson);
      }
      if (!map.getLayer('stations')) {
        this.addStationsLayer();
      }
    },

    getCircleColor() {
      return [
        'case',
        ['==', ['get', 'property'], 'pm25'],
        ['step', ['get', 'value'], '#1E90FF', 8.3, '#48D1CC', 16.7, '#9ACD32', 25, '#DAA520', Infinity, '#000000'],
        ['in', ['get', 'property'], ['literal', ['no2', 'pm10']]],
        ['step', ['get', 'value'], '#1E90FF', 13.3, '#48D1CC', 26.6, '#9ACD32', 40, '#DAA520', Infinity, '#000000'],
        '#000000' // default output for 'case'
      ];
    },

    addStationsLayer() {
      this.map.addLayer({
        'id': 'stations',
        'type': 'circle',
        'source': 'stations',
        'paint': {
          'circle-radius': 6,
          'circle-color': this.getCircleColor(),
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.8,
        }
      });
      this.map.on('click', 'stations', this.handleStationClick);
    },

    async handleStationClick(e) {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['stations'] });

      if (features.length > 1) {
        this.createDropdownPopup(features, e);
      } else {
        this.createDetailPopup(e.features[0], e);
      }
    },

    // Created by Bayram Gurel
    async createDropdownPopup(features, e) {
      let dropdownHTML = `
    <div class="card text-center border-primary">
      <div class="card-header bg-primary text-white">
        <h6>Selecteer Station <i class="bi bi-search"></i></h6>
      </div>
      <div class="card-body">
        <div class="dropdown">
          <button class="btn btn-outline-primary dropdown-toggle" type="button" id="stationSelect" data-bs-toggle="dropdown" aria-expanded="false">
            Kies een station
          </button>
          <div class="dropdown-menu" aria-labelledby="stationSelect" style="height: 200px; overflow-y: auto;">
            `;
      features.forEach((feature, index) => {
        const color = this.getColor(feature.properties.value, feature.properties.property, 1);
        dropdownHTML += `
              <a class="dropdown-item" href="#" data-value="${index}">
                <i class="bi bi-geo-alt-fill" style="color: ${color};"></i> ${feature.properties.station_name}
              </a>`;
      });
      dropdownHTML += `
          </div>
        </div>
      </div>
    </div>
  `;

      const popup = new window.maplibregl.Popup({className: 'my-popup'})
          .setLngLat(e.lngLat)
          .setHTML(dropdownHTML)
          .addTo(this.map);

      this.$nextTick(() => {
        const dropdownItems = Array.from(popup.getElement().querySelectorAll('.dropdown-item'));
        dropdownItems.forEach(item => {
          item.addEventListener('click', (event) => {
            event.preventDefault();
            popup.remove();
            this.createDetailPopup(features[event.target.dataset.value], e);
          });
        });
      });
    },

    async createDetailPopup(feature, e) {
      const {properties} = feature;
      this.properties = properties
      const popup = new window.maplibregl.Popup({className: 'my-popup'})
          .setLngLat(e.lngLat)
          .setHTML(this.getPopupHTML(properties))
          .addTo(this.map);

      this.$nextTick(() => {
        const button = popup.getElement().querySelector('button');
        button.addEventListener('click', async () => {
          button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status">Loading...</span>';
          try {
            await this.loadChart(properties);
          } finally {
            button.innerHTML = 'Informatie over station';
            popup.remove();
          }
        });
      });
    },


    getPopupHTML({station_name, property, value, unit, Gemeente, regio, measured_time}) {
      const formattedDate = new Date(measured_time).toLocaleString('nl-NL', {
        timeZone: 'GMT',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const color = this.getColor(value, property, 1);
      return `
  <div class="card text-center" style="border-color: ${color};">
    <div class="card-header" style="background-color: ${color}; color: white;">
      <h6>Station naam: ${station_name}</h6>
    </div>
    <div class="card-body">
      <h6 class="card-title">Component en meetwaarde:<br>${property}: ${value} ${unit}</h6>
      <h6>Beschrijving:<br>Gemeente ${Gemeente} - Regio ${regio}</h6>
      <h6 class="card-text">
        <small class="text-muted">Laatst update: ${formattedDate}</small>
      </h6>
<button class="btn mt-3" type="button" data-bs-toggle="modal" data-bs-target="#modalWithBothOptions" style="background-color: ${color}; color: white;" data-properties='${JSON.stringify({station_name, property, value, unit, Gemeente, regio, measured_time})}'>        Informatie over station
      </button>
    </div>
  </div>`;
    },

    async loadChart(properties) {
      try {
        this._destroyChart();

        const url = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${properties.station_name}&property=${properties.property}&location=${properties.location_uuid}`);
        console.log(url)
        console.log(properties)
        const observationData = await this.fetchData(url.toString());
        const dataByDate = this.processData(observationData);
        const datasets = this.createDatasets(properties.property, dataByDate);
        this.$nextTick(() => {
          if (this.$refs.myChart) {
            this.myChart = this.createChart(this.$refs.myChart, properties.property, dataByDate, datasets);
          }
        });
      } catch (error) {
        console.error(`An error occurred while loading the chart: ${error}`);
      }
    },

    processData(observationData) {
      return observationData.Features.reduce((dataByDate, feature) => {
        let date = new Date(feature.properties.measured_time);
        let dateString = date.toISOString().split('T')[0];
        let hourIndex = date.getUTCHours();
        if (!dataByDate[dateString]) {
          dataByDate[dateString] = {
            times: Array.from({length: 24}, (_, i) => i < 10 ? `0${i}:00 GMT` : `${i}:00 GMT`),
            values: Array(24).fill(null)
          };
        }
        dataByDate[dateString].values[hourIndex] = feature.properties.value;
        return dataByDate;
      }, {});
    },

    // Created by Bayram Gurel
    createDatasets(property, dataByDate) {
      const datasets = Object.entries(dataByDate).map(([date, data]) => {
        const values = data.values;
        const backgroundColors = values.map(value => this.getColor(value, property, '0.4'));
        const dateObj = new Date(date);
        const borderColor = this.dayColors[dateObj.getDay()];

        return {
          label: dateObj.toLocaleDateString('nl-NL', {
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }),
          dateString: date,
          data: values,
          originalBackgroundColor: [...backgroundColors],
          backgroundColor: backgroundColors,
          borderColor: borderColor,
          borderWidth: 2,
          borderRadius: { topLeft: 3, topRight: 3 },
          hidden: true
        };
      });
      datasets.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
      if (datasets.length > 0) {
        datasets[datasets.length - 1].hidden = false;
      }
      return datasets;
    },

    createChart(propertyChart, property, dataByDate, datasets) {
      const yMin = property === "pm25" ? 25 : 40;
      this.myChart = new window.Chart(propertyChart, {
        type: 'bar',
        data: {
          labels: dataByDate[Object.keys(dataByDate)[0]].times,
          datasets: datasets
        },
        options: {
          ...this.chartOptions,
          plugins: {
            ...this.chartOptions.plugins,
            annotation: {
              annotations: [
                {
                  type: 'box',
                  yMin: yMin,
                  backgroundColor: 'rgba(230, 25, 75, 0.1)',
                  borderColor: 'rgba(230, 25, 75, 1)',
                  label: {
                    content: 'Bad',
                    enabled: true,
                    position: 'center',
                  }
                },
              ]
            },
            legend: {
              display: true,
              onHover: (evt, item, legend) => this.handleHover(evt, item, legend),
              onLeave: (evt, item, legend) => this.handleLeave(evt, item, legend)
            }
          },
        }
      });
      return this.myChart;
    },


    async handleHover(evt, item, legend) {
      legend.chart.data.datasets.forEach((dataset, datasetIndex) => {
        dataset.backgroundColor = datasetIndex === item.datasetIndex ?
            dataset.originalBackgroundColor.map(color => {
              let rgba = color.slice(0, -1).split(",");
              rgba[3] = '0.8)';
              return rgba.join(",");
            }) :
            dataset.originalBackgroundColor.map(color => {
              let rgba = color.slice(0, -1).split(",");
              rgba[3] = '0.1)';
              return rgba.join(",");
            });
      });
      legend.chart.update();
    },

    async handleLeave(evt, item, legend) {
      legend.chart.data.datasets.forEach(dataset => {
        dataset.backgroundColor = dataset.originalBackgroundColor;
      });
      legend.chart.update();
    },

    getColor(value, property, alpha) {
      const valueColor = property === "pm25" ? [8.3, 16.7, 25, Infinity] : [13.3, 26.6, 40, Infinity];
      const colors = ['rgba(30, 144, 255,', 'rgba(72, 209, 204,', 'rgba(154, 205, 50,', 'rgba(218, 165, 32,'];

      const colorIndex = valueColor.findIndex(threshold => value < threshold);
      const color = colors[colorIndex] !== undefined ? colors[colorIndex] : colors[colors.length - 1];

      return `${color}${alpha})`;
    }
  },
};
// Created by Bayram Gurel
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
/* Custom File Input Styles */
.input-group input[type="file"] {
  display: none; /* Hide the default file input */
}

.input-group .custom-file-upload {
  color: #fff;
  background-color: #20c997;
}

.custom-div {
  position: relative;
  max-height: 97%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
}

/* Style the scrollbar */
*::-webkit-scrollbar {
  width: 0.5vw; /* Decrease scrollbar width */
}

/* Handle */
*::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 0.5vw; /* Make it round */
}

/* Handle on hover */
*::-webkit-scrollbar-thumb:hover {
  background: #555; /* Change color on hover */
}

* ::selection {
  font-family: Arial !important;
  background-color: #d11f3d;
  color: white;
}
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
/* Created by Bayram Gurel */
</style>