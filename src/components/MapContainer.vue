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
  styleUrl: { type: String, required: true },
  // Add arrays of style URLs and names, and API key if needed
  STYLE_URLS: { type: Array, default: () => [
      'https://api.maptiler.com/maps/dataviz/style.json?key=',
      'https://api.maptiler.com/maps/basic-v2-light/style.json?key=',
      'https://api.maptiler.com/maps/basic-v2-dark/style.json?key=',
      'https://api.maptiler.com/maps/streets-v2-pastel/style.json?key=',
      'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=',
      'https://api.maptiler.com/maps/outdoor/style.json?key=',
      'https://api.maptiler.com/maps/topo-v2-dark/style.json?key=',
      'https://api.maptiler.com/maps/hybrid/style.json?key=',
    ] },
  STYLE_NAMES: { type: Array, default: () => [ 'Dataviz', 'Basic Light', 'Basic Dark', 'Streets Pastel', 'Street Dark', 'Outdoor', 'Topo Dark', 'Satellite Hybrid' ] },
  API_KEY: { type: String, default: '' }
});

// — DOM ref & map handle
const mapEl = ref(null);
let mapInstance = null;

// — GeoJSON data (replace with real coordinates)
const LINE_SOURCE_ID = 'route-line';
const lineCoordinates = [/* ... coordinate array ... */];
const lineGeoJSON = { type: 'Feature', geometry: { type: 'LineString', coordinates: lineCoordinates } };

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
    addEventHandlers();
    addControls();
    addStyleSwitchControl();
  });
}

// — GeoJSON source & line layer
function addRouteLayer() {
  const m = mapInstance; if (!m) return;
  if (!m.getSource(LINE_SOURCE_ID)) {
    m.addSource(LINE_SOURCE_ID, { type: 'geojson', data: lineGeoJSON, buffer: 512, tolerance: 0.0001 });
  }
  if (!m.getLayer(LINE_SOURCE_ID)) {
    m.addLayer({
      id: LINE_SOURCE_ID,
      type: 'line',
      source: LINE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ff0000', 'line-width': 2, 'line-opacity': 0.8 }
    });
  }
}

// — Fit to route bounds
function fitToRoute() {
  const m = mapInstance; if (!m || !lineCoordinates.length) return;
  const first = lineCoordinates[0]; if (!Array.isArray(first) || first.length < 2) return;
  let bounds = new maplibregl.LngLatBounds(first, first);
  lineCoordinates.forEach(c => Array.isArray(c) && c.length >= 2 && bounds.extend(c));
  m.fitBounds(bounds, { padding: 20, duration: 1000 });
}

// — Interaction handlers
function addEventHandlers() {
  const m = mapInstance; if (!m) return;
  m.on('mouseenter', LINE_SOURCE_ID, () => m.getCanvas().style.cursor = 'pointer');
  m.on('mouseleave', LINE_SOURCE_ID, () => m.getCanvas().style.cursor = '');
  m.on('click', LINE_SOURCE_ID, e => {
    const { lng, lat } = e.lngLat;
    new maplibregl.Popup().setLngLat([lng, lat])
        .setHTML(`Clicked at:<br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`)
        .addTo(m);
  });
}

// — Standard controls
function addControls() {
  const m = mapInstance; if (!m) return;
  m.addControl(new maplibregl.FullscreenControl());
  m.addControl(new maplibregl.NavigationControl());
  m.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }));
}

// — Style switch control
function addStyleSwitchControl() {
  const switcher = createStyleSwitcher();
  const ctrl = createStyleSwitchControl(switcher);
  mapInstance.addControl(ctrl);
}

function createStyleSwitcher() {
  const container = document.createElement('div');
  container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

  const label = document.createElement('label');
  label.className = 'fw-semibold text-success';
  label.innerText = 'Selecteer achtergrond:';
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  select.style.fontSize = '1.2em';
  select.style.cursor = 'pointer';

  const styles = props.STYLE_URLS.map(url => `${url}${props.API_KEY}`);
  styles.forEach((url, i) => {
    const opt = document.createElement('option');
    opt.value = url;
    opt.text = props.STYLE_NAMES[i] || `Style ${i+1}`;
    select.appendChild(opt);
  });

  select.onchange = () => {
    try {
      mapInstance.setStyle(select.value);
      setTimeout(() => {
        addRouteLayer();
      }, 100);
    } catch (err) {
      console.error('Style switch error:', err);
    }
  };

  container.appendChild(select);
  return container;
}

function createStyleSwitchControl(elem) {
  return {
    onAdd: () => elem,
    onRemove: () => {}
  };
}

// — React to props
watch([() => props.center, () => props.zoom], ([c, z]) => {
  if (mapInstance) { mapInstance.setCenter(c); mapInstance.setZoom(z); }
});
watch(() => props.styleUrl, ns => {
  if (mapInstance) { mapInstance.setStyle(ns); mapInstance.once('styledata', addRouteLayer); }
});

// — Lifecycle
onMounted(initMap);
onBeforeUnmount(() => { if (mapInstance) { mapInstance.remove(); mapInstance = null; } });
</script>

<style scoped>
.map-container { position: absolute; inset: 0; }
</style>
