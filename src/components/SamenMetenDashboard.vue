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
        :regio="regios"
        :gemeente="gemeentes"
        :stationName="stName"
        :isLocalFile="isLocalFile"
        :fileName="fileName"
        @updateLayer="updateLayer"
        @idwInterpolation="idw_interpolation"
        @downloadGeoJSON="downloadGeoJSON"
        @downloadCSV="downloadCSV"
        @clearInput="clearInput"
    />
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
              De fijnstofwaarde {{ formattedProperty }} is gemeten op dit station, dat zich in de regio {{ properties.regio }} bevindt.<br>
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
</template>

<script>
import InfoSidebar from './InfoSidebar.vue'
import ControlsPanel from './ControlsPanel.vue'
import FilterPanel from './FilterPanel.vue'
import { data } from '@/data/variable.js'

export default {
  name: 'SamenMetenDashboard',
  components: { InfoSidebar, ControlsPanel, FilterPanel },
  data() {
    return data
  },
  computed: {
    dayNames() {
      return Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return this.formatDate(date);
      });
    },
    formattedProperty() {
      const propertyMap = { pm25: 'PM2,5', pm10: 'PM10', no2: 'NO2' }
      return propertyMap[this.property] || this.property
    }
  },
  created() {
    this.STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${this.API_KEY}`
    this.checkHourChange()
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
    this.updateLayer()
  },

  methods: {
    initializeMap() {
      this.map = new window.maplibregl.Map({ container: 'map', style: this.STYLE_URL, center: [4.218788, 52.008663], zoom: 8.9 })
      this.map.on('load', () => { this.addLineSourceAndLayer() })
    },
    addControls() {
      this.addStyleSwitchControl()
      this.map.addControl(new window.maplibregl.FullscreenControl())
      this.map.addControl(new window.maplibregl.NavigationControl())
      this.map.addControl(new window.maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }))
    },
    reloadPage() { window.location.reload() },
    clearInput(refName) {
      this.$refs[refName].value = ''
      if (refName === 'sDate') this.selectedDay = ''
      else this.updateLayer()
    },
    checkHourChange() { setInterval(() => { this.updateLayer() }, 1200000) },
    formatDate(date) {
      const dayName = this.days[date.getDay()]
      const dateString = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
      return `${dayName} | ${dateString}`
    },
    async fetchData(url) { const res = await fetch(url, { credentials: 'include' }); return await res.json() },
    async updateLayer() {
      const prop = this.propValues[this.elements.property.value] || this.propValues.default
      this.property = prop.property; this.description = prop.description
      this.legendaValues = prop.legendaValues; this.concentrationValues = prop.concentrationValues
      const selectedRegio = await this.getSelectedValues('regio')
      const selectedGemeente = await this.getSelectedValues('Gemeente')
      const selectedStName = await this.getSelectedValues('station_name')
      this.reloadLayer(this.map, this.elements.timeSlider.value, selectedRegio, selectedGemeente, selectedStName)
    },
    async reloadLayer(map, hour, selectedRegio, selectedGemeente, selectedStName) {
      const { files = [] } = this.$refs.localFile || {}
      this.isLocalFile = files.length > 0; this.fileName = this.isLocalFile ? files[0].name : 'Geojson bestand | Uploaden'
      this.isFrom = this.isLocalFile
          ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold">van jouw Local File</span>'
          : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success">onze metadata.</a>'
      const selectedDateIndex = this.dayNames.indexOf(this.elements.sDate.value)
      await this.filterGeojsonFeatures(hour, selectedDateIndex, this.elements.property.value, selectedRegio, selectedGemeente, selectedStName, this.isLocalFile)
      this.updateMapSourceAndLayer(map, this.geojson)
    },
    async filterGeojsonFeatures(hour, selectedDateIndex, selectedProperty, selectedRegio, selectedGemeente, selectedStName, isLocalFile) {
      const now = new Date(); now.setDate(now.getDate() - selectedDateIndex)
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), +hour + now.getTimezoneOffset()/60))
      const measured_time = date.toISOString().replace('T','%20').slice(0,19)+'00'
      if (this.interpolationStatus==='activate') this.idw_interpolation(date.toISOString())
      const filters = { property: selectedProperty, station: selectedStName.length?selectedStName:[], gemeente: selectedStName.length?[]:selectedGemeente, regio: selectedStName.length||selectedGemeente.length?[]:selectedRegio }
      let filtered
      if (isLocalFile) filtered = await this.loadLocalFile()
      else {
        const url1 = new URL('https://dta-samenmeten-api.azurewebsites.net/api/data/stations')
        Object.entries(filters).forEach(([k,v])=>{ if(v.length) url1.searchParams.append(k,v) })
        const url2 = new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selectedProperty}&measured_time=${measured_time}`)
        const [stations, observations] = await Promise.all([this.fetchData(url1), this.fetchData(url2)])
        const obsMap = new Map(observations.Features.map(o=>[o.properties.station_name,o]))
        filtered = { type:'FeatureCollection', Features: stations.Features.filter(s=>{ const o=obsMap.get(s.properties.station_name); if(o){ o.properties.avg_value=s.properties.avg_value; o.properties.max_value=s.properties.max_value; o.properties.min_value=s.properties.min_value; s.properties={...o.properties}; s.geometry=o.geometry; return true;} return false; }) }
      }
      this.geojson=filtered;
          [this.regios,this.gemeentes,this.stName]=await Promise.all([ this.getUniqueItems(this.geojson,'regio'), this.getUniqueItems(this.geojson,'Gemeente'), this.getUniqueItems(this.geojson,'station_name') ])
      this.createCheckboxes('regio',this.regios); this.createCheckboxes('Gemeente',this.gemeentes); this.createCheckboxes('station_name',this.stName)
    },
    idw_interpolation(date){ const b=[3.773675345120739,51.64377788724585,5.031415001585676,52.3325109475691]; const id='interpolatie-'+date+'-'+this.elements.property.value; this.rasterLayers.add(id); this.rasterLayers.forEach(i=>this.map.getLayer(i)&&this.map.setPaintProperty(i,'raster-opacity',i===id?1:0)); this.currentLayerId=id; if(!this.map.getLayer(id)){ const url=`https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${this.elements.property.value}_sqldb&bbox=${b.join(',')}&time=${date}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`; this.map.addSource(id,{type:'image',url,coordinates:[[b[0],b[3]],[b[2],b[3]],[b[2],b[1]],[b[0],b[1]]]}); this.map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':1}}) }
    },
    downloadGeoJSON(){ const str=JSON.stringify(this.geojson); const uri='data:application/json;charset=utf-8,'+encodeURIComponent(str); const a=document.createElement('a'); a.href=uri; a.download=`PZH-Luchtkwaliteit_${this.property}.geojson`; this.toast(); document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
    updateMapSourceAndLayer(m,j){ if(!j||!j.Features)return; j.features=j.Features; delete j.Features; if(!m.getSource('stations'))m.addSource('stations',{type:'geojson',data:j}); else m.getSource('stations').setData(j); if(!m.getLayer('stations'))this.addStationsLayer(); },
    getCircleColor(){ return ['case',['==',['get','property'],'pm25'],['step',['get','value'],'#1E90FF',8.3,'#48D1CC',16.7,'#9ACD32',25,'#DAA520',Infinity,'#000000'],['in',['get','property'],['literal',['no2','pm10']]],['step',['get','value'],'#1E90FF',13.3,'#48D1CC',26.6,'#9ACD32',40,'#DAA520',Infinity,'#000000'],'#000000']; },
    addStationsLayer(){ this.map.addLayer({id:'stations',type:'circle',source:'stations',paint:{'circle-radius':6,'circle-color':this.getCircleColor(),'circle-stroke-color':'#ffffff','circle-stroke-width':1.8}}); this.map.on('click','stations',this.handleStationClick); },
    handleStationClick(e){ const fs=this.map.queryRenderedFeatures(e.point,{layers:['stations']}); if(fs.length>1)this.createDropdownPopup(fs,e); else this.createDetailPopup(e.features[0],e); },
    createDropdownPopup(fs,e){ let h=`<div class="card text-center border-primary"><div class="card-header bg-primary text-white"><h6>Selecteer Station <i class="bi bi-search"></i></h6></div><div class="card-body"><div class="dropdown"><button class="btn btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">Kies een station</button><div class="dropdown-menu" style="height:200px;overflow-y:auto;">`; fs.forEach((f,i)=>{ const c=this.getColor(f.properties.value,f.properties.property,1); h+=`<a class="dropdown-item" href="#" data-value="${i}"><i class="bi bi-geo-alt-fill" style="color:${c};"></i> ${f.properties.station_name}</a>`; }); h+=`</div></div></div></div>`; const p=new window.maplibregl.Popup({className:'my-popup'}).setLngLat(e.lngLat).setHTML(h).addTo(this.map); this.$nextTick(()=>{ Array.from(p.getElement().querySelectorAll('.dropdown-item')).forEach(item=>item.addEventListener('click',ev=>{ ev.preventDefault(); p.remove(); this.createDetailPopup(fs[ev.target.dataset.value],e); })); }); },
    createDetailPopup(f,e){ this.properties=f.properties; const p=new window.maplibregl.Popup({className:'my-popup'}).setLngLat(e.lngLat).setHTML(this.getPopupHTML(f.properties)).addTo(this.map); this.$nextTick(()=>{ const b=p.getElement().querySelector('button'); b.addEventListener('click',async()=>{ b.innerHTML='<span class="spinner-border spinner-border-sm"></span>'; try{ await this.loadChart(this.properties); }finally{ b.innerText='Informatie over station'; p.remove(); } }); }); },
    getPopupHTML({station_name,property,value,unit,Gemeente,regio,measured_time}){ const fd=new Date(measured_time).toLocaleString('nl-NL',{timeZone:'GMT',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); const c=this.getColor(value,property,1); return `<div class="card text-center" style="border-color:${c};"><div class="card-header" style="background-color:${c};color:white;"><h6>Station naam: ${station_name}</h6></div><div class="card-body"><h6 class="card-title">Component en meetwaarde:<br>${property}: ${value} ${unit}</h6><h6>Beschrijving:<br>Gemeente ${Gemeente} - Regio ${regio}</h6><h6 class="card-text"><small class="text-muted">Laatst update: ${fd}</small></h6><button class="btn mt-3" type="button" data-bs-toggle="modal" data-bs-target="#modalWithBothOptions" style="background-color:${c};color:white;" data-properties='${JSON.stringify({station_name,property,value,unit,Gemeente,regio,measured_time})}'>Informatie over station</button></div></div>`; },
    async loadChart(props){ const url=new URL(`https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${props.station_name}&property=${props.property}&location=${props.location_uuid}`); const od=await this.fetchData(url.toString()); const db=this.processData(od); const ds=this.createDatasets(props.property,db); this.$nextTick(()=>{ if(this.myChart instanceof window.Chart&&this.$refs.myChart){ this.myChart.destroy(); } if(this.$refs.myChart){ this.myChart=this.createChart(this.$refs.myChart,props.property,db,ds); } }); },
    processData(od){ return od.Features.reduce((acc,f)=>{ const d=new Date(f.properties.measured_time); const ds=d.toISOString().split('T')[0]; const hi=d.getUTCHours(); if(!acc[ds]) acc[ds]={times:Array.from({length:24},(_,i)=>i<10?`0${i}:00 GMT`:`${i}:00 GMT`),values:Array(24).fill(null)}; acc[ds].values[hi]=f.properties.value; return acc; },{}); },
    createDatasets(prop,db){ const dsets=Object.entries(db).map(([date,data])=>{ const bg=data.values.map(v=>this.getColor(v,prop,'0.4')); const dc=new Date(date); const bc=this.dayColors[dc.getDay()]; return { label:dc.toLocaleDateString('nl-NL',{weekday:'long',year:'numeric',month:'2-digit',day:'2-digit'}),dateString:date,data:data.values,originalBackgroundColor:[...bg],backgroundColor:bg,borderColor:bc,borderWidth:2,borderRadius:{topLeft:3,topRight:3},hidden:true }; }); dsets.sort((a,b)=>new Date(a.dateString)-new Date(b.dateString)); if(dsets.length) dsets[dsets.length-1].hidden=false; return dsets; },
    createChart(ctx,prop,db,ds){ const yMin=prop==='pm25'?25:40; return new window.Chart(ctx,{type:'bar',data:{labels:db[Object.keys(db)[0]].times,datasets:ds},options:{...this.chartOptions,plugins:{...this.chartOptions.plugins,annotation:{annotations:[{type:'box',yMin:yMin,backgroundColor:'rgba(230,25,75,0.1)',borderColor:'rgba(230,25,75,1)',label:{content:'Bad',enabled:true,position:'center'}}]},legend:{display:true,onHover:(evt,item,lg)=>this.handleHover(evt,item,lg),onLeave:(evt,item,lg)=>this.handleLeave(evt,item,lg)}}}}); },
    handleHover(evt,item,lg){ lg.chart.data.datasets.forEach((d,i)=>{ d.backgroundColor=i===item.datasetIndex?d.originalBackgroundColor.map(c=>{const a=c.slice(0,-1).split(',');a[3]='0.8)';return a.join(',')}):d.originalBackgroundColor.map(c=>{const a=c.slice(0,-1).split(',');a[3]='0.1)';return a.join(',')}); }); lg.chart.update(); },
    handleLeave(evt,item,lg){ lg.chart.data.datasets.forEach(d=>{d.backgroundColor=d.originalBackgroundColor}); lg.chart.update(); }
    }
    }
</script>

<style scoped>
.input-group input[type="file"]{display:none;}
.input-group .custom-file-upload{color:#fff;background-color:#20c997;}
.custom-div{position:relative;max-height:97%;overflow-y:auto;overflow-x:hidden;z-index:1;}
*::-webkit-scrollbar{width:0.5vw;}
*::-webkit-scrollbar-thumb{background:#888;border-radius:0.5vw;}
*::-webkit-scrollbar-thumb:hover{background:#555;}
* ::selection{font-family:Arial!important;background-color:#d11f3d;color:white;}
.focused-label .form-control:focus~label{color:#0081ff;}
</style>
