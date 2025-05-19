<template>
  <div id="map" class="position-absolute w-100 h-100">
    <InfoSidebar
        :geojson="geojson"
        :formattedProperty="formattedProperty"
        :description="description"
    />
  </div>
  <div class="container-fluid" id="czoom">
    <div class="position-absolute start-0 shadow mt-3 ms-3 col-md-4 col-8 custom-div">
      <ControlsPanel
          :dayNames="dayNames"
          :formattedProperty="formattedProperty"
          :legendaValues="legendaValues"
          :colors="colors"
          :concentrationValues="concentrationValues"
          @reloadPage="reloadPage"
          @updateLayer="updateLayer"
      />
      <FilterPanel
          :regio="filters.regios"
          :gemeente="filters.gemeentes"
          :stationName="filters.stations"
          :isLocalFile="isLocalFile"
          :fileName="fileName"
          @updateLayer="updateLayer"
          @idwInterpolation="idwInterpolation"
          @downloadGeoJSON="downloadGeoJSON"
          @downloadCSV="downloadCSV"
          @clearInput="clearInput"
      />
    </div>
    <div class="modal fade" id="modalWithBothOptions" tabindex="-1" aria-labelledby="modalWithBothOptionsLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl" id="czoom2">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalWithBothOptionsLabel">Informatie over station: {{ properties.station_name }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted">
              Gemeente: {{ properties.Gemeente }}<br>
              Regio: {{ properties.regio }}<br>
              Gemeten waarde: {{ properties.value }} {{ properties.unit }}
            </p>
            <canvas ref="myChart"></canvas>
          </div>
        </div>
      </div>
    </div>
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div ref="liveToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            De bestanden zijn gedownload.<br>
            <small>{{ timeString }}</small>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InfoSidebar from './InfoSidebar.vue'
import ControlsPanel from './ControlsPanel.vue'
import FilterPanel from './FilterPanel.vue'
import { data as initialData } from '@/data/variable.js'

export default {
  name: 'SamenMetenDashboard',
  components: { InfoSidebar, ControlsPanel, FilterPanel },
  data() {
    return {
      ...initialData,
      isLocalFile: false,
      fileName: '',
      timeString: '',
      selectedDay: null,
      filters: { regios: [], gemeentes: [], stations: [] },
      map: null,
      geojson: { features: [] },
      properties: {},
      myChart: null
    }
  },
  computed: {
    dayNames() {
      return Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = this.days[date.getDay()]
        const dateString = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
        return `${dayName} | ${dateString}`
      })
    },
    formattedProperty() {
      const map = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO2' }
      return map[this.elements.property.value] || this.elements.property.value
    }
  },
  watch: {
    'filters.regios': 'updateLayer',
    'filters.gemeentes': 'updateLayer',
    'filters.stations': 'updateLayer',
    selectedDay: 'updateLayer',
    'elements.property.value': 'updateLayer'
  },
  created() {
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`
    setInterval(this.updateLayer, 20 * 60 * 1000)
  },
  async mounted() {
    this.applyZoom()
    this.initializeMap()
    this.addControls()
    await this.loadInitialData()
  },
  methods: {
    applyZoom() {
      [['czoom','87%'],['czoom2','113%'],['sidebar','87%']].forEach(([id,scale])=>{
        const el = document.getElementById(id)
        if(el) el.style.zoom = scale
      })
    },
    async loadInitialData() {
      const url = 'https://dta-samenmeten-api.azurewebsites.net/api/data/stations'
      const res = await this.fetchData(url)
      this.geojson = res
      this.setupFilters(res)
      this.selectedDay = this.dayNames[0]
      this.updateLayer()
    },
    setupFilters({ features }) {
      const unique = key => [...new Set(features.map(f=>f.properties[key]).filter(Boolean))]
      this.filters.regios = unique('regio')
      this.filters.gemeentes = unique('Gemeente')
      this.filters.stations = unique('station_name')
    },
    initializeMap() {
      this.map = new window.maplibregl.Map({ container: 'map', style: this.STYLE_URL, center: [4.218788,52.008663], zoom: 8.9 })
      this.map.on('load', ()=>{ this.addLineSourceAndLayer(); })
    },
    addLineSourceAndLayer() {
      if(!this.map.getSource('line')){
        this.map.addSource('line',{ type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:this.bbox } } })
        this.map.addLayer({ id:'line', type:'line', source:'line', layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':'#f00','line-width':1.4,'line-opacity':0.8} })
      }
    },
    addControls() {
      this.map.addControl(new window.maplibregl.FullscreenControl())
      this.map.addControl(new window.maplibregl.NavigationControl())
      this.map.addControl(new window.maplibregl.GeolocateControl({ positionOptions:{ enableHighAccuracy:true }, trackUserLocation:true }))
      this.map.addControl(this.createStyleSwitcher())
    },
    createStyleSwitcher() {
      const ctr = document.createElement('div')
      ctr.className='window.maplibregl-ctrl window.maplibregl-ctrl-group'
      const sel = document.createElement('select')
      this.STYLE_URLS.forEach((u,i)=>{
        const o=document.createElement('option')
        o.value=u+this.API_KEY; o.text=this.STYLE_NAMES[i]||`Style ${i+1}`
        sel.appendChild(o)
      })
      sel.addEventListener('change',e=>{
        this.map.setStyle(e.target.value)
        this.map.once('styledata',()=>this.updateLayer())
      })
      ctr.appendChild(sel)
      return { onAdd:()=>ctr, onRemove:()=>{}, getDefaultPosition:()=> 'top-right' }
    },
    reloadPage(){location.reload()},

    async fetchData(url){
      const res=await fetch(url,{credentials:'include'});
      const json=await res.json();
      return json.Features?{features:json.Features}:json;
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
    async updateLayer(){
      const hour=+this.elements.timeSlider.value
      const idx=this.dayNames.indexOf(this.selectedDay)
      await this.reloadLayer(hour,idx)
    },
    async reloadLayer(hour,dayIdx){
      const isLocal=Boolean(this.$refs.localFile?.files.length)
      this.isLocalFile=isLocal
      this.fileName=isLocal?this.$refs.localFile.files[0].name:'Geojson bestand | Uploaden'
      const date=new Date(); date.setDate(date.getDate()-dayIdx)
      const measured=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),hour+date.getTimezoneOffset()/60))
      const mt=measured.toISOString().slice(0,19).replace('T','%20')+'00'
      let data;
      if(isLocal) data=await this.loadLocalFile(); else {
        const params=new URLSearchParams({property:this.elements.property.value,measured_time:mt})
        this.filters.regios.forEach(r=>params.append('regio',r))
        this.filters.gemeentes.forEach(g=>params.append('Gemeente',g))
        this.filters.stations.forEach(s=>params.append('station_name',s))
        const [st,obs]=await Promise.all([
          this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/stations?'+params),
          this.fetchData('https://dta-samenmeten-api.azurewebsites.net/api/data/observations?'+params)
        ])
        const obsMap=new Map(obs.features.map(o=>[o.properties.station_name,o]))
        data={features:st.features.map(s=>{const o=obsMap.get(s.properties.station_name);return o?{...o,properties:o.properties,geometry:o.geometry}:null}).filter(Boolean)}
      }
      this.geojson=data
      this.updateMapSource()
      this.setupFilters(data)
    },
    updateMapSource(){
      const src=this.map.getSource('stations');
      if(src)src.setData(this.geojson); else this.map.addSource('stations',{type:'geojson',data:this.geojson});
      if(!this.map.getLayer('stations'))this.addStationsLayer();
    },
    addStationsLayer(){
      this.map.addLayer({id:'stations',type:'circle',source:'stations',paint:{'circle-radius':6,'circle-color':this.getCircleColor(),'circle-stroke-color':'#fff','circle-stroke-width':1.8}})
      this.map.on('click','stations',e=>{
        const fs=this.map.queryRenderedFeatures(e.point,{layers:['stations']})
        const feat=fs.length>1?fs[0]:fs[0]
        this.properties=feat.properties
        this.showPopup(feat,e)
      })
    },
    showPopup(feat,e){
      const popup=new window.maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<div><strong>${feat.properties.station_name}</strong></div>`).addTo(this.map)
    },
    idwInterpolation(date){
      const bbox=[3.7737,51.6437,5.0314,52.3325]
      const lid=`interp-${date}-${this.elements.property.value}`
      if(!this.map.getLayer(lid)){
        this.map.addSource(lid,{type:'image',url:`https://...&time=${date}`,coordinates:[[bbox[0],bbox[3]],[bbox[2],bbox[3]],[bbox[2],bbox[1]],[bbox[0],bbox[1]]]})
        this.map.addLayer({id:lid,type:'raster',source:lid,paint:{'raster-opacity':1}})
      }
      this.map.getStyle().layers.forEach(l=>{if(l.type==='raster')this.map.setPaintProperty(l.id,'raster-opacity',l.id===lid?1:0)})
    },
    triggerDownload(blob,filename){
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
      const inst=bootstrap.Toast.getOrCreateInstance(this.$refs.liveToast);this.timeString=new Date().toLocaleTimeString('nl-NL');inst.show()
    },
    downloadGeoJSON(){this.triggerDownload(new Blob([JSON.stringify(this.geojson)],{type:'application/json'}),`PZH-Luchtkwaliteit_${this.elements.property.value}.geojson`)},
    downloadCSV(){
      const rows=this.geojson.features.map(f=>f.properties)
      const header='Station naam;Datum en tijd;Property;Regio;Gemeente;Value;Unit'
      const lines=[header,...rows.map(p=>[p.station_name,new Date(p.measured_time||'').toISOString(),p.property,p.regio,p.Gemeente,p.value?.toFixed(2)||'',p.unit||''].join('; '))]
      this.triggerDownload(new Blob([lines.join('\n')],{type:'text/csv'}),'SamenMeten_Luchtkwaliteit.csv')
    },
    clearInput(ref){if(this.$refs[ref])this.$refs[ref].value=''},
    getCircleColor(){
      return ['case',['==',['get','property'],'pm25'],['step',['get','value'],'#1E90FF',8.3,'#48D1CC',16.7,'#9ACD32',25,'#DAA520',Infinity,'#000000'],['in',['get','property'],['literal',['no2','pm10']]],['step',['get','value'],'#1E90FF',13.3,'#48D1CC',26.6,'#9ACD32',40,'#DAA520',Infinity,'#000000'],'#000000'];
    }
  }
}
</script>

<style scoped>
.input-group input[type="file"] { display: none; }
.input-group .custom-file-upload { color: #fff; background-color: #20c997; }
.custom-div { position: relative; max-height: 97%; overflow-y: auto; overflow-x: hidden; z-index: 1; }
*::-webkit-scrollbar { width: 0.5vw; }
*::-webkit-scrollbar-thumb { background: #888; border-radius: 0.5vw; }
*::-webkit-scrollbar-thumb:hover { background: #555; }
*::selection { font-family: Arial !important; background-color: #d11f3d; color: white; }
.focused-label .form-control:focus ~ label { color: #0081ff; }
</style>
