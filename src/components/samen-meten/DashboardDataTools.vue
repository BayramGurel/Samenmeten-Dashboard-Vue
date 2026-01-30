<template>
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
                    <input type="checkbox" :id="checkbox.id" :value="checkbox.id" :name="'regio'" v-model="checkbox.checked" @input="$emit('update-layer')" class="form-check-input">
                    <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingTwo">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseTwo" aria-expanded="false" aria-controls="uniqueCollapseTwo">
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Gemeente</span>
                  <span :class="{'badge rounded-pill bg-danger': gemeente.length === 0, 'badge rounded-pill bg-primary': gemeente.length > 0}">
                    {{ gemeente.length > 0 ? gemeente.length : 'Geen gegevens' }}
                  </span>
                </button>
              </h2>
              <div id="uniqueCollapseTwo" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingTwo" data-bs-parent="#uniqueAccordionExample">
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div v-for="checkbox in gemeente" :key="checkbox.id" class="form-check">
                    <input type="checkbox" :id="checkbox.id" :value="checkbox.id" :name="'Gemeente'" v-model="checkbox.checked" @input="$emit('update-layer')" class="form-check-input">
                    <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingThree">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseThree" aria-expanded="false" aria-controls="uniqueCollapseThree">
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Station</span>
                  <span :class="{'badge rounded-pill bg-danger': stationName.length === 0, 'badge rounded-pill bg-primary': stationName.length > 0}">
                    {{ stationName.length > 0 ? stationName.length : 'Geen gegevens' }}
                  </span>
                </button>
              </h2>
              <div id="uniqueCollapseThree" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingThree" data-bs-parent="#uniqueAccordionExample">
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div class="form-floating mb-2 focused-label">
                    <input type="search" :value="search" ref="searchInput" class="form-control text-primary rounded shadow-sm" @input="onSearchInput" list="stations" id="floatingInput" placeholder=" ">
                    <label for="floatingInput">Zoeken naar een station</label>
                  </div>
                  <datalist id="stations">
                    <option v-for="checkbox in stationName" :key="checkbox.id" :value="checkbox.label"></option>
                  </datalist>
                  <div v-for="checkbox in stationName" :key="checkbox.id" class="form-check">
                    <input type="checkbox" :id="checkbox.id" :value="checkbox.id" :name="'station_name'" v-model="checkbox.checked" @input="$emit('update-layer')" class="form-check-input">
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
                <button class="btn btn-danger py-2 px-3 w-100 fw-medium" type="button" v-else @click="$emit('clear-input', 'localFile')">
                  ← Terug naar server
                </button>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                  <li><a class="dropdown-item" @click="$emit('download-geojson')">GeoJSON</a></li>
                  <li><a class="dropdown-item" @click="$emit('download-csv')">CSV</a></li>
                </ul>
              </div>
            </div>
            <div class="col-12 col-xl-6 text-end">
              <div class="input-group mt-3 text-white w-100">
                <label for="inputGroupFile04" class="btn custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate" style="max-width: 100%;" data-bs-toggle="tooltip" data-bs-placement="right" :title="isLocalFile ? fileName : 'Uploaden | Geojson bestand'">{{ isLocalFile ? fileName : 'Uploaden | Geojson bestand' }}</label>
                <input type="file" id="inputGroupFile04" aria-describedby="inputGroupFileAddon04" aria-label="Upload" ref="localFile" @input="$emit('update-layer')" class="py-2 px-3 w-100">
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
                <input
                  type="radio"
                  class="btn-check"
                  name="btnradio"
                  value="disable"
                  id="disable"
                  autocomplete="off"
                  :checked="interpolationStatus === 'disable'"
                  @change="onInterpolationChange('disable')"
                >
                <label class="btn btn-outline-danger" for="disable">Verbergen</label>
                <input
                  type="radio"
                  class="btn-check"
                  name="btnradio"
                  value="activate"
                  id="activate"
                  autocomplete="off"
                  :checked="interpolationStatus === 'activate'"
                  @change="onInterpolationChange('activate')"
                >
                <label class="btn btn-outline-primary" for="activate">Weergeven op kaart</label>
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
  name: 'DashboardDataTools',
  props: {
    regio: {
      type: Array,
      required: true,
    },
    gemeente: {
      type: Array,
      required: true,
    },
    stationName: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
      required: true,
    },
    interpolationStatus: {
      type: String,
      required: true,
    },
    isLocalFile: {
      type: Boolean,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
  },
  emits: [
    'update-layer',
    'select-matching-stations',
    'update:search',
    'update:interpolationStatus',
    'clear-input',
    'download-geojson',
    'download-csv',
  ],
  methods: {
    onSearchInput(event) {
      this.$emit('update:search', event.target.value);
      this.$emit('select-matching-stations');
    },
    onInterpolationChange(value) {
      this.$emit('update:interpolationStatus', value);
      this.$emit('update-layer');
    },
  },
};
</script>
