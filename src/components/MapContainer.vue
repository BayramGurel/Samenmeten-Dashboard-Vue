<script setup>
/* import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Props drive initial view—override from any parent
const props = defineProps({
  center: {
    type: Array as () => [number, number],
default: () => [51.505, -0.09]
},
zoom: {
  type: Number,
default: 13
}
})

const mapElement = ref<HTMLDivElement|null>(null)
let mapInstance: L.Map|null = null

onMounted(() => {
  if (!mapElement.value) return

  // ⚙️ initialize Leaflet map
  mapInstance = L.map(mapElement.value, {
    center: props.center,
    zoom: props.zoom,
    // zoomControl: false  // toggle if you build custom controls
  })

  // 🌐 add tile layer (swap URL & attribution for your provider)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance)
})

onBeforeUnmount(() => {
  // 🧹 clean up to avoid memory leaks
  mapInstance?.remove()
  mapInstance = null
})

 */
</script>

<template>
  <!-- parent (.map-area) controls sizing -->
  <div ref="mapElement" class="map-container"> YO YO</div>
</template>

<style scoped>

</style>
