<template>
  <!--  The logo | Hour slider | upload GeoJSON file  -->
  <div class="container bg-white rounded pb-3">
    <div class="row mb-2">
      <div class="col-12">
        <img :src="require('@/assets/PZH-logo.png')" class="img-fluid rounded d-block" title="Refresh website" @click="$emit('reload-page')" style="max-width: 70%">
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
          <select ref="property" class="form-select form-select-md text-primary fw-semibold text-center shadow-sm" id="floatingSelect" @input="$emit('update-layer')" style="background: white !important;">
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
            <input
              id="timeSlider"
              ref="timeSlider"
              class="form-control-range w-100"
              type="range"
              min="0"
              max="23"
              step="1"
              :value="timeValue"
              @input="$emit('update:timeValue', $event.target.value)"
              @change="$emit('update-layer')"
              @mousedown="$emit('stop-slider')"
              :title="'Geselecteerd uur: ' + timeValue + ':00'"
            >
          </div>
        </div>

        <!-- Day Selection -->
        <div class="row pt-2 px-3">
          <div class="col-md-6">
            <div class="form-floating mb-2 focused-label">
              <input
                type="search"
                list="dayNames"
                :value="selectedDay"
                class="form-control text-primary fw-semibold rounded shadow-sm"
                @input="onSelectedDayInput"
                @click="$emit('clear-input', 'sDate')"
                id="floatingInput"
                ref="sDate"
              >
              <label for="floatingInput">Selecteer een datum</label>
            </div>
            <datalist id="dayNames">
              <option v-for="(dayName, index) in dayNames" :value="dayName" :key="index">{{ dayName }}</option>
            </datalist>
          </div>

          <!-- Play/Pause Button -->
          <div class="col-md-6 text-center">
            <button id="playSlider" type="button" class="btn py-2 fw-medium w-100" :class="buttonClass" @click="$emit('toggle-slider')">
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
</template>

<script>
export default {
  name: 'DashboardLegendTabs',
  props: {
    timeValue: {
      type: [Number, String],
      required: true,
    },
    selectedDay: {
      type: String,
      required: true,
    },
    dayNames: {
      type: Array,
      required: true,
    },
    isPlaying: {
      type: Boolean,
      required: true,
    },
    buttonClass: {
      type: String,
      required: true,
    },
    formattedProperty: {
      type: String,
      required: true,
    },
    legendaValues: {
      type: Array,
      required: true,
    },
    colors: {
      type: Array,
      required: true,
    },
    concentrationValues: {
      type: Array,
      required: true,
    },
    isFrom: {
      type: String,
      required: true,
    },
  },
  emits: [
    'reload-page',
    'update-layer',
    'stop-slider',
    'toggle-slider',
    'clear-input',
    'update:timeValue',
    'update:selectedDay',
  ],
  methods: {
    onSelectedDayInput(event) {
      this.$emit('update:selectedDay', event.target.value);
      this.$emit('update-layer');
    },
  },
};
</script>
