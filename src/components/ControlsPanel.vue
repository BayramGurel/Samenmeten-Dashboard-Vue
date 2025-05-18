<template>
    <div class="container bg-white rounded pb-3">
      <div class="row mb-2">
        <div class="col-12 text-center">
          <img :src="logoSrc" class="img-fluid rounded d-block" title="Pagina verversen" @click="$emit('reloadPage')" style="max-width: 70%;" />
          <h4 class="text-center text-primary-emphasis m-2">Dashboard voor Luchtkwaliteitsmetingen</h4>
        </div>
      </div>
      <nav>
        <div class="nav nav-tabs" role="tablist">
          <button class="nav-link active fw-semibold" id="nav-legenda-tab" data-bs-toggle="tab" data-bs-target="#nav-legenda" type="button" role="tab" aria-controls="nav-legenda" aria-selected="true">Legenda voor Luchtkwaliteit</button>
          <button class="nav-link fw-semibold" id="nav-contact-tab" data-bs-toggle="tab" data-bs-target="#nav-contact" type="button" role="tab" aria-controls="nav-contact" aria-selected="false">Contactgegevens</button>
        </div>
      </nav>
      <div class="tab-content">
        <div class="tab-pane fade show active" id="nav-legenda" role="tabpanel" aria-labelledby="nav-legenda-tab" tabindex="0">
          <h4 class="my-2 pt-2 text-center text-primary-emphasis">Luchtkwaliteit filters & legenda <i class="bi bi-funnel"></i></h4>
          <div class="col-md-11 mx-auto form-floating">
            <select v-model="propertyValue" class="form-select form-select-md text-primary fw-semibold text-center shadow-sm" id="floatingSelect" @change="emitUpdate" style="background: white !important;">
              <option class="fw-semibold" value="no2">Stikstofdioxide | NO₂</option>
              <option class="fw-semibold" value="pm10">Fijnstof 10 µm | PM10</option>
              <option class="fw-semibold" value="pm25">Fijnstof 2.5 µm | PM2.5</option>
            </select>
            <label for="floatingSelect">Selecteer een type sensordata</label>
          </div>
          <div class="row px-3 mt-2">
            <div class="col-12">
              <label for="timeSlider">Geselecteerd uur: {{ timeValue }}:00</label>
              <input id="timeSlider" ref="timeSlider" class="form-range w-100" type="range" min="0" max="23" step="1" v-model.number="timeValue" @change="emitUpdate" @mousedown="stopSlider" :title="`Geselecteerd uur: ${timeValue}:00`" />
            </div>
          </div>
          <div class="row pt-2 px-3">
            <div class="col-md-6">
              <div class="form-floating mb-2">
                <input type="search" list="dayNamesList" v-model="selectedDay" class="form-control text-primary fw-semibold rounded shadow-sm" id="floatingInput" placeholder=" " @input="emitUpdate" @click="clearInput" />
                <label for="floatingInput">Selecteer een datum</label>
              </div>
              <datalist id="dayNamesList">
                <option v-for="(day, i) in dayNames" :key="i" :value="day">{{ day }}</option>
              </datalist>
            </div>
            <div class="col-md-6 text-center">
              <button id="playSlider" type="button" class="btn py-2 fw-medium w-100" :class="buttonClass" @click="toggleSlider"> <i v-if="isPlaying" class="bi bi-pause-circle-fill"></i><i v-else class="bi bi-google-play"></i>{{ isPlaying ? 'Pauzeren' : 'Afspelen' }}</button>
            </div>
          </div>
          <p class="text-center">Concentratie {{ formattedProperty }} nk (µg/m³)</p>
          <div class="row px-2 text-center text-light">
            <div class="col-12 col-xl-6 pb-2 fw-medium" v-for="(value, idx) in legendaValues" :key="idx"><div class="rounded" :style="{ backgroundColor: colors[idx] }"><span class="Legenda">{{ value }}</span></div></div>
          </div>
          <div class="row pt-1">
            <h6 class="col"><small class="text-muted">{{ concentrationValues[0] }} Lage concentratie</small></h6>
            <h6 class="col text-end"><small class="text-muted">Hoge concentratie {{ concentrationValues[1] }}</small></h6>
          </div>
        </div>
        <div class="tab-pane fade" id="nav-contact" role="tabpanel" aria-labelledby="nav-contact-tab" tabindex="0">
          <div class="row p-2">
            <div class="card">
              <div class="card-body">
                <h3 class="card-title text-center text-success border-bottom pb-2">Contactgegevens</h3>
                <dl class="row">
                  <dt class="col-sm-3 fw-bold text-success">Team</dt>
                  <dd class="col-sm-9">Het Team Geo van de Provincie Zuid-Holland is verantwoordelijk voor het beheer en de toepassing van geografische informatie en technologie.</dd>
                  <dt class="col-sm-3 fw-bold text-success">Contact</dt>
                  <dd class="col-sm-9">Voor technische ondersteuning of feedback over de applicatie, kunt u contact opnemen via: <a href="mailto:teamgeo@pzh.nl" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">teamgeo@pzh.nl</a></dd>
                  <dt class="col-sm-3 fw-bold text-success">Postadres</dt>
                  <dd class="col-sm-9">Provincie Zuid-Holland Contact Centrum<br/>Postbus 90602 – 2509 LP Den Haag</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
import logo from '@/assets/PZH-logo.png';

export default {
  name: 'ControlsPanel',
  props: {
    dayNames: { type: Array, required: true },
    formattedProperty: {type: String, required: true},
    legendaValues: {type: Array, required: true},
    colors: {type: Array, required: true},
    concentrationValues: {type: Array, required: true},
    logoSrc: {type: String, default: logo}
  },
  data() {
    return {
      propertyValue: 'pm25',
      timeValue: 0,
      selectedDay: this.dayNames[0] || '',
      isPlaying: false,
      interval: null
    };
  },
  computed: {
    buttonClass() {
      return this.isPlaying ? 'btn-outline-danger' : 'btn-outline-primary';
    }
  },
  methods: {
    emitUpdate() {
      this.$emit('updateLayer', {property: this.propertyValue, time: this.timeValue, date: this.selectedDay});
    },
    toggleSlider() {
      this.isPlaying ? this.startSlider() : this.stopSlider();
      this.isPlaying = !this.isPlaying;
    },
    startSlider() {
      clearInterval(this.interval);
      const today = this.dayNames[0];
      const maxHour = this.selectedDay === today ? new Date().getHours() : 23;
      this.timeValue = 0;
      this.emitUpdate();
      this.interval = setInterval(() => {
        if (this.timeValue < maxHour) {
          this.timeValue++;
          this.emitUpdate();
        } else {
          this.stopSlider();
        }
      }, 1550);
    },
    stopSlider() {
      clearInterval(this.interval);
      this.isPlaying = false;
    },
    clearInput() {
      this.selectedDay = '';
      this.emitUpdate();
    }
  }
};
</script>

<style scoped>
.custom-div {
  max-height: 97%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
}
</style>
