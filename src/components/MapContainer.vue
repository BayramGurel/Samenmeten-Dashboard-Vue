<template>
  <!-- Pure map container -->
  <div ref="mapElement" class="map-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl from 'maplibre-gl'

// Props for initial view and style
const props = defineProps({
  center: {
    type: Array,
    default: () => [4.218788, 52.008663]  // default center (Lon, Lat)
  },
  zoom: {
    type: Number,
    default: 8.9
  },
  styleUrl: {
    type: String,
    required: true
  }
})

const mapElement = ref(null)
let mapInstance = null

onMounted(() => {
  if (!mapElement.value) return

  // Initialize MapLibre map
  mapInstance = new maplibregl.Map({
    container: mapElement.value,
    style: props.styleUrl,
    center: props.center,
    zoom: props.zoom
  })

  mapInstance.on('load', () => {
    // Add any initial sources or layers
    addLineSourceAndLayer()
    // Potentially add more layers here
  })

  // Map controls
  mapInstance.addControl(new maplibregl.FullscreenControl())
  mapInstance.addControl(new maplibregl.NavigationControl())
  mapInstance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      })
  )
})

onBeforeUnmount(() => {
  // Clean up map instance
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

// Example helper to add a line layer
function addLineSourceAndLayer() {
  if (!mapInstance) return

  const sourceId = 'line'
  if (!mapInstance.getSource(sourceId)) {
    mapInstance.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          // placeholder: an empty line
          coordinates: []
        }
      }
    })
  }

  if (!mapInstance.getLayer(sourceId)) {
    mapInstance.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
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
    })
  }
}
</script>

<style scoped>
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
