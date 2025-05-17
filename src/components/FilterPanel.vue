<template>
  <div class="bg-white rounded p-2 mt-2">
    <nav>
      <div class="nav nav-tabs" role="tablist">
        <button class="nav-link active fw-semibold" data-bs-toggle="tab" data-bs-target="#nav-filter" type="button" role="tab" aria-selected="true">Gegevens filteren</button>
        <button class="nav-link fw-semibold" data-bs-toggle="tab" data-bs-target="#nav-wms" type="button" role="tab" aria-selected="false">Analysis tools</button>
        <button class="nav-link fw-semibold" data-bs-toggle="tab" data-bs-target="#nav-bestanden" type="button" role="tab" aria-selected="false">Bestandenbeheer</button>
      </div>
    </nav>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="nav-filter" role="tabpanel">
        <h3 class="py-2 text-center text-primary-emphasis border-bottom border-secondary-subtle">Filteren van stations</h3>
        <div class="row p-2">
          <div class="accordion accordion-flush" id="filterAccordion">
            <div class="accordion-item" v-for="(group, idx) in filterGroups" :key="idx">
              <h2 class="accordion-header" :id="`filterHeading${idx}`">
                <button class="accordion-button collapsed" type="button" @click="toggleFilter(idx)" :aria-expanded="activeFilter === idx" :aria-controls="`filterCollapse${idx}`">
                  <span class="me-2 fw-medium text-primary-emphasis">{{ group.label }}</span>
                  <span :class="{'badge rounded-pill bg-danger': group.items.filter(i=>i.checked).length===0, 'badge rounded-pill bg-primary': group.items.filter(i=>i.checked).length>0}">{{ group.items.filter(i=>i.checked).length>0?group.items.filter(i=>i.checked).length:'Geen gegevens' }}</span>
                </button>
              </h2>
              <div :id="`filterCollapse${idx}`" class="accordion-collapse collapse" :class="{ show: activeFilter===idx }" :aria-labelledby="`filterHeading${idx}`" data-bs-parent="#filterAccordion">
                <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
                  <template v-if="group.key==='station_name'">
                    <div class="form-floating mb-2">
                      <input type="search" v-model="search" @input="applySearch" list="stationsList" class="form-control text-primary rounded shadow-sm" id="searchStations" placeholder=" ">
                      <label for="searchStations">Zoeken naar een station</label>
                    </div>
                    <datalist id="stationsList">
                      <option v-for="item in group.items" :key="item.id" :value="item.label" />
                    </datalist>
                  </template>
                  <div v-for="item in group.items" :key="item.id" class="form-check">
                    <input type="checkbox" :id="item.id" v-model="item.checked" @change="emitUpdate" class="form-check-input">
                    <label :for="item.id" class="form-check-label">{{ item.label }}</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tab-pane fade" id="nav-wms" role="tabpanel">
        <div class="row p-2">
          <div class="col text-center">
            <h3 class="pb-2 text-primary border-bottom border-primary">IDW interpolatie</h3>
            <div class="row my-3">
              <div class="col-10 text-start">{{ interpolationText }}</div>
              <div class="col"><img :src="interpolatieLegend" class="img-fluid rounded w-auto h-75"></div>
              <div class="btn-group btn-group-sm mt-2" role="group">
                <input type="radio" class="btn-check" name="interp" value="disable" id="disable" autocomplete="off" v-model="interpolationStatus" @change="emitInterpolation">
                <label class="btn btn-outline-danger" for="disable">Verbergen</label>
                <input type="radio" class="btn-check" name="interp" value="activate" id="activate" autocomplete="off" v-model="interpolationStatus" @change="emitInterpolation">
                <label class="btn btn-outline-primary" for="activate">Weergeven op kaart</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section id="nav-bestanden" class="tab-pane fade" role="tabpanel">
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
                <button class="btn btn-primary dropdown-toggle py-2 px-3 w-100 fw-medium" type="button" v-if="!isLocalFile" data-bs-toggle="dropdown">Local Bestand | Downloaden</button>
                <button class="btn btn-danger py-2 px-3 w-100 fw-medium" v-else @click="clearLocalFile">← Terug naar server</button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" @click.prevent="downloadGeoJSON">GeoJSON</a></li>
                  <li><a class="dropdown-item" @click.prevent="downloadCSV">CSV</a></li>
                </ul>
              </div>
            </div>
            <div class="col-12 col-xl-6 text-end">
              <div class="input-group mt-3 w-100">
                <label for="fileInput" class="btn custom-file-upload rounded shadow-sm py-2 px-3 w-100 fw-medium text-truncate" :title="isLocalFile?fileName:'Uploaden | Geojson bestand'">{{ isLocalFile?fileName:'Uploaden | Geojson bestand' }}</label>
                <input type="file" id="fileInput" class="d-none" @change="handleFileUpload">
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
      filterGroups: [
        { key: 'regio', label: 'Selecteer een Regio', items: JSON.parse(JSON.stringify(this.regio)) },
        { key: 'gemeente', label: 'Selecteer een Gemeente', items: JSON.parse(JSON.stringify(this.gemeente)) },
        { key: 'station_name', label: 'Selecteer een Station', items: JSON.parse(JSON.stringify(this.stationName)) }
      ],
      activeFilter: null,
      interpolationStatus: 'disable',
      interpolatieLegend: require('@/assets/interpolatie-legenda.png'),
      interpolationText: 'De ‘IDW Interpolatie’ is een krachtige functie die luchtkwaliteitswaarden op ongemeten locaties voorspelt, waarbij meetpunten in de nabijheid een grotere invloed hebben. Met de ‘Verbergen’ en ‘Weergeven op kaart’ opties kunt u de zichtbaarheid van deze voorspelde waarden op de kaart beheren. Houd er rekening mee dat er bij het eerste gebruik een kleine vertraging kan optreden, maar bij latere toepassingen wordt de interpolatie vloeiend weergegeven. De nauwkeurigheid van de voorspellingen is afhankelijk van de kwaliteit en spreiding van de meetpunten.'
    };
  },
  methods: {
    toggleFilter(idx) {
      this.activeFilter = this.activeFilter === idx ? null : idx;
    },
    applySearch() {
      const term = this.search.toLowerCase();
      const group = this.filterGroups.find(g => g.key === 'station_name');
      group.items.forEach(item => { item.checked = item.label.toLowerCase() === term; });
      this.emitUpdate();
    },
    emitUpdate() {
      const selectedRegio = this.filterGroups[0].items.filter(i=>i.checked).map(i=>i.id);
      const selectedGemeente = this.filterGroups[1].items.filter(i=>i.checked).map(i=>i.id);
      const selectedStation = this.filterGroups[2].items.filter(i=>i.checked).map(i=>i.id);
      this.$emit('updateLayer', { selectedRegio, selectedGemeente, selectedStation, search: this.search });
    },
    emitInterpolation() {
      this.$emit('idwInterpolation', this.interpolationStatus);
    },
    downloadGeoJSON() {
      this.$emit('downloadGeoJSON');
    },
    downloadCSV() {
      this.$emit('downloadCSV');
    },
    clearLocalFile() {
      this.$emit('clearInput', 'localFile');
    },
    handleFileUpload(event) {
      this.$emit('updateLayer', { file: event.target.files[0] });
    }
  }
};
</script>

<style scoped>
.custom-file-upload {
  color: #fff;
  background-color: #20c997;
}
</style>
