<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import maplibregl from 'maplibre-gl';

// — Props
const props = defineProps({
  center: { type: Array, default: () => [4.218788, 52.008663] },
  zoom: { type: Number, default: 8.9 },
  styleUrl: { type: String, required: true }
});

// — DOM ref & map handle
const mapEl = ref(null);
let mapInstance = null;

// — GeoJSON data
const LINE_SOURCE_ID = 'route-line';
// TODO: replace this placeholder with your actual coordinates array
const lineCoordinates = [/* ... coordinate array ... */];
const lineGeoJSON = {
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: lineCoordinates }
};

// — Initialize map
async function initMap() {
  await nextTick();
  if (!mapEl.value || mapInstance) return;

  mapInstance = new maplibregl.Map({
    container: mapEl.value,
    style: props.styleUrl,
    center: props.center,
    zoom: props.zoom
  });

  mapInstance.on('load', () => {
    addRouteLayer();
    fitToRoute();
    addMarkers();
    addEventHandlers();
    addControls();
  });
}

// — Add GeoJSON source & styled line layer
function addRouteLayer() {
  const m = mapInstance;
  if (!m) return;

  // Add the source with lineMetrics enabled for gradient
  if (!m.getSource(LINE_SOURCE_ID)) {
    m.addSource(LINE_SOURCE_ID, {
      type: 'geojson',
      data: lineGeoJSON,
      buffer: 512,
      tolerance: 0.0001,
      lineMetrics: true
    });
  }

  // Add the styled layer if not present
  if (!m.getLayer(LINE_SOURCE_ID)) {
    m.addLayer({
      id: LINE_SOURCE_ID,
      type: 'line',
      source: LINE_SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        // Gradient from red at start to blue at end
        'line-gradient': [
          'interpolate', ['linear'], ['line-progress'],
          0, '#ff0000',
          1, '#0000ff'
        ],
        // Dashed line pattern
        'line-dasharray': [2, 2],
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  }
}

// — Fit map to the full route bounds
function fitToRoute() {
  const m = mapInstance;
  if (!m || !lineCoordinates.length) return;

  // Ensure valid start coord
  const first = lineCoordinates[0];
  if (!Array.isArray(first) || first.length < 2) return;

  // Build bounds
  let bounds = new maplibregl.LngLatBounds(first, first);
  lineCoordinates.forEach(coord => {
    if (Array.isArray(coord) && coord.length >= 2) {
      bounds = bounds.extend(coord);
    }
  });

  m.fitBounds(bounds, { padding: 20, duration: 1000 });
}

// — Add markers with pop-ups at each coordinate
function addMarkers() {
  const m = mapInstance;
  if (!m) return;

  lineCoordinates.forEach((coord, idx) => {
    if (!Array.isArray(coord) || coord.length < 2) return;
    new maplibregl.Marker()
        .setLngLat(coord)
        .setPopup(
            new maplibregl.Popup({ offset: 15 }).setHTML(
                `<strong>Point ${idx + 1}</strong><br/>Lat: ${coord[1].toFixed(5)}, Lng: ${coord[0].toFixed(5)}`
            )
        )
        .addTo(m);
  });
}

// — Handle hover & click events on the route layer
function addEventHandlers() {
  const m = mapInstance;
  if (!m) return;

  m.on('mouseenter', LINE_SOURCE_ID, () => {
    m.getCanvas().style.cursor = 'pointer';
  });

  m.on('mouseleave', LINE_SOURCE_ID, () => {
    m.getCanvas().style.cursor = '';
  });

  m.on('click', LINE_SOURCE_ID, (e) => {
    const { lng, lat } = e.lngLat;
    new maplibregl.Popup()
        .setLngLat([lng, lat])
        .setHTML(`Clicked at:<br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`)
        .addTo(m);
  });
}

// — Standard map controls
function addControls() {
  const m = mapInstance;
  if (!m) return;

  m.addControl(new maplibregl.FullscreenControl());
  m.addControl(new maplibregl.NavigationControl());
  m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      })
  );
}

// — React to prop changes
watch([
  () => props.center,
  () => props.zoom
], ([c, z]) => {
  if (mapInstance) {
    mapInstance.setCenter(c);
    mapInstance.setZoom(z);
  }
});

watch(() => props.styleUrl, (newStyle) => {
  if (mapInstance) {
    mapInstance.setStyle(newStyle);
    mapInstance.once('styledata', addRouteLayer);
  }
});

// — Lifecycle hooks
onMounted(initMap);
onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<style scoped>
.map-container {
  position: absolute;
  inset: 0;
}
</style>
