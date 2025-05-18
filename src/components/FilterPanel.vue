<template>
  <div class="bg-white rounded p-2 mt-2">
    <nav>
      <div class="nav nav-tabs" role="tablist">
        <button id="nav-filter-tab" class="nav-link active fw-semibold" data-bs-toggle="tab" data-bs-target="#nav-filter" type="button" role="tab" aria-controls="nav-filter" aria-selected="true">Gegevens filteren</button>
        <button id="nav-wms-tab" class="nav-link fw-semibold" data-bs-toggle="tab" data-bs-target="#nav-wms" type="button" role="tab" aria-controls="nav-wms" aria-selected="false">Analysis tools</button>
        <button id="nav-bestanden-tab" class="nav-link fw-semibold" data-bs-toggle="tab" data-bs-target="#nav-bestanden" type="button" role="tab" aria-controls="nav-bestanden" aria-selected="false">Bestandenbeheer</button>
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
                  <span :class="{'badge rounded-pill bg-danger': regio.length === 0, 'badge rounded-pill bg-primary': regio.length > 0}">{{ regio.length > 0 ? regio.length : 'Geen gegevens' }}</span>
                </button>
              </h2>
              <div id="uniqueCollapseOne" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingOne" data-bs-parent="#uniqueAccordionExample">
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div v-for="checkbox in regio" :key="checkbox.id" class="form-check">
                    <input type="checkbox" :id="checkbox.id" :value="checkbox.id" name="regio" v-model="checkbox.checked" @change="$emit('updateLayer')" class="form-check-input">
                    <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingTwo">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseTwo" aria-expanded="false" aria-controls="uniqueCollapseTwo">
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Gemeente</span>
                  <span :class="{'badge rounded-pill bg-danger': gemeente.length === 0, 'badge rounded-pill bg-primary': gemeente.length > 0}">{{ gemeente.length > 0 ? gemeente.length : 'Geen gegevens' }}</span>
                </button>
              </h2>
              <div id="uniqueCollapseTwo" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingTwo" data-bs-parent="#uniqueAccordionExample">
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div v-for="checkbox in gemeente" :key="checkbox.id" class="form-check">
                    <input type="checkbox" :id="checkbox.id" :value="checkbox.id" name="gemeente" v-model="checkbox.checked" @change="$emit('updateLayer')" class="form-check-input">
                    <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header" id="uniqueHeadingThree">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#uniqueCollapseThree" aria-expanded="false" aria-controls="uniqueCollapseThree">
                  <span class="me-2 fw-medium text-primary-emphasis">Selecteer een Station</span>
                  <span :class="{'badge rounded-pill bg-danger': stationName.length === 0, 'badge rounded-pill bg-primary': stationName.length > 0}">{{ stationName.length > 0 ? stationName.length : 'Geen gegevens' }}</span>
                </button>
              </h2>
              <div id="uniqueCollapseThree" class="accordion-collapse collapse" aria-labelledby="uniqueHeadingThree" data-bs-parent="#uniqueAccordionExample">
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <div class="form-floating mb-2">
                    <input type="search" list="stations" v-model="search" class="form-control text-primary rounded shadow-sm" id="floatingInput" placeholder=" " @input="selectMatchingStations">
                    <label for="floatingInput">Zoeken naar een station</label>
                  </div>
                  <datalist id="stations">
                    <option v-for="checkbox in stationName" :key="checkbox.id" :value="checkbox.label"></option>
                  </datalist>
                  <div v-for="checkbox in stationName" :key="checkbox.id" class="form-check">
                    <input type="checkbox" :id="checkbox.id" :value="checkbox.id" name="station_name" v-model="checkbox.checked" @change="$emit('updateLayer')" class="form-check-input">
                    <label :for="checkbox.id" class="form-check-label">{{ checkbox.label }}</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tab-pane fade" id="nav-wms" role="tabpanel" aria-labelledby="nav-wms-tab" tabindex="0">
        <div class="row p-2">
          <div class="col text-center">
            <h3 class="pb-2 text-primary border-bottom border-primary">IDW interpolatie</h3>
            <div class="row my-3">
              <div class="col-10 text-start">{{ interpolationText }}</div>
              <div class="col"><img :src="interpolatieLegend" class="img-fluid rounded w-auto h-75"></div>
              <div class="btn-group btn-group-sm mt-2" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" class="btn-check" name="btnradio" value="disable" id="disable" autocomplete="off" v-model="interpolationStatus" @change="emitInterpolation">
                <label class="btn btn-outline-danger" for="disable">Verbergen</label>
                <input type="radio" class="btn-check" name="btnradio" value="activate" id="activate" autocomplete="off" v-model="interpolationStatus" @change="emitInterpolation">
                <label class="btn btn-outline-primary" for="activate">Weergeven op kaart</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="nav-bestanden" class="tab-pane fade" role="tabpanel" aria-labelledby="nav-bestanden-tab" tabindex="0">
        <div class="container p-2">
          <header class="text-center mb-2">
            <h4 class="pb-2 border-bottom border-primary fw-semibold text-primary">Dashboardgegevens downloaden & uploaden</h4>
          </header>
          <article>
            <h5 class="text-start fw-medium text-primary-emphasis pb-2">Visualisatie en Analyse van GeoJSON-gegevens</h5>
            <p class="text-start text-primary-emphasis">Bij het uploaden van een GeoJSON-bestand faciliteert het dashboard een platform voor de visualisatie van de ingesloten gegevens. Deze bestanden bevatten cruciale informatie die nodig is voor gedetailleerde analyse en visualisatie. Het dashboard fungeert als een effectief instrument voor het interpreteren en begrijpen van deze gegevens.</p>
          </article>
          <div class="row mb-2">
            <div class="col-12 col-xl-6">
              <div class="dropdown mt-3 w-100">
                <button id="dropdownMenuButton1" class="btn btn-primary dropdown-toggle py-2 px-3 w-100 fw-medium" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" v-if="!isLocalFile">Local Bestand | Downloaden</button>
                <button class="btn btn-danger py-2 px-3 w-100 fw-medium" type="button" v-else @click="$emit('clearInput','localFile')">← Terug naar server</button>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
                  <li><a class="dropdown-item" @click.prevent="$emit('downloadGeoJSON')">GeoJSON</a></li>
                  <li><a class="dropdown-item" @click.prevent="$emit('downloadCSV')">CSV</a></li>
                </ul>
              </div>
            </div>
            <div class="col-12 col-xl-6 text-end">
              <div class="input-group mt-3 w-100">
                <label for="inputGroupFile04" class="btn custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate" data-bs-toggle="tooltip" data-bs-placement="right" :title="isLocalFile ? fileName : 'Uploaden | Geojson bestand'">{{ isLocalFile ? fileName : 'Uploaden | Geojson bestand' }}</label>
                <input ref="localFile" type="file" id="inputGroupFile04" class="py-2 px-3 w-100" aria-describedby="inputGroupFile04" @change="$emit('updateLayer')">
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterPanel',
  props: {
    regio: { type: Array, default: () => [] },
    gemeente: { type: Array, default: () => [] },
    stationName: { type: Array, default: () => [] },
    isLocalFile: { type: Boolean, default: false },
    fileName: { type: String, default: '' }
  },
  data() {
    return {
      search: '',
      interpolationStatus: 'disable',
      interpolatieLegend: require('@/assets/interpolatie-legenda.png'),
      interpolationText: 'De ‘IDW Interpolatie’ is een krachtige functie die luchtkwaliteitswaarden op ongemeten locaties voorspelt, waarbij meetpunten in de nabijheid een grotere invloed hebben. Met de ‘Verbergen’ en ‘Weergeven op kaart’ opties kunt u de zichtbaarheid van deze voorspelde waarden op de kaart beheren. Houd er rekening mee dat er bij het eerste gebruik een kleine vertraging kan optreden, maar bij latere toepassingen wordt de interpolatie vloeiend weergegeven. De nauwkeurigheid van de voorspellingen is afhankelijk van de kwaliteit en spreiding van de meetpunten.'
    };
  },
  methods: {
    selectMatchingStations() {
      const term = this.search.toLowerCase();
      this.stationName.forEach(item => { item.checked = item.label.toLowerCase() === term; });
      this.$emit('updateLayer');
    },
    emitInterpolation() {
      this.$emit('idwInterpolation', this.interpolationStatus);
    }
  }
};
</script>

<style scoped>
.custom-file-upload { color: #fff; background-color: #20c997; }
</style>
