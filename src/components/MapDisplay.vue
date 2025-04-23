<template>
  <div ref="mapContainer" class="map-container w-100 h-100"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, inject } from 'vue';
import maplibregl from 'maplibre-gl';

const props = defineProps({
  stationGeojson: {
    type: Object,
    required: true,
    default: () => ({ type: 'FeatureCollection', features: [] })
  },
  mapStyleUrl: {
    type: String,
    required: true
  },
  bbox: {
    type: Array,
    required: true
  },
  interpolationParams: {
    type: Object,
    required: true
  },
  property: {
    type: String,
    required: true
  }
});

const emit = defineEmits([
  'map-loaded',
  'station-clicked',
  'style-changed',
  'interpolation-layer-updated',
  'request-map-instance'
]);

const getColor = inject('getColor');

const mapContainer = ref(null);
const map = ref(null);
const popupInstance = ref(null);
const currentWmsLayerId = ref(null);
const activeWmsLayers = ref(new Set());

const STYLE_URLS = [
  `https://api.maptiler.com/maps/dataviz/style.json?key=`,
  `https://api.maptiler.com/maps/streets-v2/style.json?key=`,
  `https://api.maptiler.com/maps/hybrid/style.json?key=`,
  `https://api.maptiler.com/maps/basic-v2/style.json?key=`,
  `https://api.maptiler.com/maps/satellite/style.json?key=`,
];
const STYLE_NAMES = ['DataViz', 'Streets', 'Hybrid', 'Basic', 'Satellite'];
const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

onMounted(() => {
  if (!mapContainer.value) {
    console.error("Map container not found.");
    return;
  }

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: props.mapStyleUrl,
    center: [4.6, 52.0],
    zoom: 8.5,
    attributionControl: true,
  });

  map.value.on('load', () => {
    console.log('Map loaded event');
    initializeMapControls();
    addSourcesAndLayers();
    updateStationsSourceData(props.stationGeojson);
    updateStationLayerPaint();
    handleInterpolationLayer();
    emit('map-loaded', map.value);
    map.value.on('click', 'stations', handleMapClick);
    map.value.on('styledata', handleStyleDataChange);
  });

  map.value.on('error', (e) => {
    console.error("MapLibre Error:", e);
  });
});

onBeforeUnmount(() => {
  closePopup();
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
  activeWmsLayers.value.clear();
});

watch(() => props.stationGeojson, (newGeojson) => {
  if (map.value && map.value.isStyleLoaded()) {
    updateStationsSourceData(newGeojson);
  }
}, { deep: true });

watch(() => props.mapStyleUrl, (newStyleUrl) => {
  if (map.value) {
    console.log("Setting map style:", newStyleUrl);
    map.value.setStyle(newStyleUrl);
  }
});

watch(() => props.interpolationParams, () => {
  if (map.value && map.value.isStyleLoaded()) {
    handleInterpolationLayer();
  }
}, { deep: true });

watch(() => props.property, () => {
  if (map.value && map.value.isStyleLoaded() && map.value.getLayer('stations')) {
    updateStationLayerPaint();
  }
});

function initializeMapControls() {
  if (!map.value) return;
  map.value.addControl(new maplibregl.NavigationControl(), 'top-right');
  map.value.addControl(new maplibregl.FullscreenControl(), 'top-right');
  map.value.addControl(new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true
  }), 'top-right');
  const styleSwitcher = createStyleSwitcherControl();
  map.value.addControl(styleSwitcher, 'top-left');
}

function createStyleSwitcherControl() {
  const container = document.createElement('div');
  container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
  container.style.backgroundColor = 'white';
  container.style.padding = '5px';
  container.style.borderRadius = '4px';
  container.style.boxShadow = '0 0 0 2px rgba(0,0,0,.1)';

  const label = document.createElement('label');
  label.className = 'fw-semibold text-success d-block mb-1';
  label.style.fontSize = '0.8em';
  label.innerText = 'Selecteer achtergrond:';
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  select.style.fontSize = '0.9em';
  select.style.cursor = 'pointer';

  const fullStyleUrls = STYLE_URLS.map(url => `${url}${API_KEY}`);

  fullStyleUrls.forEach((styleUrl, index) => {
    const option = document.createElement('option');
    option.value = styleUrl;
    option.text = STYLE_NAMES[index] || `Style ${index + 1}`;
    if (styleUrl === props.mapStyleUrl) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.onchange = (event) => {
    const newStyleUrl = event.target.value;
    if (map.value) {
      map.value.setStyle(newStyleUrl);
      emit('style-changed', newStyleUrl);
    }
  };

  container.appendChild(select);

  return {
    onAdd: () => container,
    onRemove: () => { container.parentNode?.removeChild(container); },
    getDefaultPosition: () => 'top-left'
  };
}

function addSourcesAndLayers() {
  if (!map.value || !map.value.isStyleLoaded()) return;
  console.log('Attempting to add sources and layers');

  if (!map.value.getSource('bbox-line')) {
    map.value.addSource('bbox-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...props.bbox, props.bbox[0]]]
        }
      }
    });
  }
  if (!map.value.getLayer('bbox-line-layer')) {
    map.value.addLayer({
      id: 'bbox-line-layer',
      type: 'line',
      source: 'bbox-line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ff0000',
        'line-width': 1.4,
        'line-opacity': 0.8,
        'line-dasharray': [2, 2]
      }
    });
  }

  if (!map.value.getSource('stations')) {
    map.value.addSource("stations", {
      type: 'geojson',
      data: props.stationGeojson
    });
  }

  if (!map.value.getLayer('stations')) {
    map.value.addLayer({
      'id': 'stations',
      'type': 'circle',
      'source': 'stations',
      'paint': {
        'circle-radius': 6,
        'circle-color': getCircleColorExpression(),
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.8,
      }
    });
  } else {
    updateStationLayerPaint();
  }
}

function updateStationsSourceData(geojson) {
  if (!map.value || !map.value.getSource('stations')) {
    console.warn('Map or stations source not ready for data update.');
    return;
  }
  map.value.getSource('stations').setData(geojson);
}

function updateStationLayerPaint() {
  if (!map.value || !map.value.getLayer('stations')) {
    console.warn('Map or stations layer not ready for paint update.');
    return;
  }
  map.value.setPaintProperty('stations', 'circle-color', getCircleColorExpression());
}

function getCircleColorExpression() {
  const expression = [
    'case',
    ['==', ['to-number', ['get', 'value'], null], null], 'rgba(128, 128, 128, 1)',
  ];
  const prop = props.property;
  if (prop === 'pm25') {
    expression.push(['<', ['to-number', ['get', 'value']], 8.3], getColor(0, prop, 1));
    expression.push(['<', ['to-number', ['get', 'value']], 16.7], getColor(10, prop, 1));
    expression.push(['<', ['to-number', ['get', 'value']], 25], getColor(20, prop, 1));
    expression.push(getColor(30, prop, 1));
  } else {
    expression.push(['<', ['to-number', ['get', 'value']], 13.3], getColor(0, prop, 1));
    expression.push(['<', ['to-number', ['get', 'value']], 26.6], getColor(20, prop, 1));
    expression.push(['<', ['to-number', ['get', 'value']], 40], getColor(30, prop, 1));
    expression.push(getColor(50, prop, 1));
  }
  expression.push('rgba(0, 0, 0, 1)');
  return expression;
}

function handleMapClick(e) {
  if (!e.features || e.features.length === 0) return;
  closePopup();
  const features = map.value.queryRenderedFeatures(e.point, { layers: ['stations'] });
  if (features.length > 1) {
    createDropdownPopup(features, e.lngLat);
  } else if (features.length === 1) {
    createDetailPopup(features[0], e.lngLat);
  }
}

function createDetailPopup(feature, lngLat) {
  const properties = feature.properties;
  const popupHTML = getPopupHTML(properties);
  popupInstance.value = new maplibregl.Popup({ className: 'my-popup', closeButton: true, closeOnClick: true })
      .setLngLat(lngLat)
      .setHTML(popupHTML)
      .addTo(map.value);
  nextTick(() => {
    const button = popupInstance.value?.getElement().querySelector('button.station-info-button');
    if (button) {
      button.addEventListener('click', () => {
        emit('station-clicked', { ...properties });
        closePopup();
      });
    }
  });
}

function createDropdownPopup(features, lngLat) {
  let dropdownHTML = `
    <div class="card text-center border-primary" style="min-width: 200px;">
      <div class="card-header bg-primary text-white py-1 px-2">
        <h6 class="mb-0 small">Meerdere Stations</h6>
      </div>
      <div class="card-body p-2">
        <div class="dropdown">
          <button class="btn btn-sm btn-outline-primary dropdown-toggle w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            Selecteer Station
          </button>
          <ul class="dropdown-menu" style="max-height: 200px; overflow-y: auto;">`;
  features.forEach((feature, index) => {
    const props = feature.properties;
    const color = getColor(props.value, props.property, 1);
    dropdownHTML += `
            <li>
              <a class="dropdown-item small station-dropdown-item" href="#" data-feature-index="${index}">
                <i class="bi bi-geo-alt-fill me-1" style="color: ${color};"></i>
                ${props.station_name || 'Onbekend'}
              </a>
            </li>`;
  });
  dropdownHTML += `</ul></div></div></div>`;

  popupInstance.value = new maplibregl.Popup({ className: 'my-multi-popup', closeButton: true, closeOnClick: true })
      .setLngLat(lngLat)
      .setHTML(dropdownHTML)
      .addTo(map.value);

  nextTick(() => {
    const popupElement = popupInstance.value?.getElement();
    if (popupElement) {
      const dropdownToggle = popupElement.querySelector('[data-bs-toggle="dropdown"]');
      if (dropdownToggle && window.bootstrap?.Dropdown) {
        new window.bootstrap.Dropdown(dropdownToggle);
      }
      popupElement.addEventListener('click', (event) => {
        const target = event.target.closest('.station-dropdown-item');
        if (target && target.dataset.featureIndex !== undefined) {
          event.preventDefault();
          const selectedIndex = parseInt(target.dataset.featureIndex, 10);
          const selectedFeature = features[selectedIndex];
          closePopup();
          createDetailPopup(selectedFeature, lngLat);
        }
      });
    }
  });
}

function getPopupHTML(properties) {
  const { station_name, property, value, unit, Gemeente, regio, measured_time } = properties;
  const formattedDate = measured_time
      ? new Date(measured_time).toLocaleString('nl-NL', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      : 'N/A';
  const displayValue = (value !== null && value !== undefined) ? `${value.toFixed(1)} ${unit || 'µg/m³'}` : 'Geen data';
  const color = getColor(value, property, 1);

  return `
    <div class="card text-center shadow-sm" style="min-width: 250px; border-color: ${color};">
      <div class="card-header py-1 px-2" style="background-color: ${color}; color: white;">
        <h6 class="mb-0 small fw-bold">${station_name || 'Onbekend Station'}</h6>
      </div>
      <div class="card-body p-2">
        <p class="card-text small mb-1">
          <strong>${property?.toUpperCase() || 'N/A'}:</strong> ${displayValue}
        </p>
        <p class="card-text small mb-1">
          ${Gemeente || 'N/A'} - ${regio || 'N/A'}
        </p>
        <p class="card-text mb-2">
          <small class="text-muted" style="font-size: 0.7em;">${formattedDate} (UTC)</small>
        </p>
        <button class="btn btn-sm station-info-button w-100" style="background-color: ${color}; color: white;">
          <i class="bi bi-graph-up me-1"></i> Meer info
        </button>
      </div>
    </div>`;
}

function closePopup() {
  if (popupInstance.value) {
    popupInstance.value.remove();
    popupInstance.value = null;
  }
}

function handleInterpolationLayer() {
  if (!map.value || !map.value.isStyleLoaded() || !props.interpolationParams) return;
  const { status, property, date, time } = props.interpolationParams;
  const wmsTime = parseDateForWms(date, time);
  if (!wmsTime) {
    console.warn("Cannot update WMS layer: Invalid date/time parameters.");
    setAllWmsLayersOpacity(0);
    currentWmsLayerId.value = null;
    return;
  }
  const targetLayerId = `interpolatie-${property}-${wmsTime}`;
  if (status === 'activate') {
    currentWmsLayerId.value = targetLayerId;
    if (!map.value.getSource(targetLayerId)) {
      console.log("Adding WMS source/layer:", targetLayerId);
      const bounds = [props.bbox[0][0], props.bbox[0][1], props.bbox[1][0], props.bbox[1][1]];
      const wmsUrl = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${property}_sqldb&bbox=${bounds.join(',')}&time=${wmsTime}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`;
      try {
        map.value.addSource(targetLayerId, {
          'type': 'image',
          'url': wmsUrl,
          'coordinates': [
            [bounds[0], bounds[3]], [bounds[2], bounds[3]],
            [bounds[2], bounds[1]], [bounds[0], bounds[1]]
          ]
        });
        map.value.addLayer({
          'id': targetLayerId,
          'type': 'raster',
          'source': targetLayerId,
          'paint': { 'raster-opacity': 0 }
        }, 'stations');
        activeWmsLayers.value.add(targetLayerId);
        setAllWmsLayersOpacity(0);
        map.value.setPaintProperty(targetLayerId, 'raster-opacity', 1);
        emit('interpolation-layer-updated', targetLayerId, 'added');
      } catch (error) {
        console.error("Error adding WMS source/layer:", targetLayerId, error);
      }
    } else {
      setAllWmsLayersOpacity(0);
      if (map.value.getLayer(targetLayerId)) {
        map.value.setPaintProperty(targetLayerId, 'raster-opacity', 1);
        emit('interpolation-layer-updated', targetLayerId, 'opacity-changed');
      }
    }
  } else {
    currentWmsLayerId.value = null;
    setAllWmsLayersOpacity(0);
    emit('interpolation-layer-updated', targetLayerId, 'hidden');
  }
}

function setAllWmsLayersOpacity(opacity) {
  if (!map.value) return;
  activeWmsLayers.value.forEach(layerId => {
    if (map.value.getLayer(layerId)) {
      try {
        map.value.setPaintProperty(layerId, 'raster-opacity', opacity);
      } catch(e) {
        // ignore error
      }
    }
  });
}

function parseDateForWms(formattedDateString, hour) {
  if (!formattedDateString || hour === null || hour === undefined) return null;
  const monthMap = { januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5, juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11 };
  const parts = formattedDateString.split('|');
  const datePart = parts[1]?.trim();
  if (!datePart) return null;
  const dateParts = datePart.split(' ');
  if (dateParts.length < 3) return null;
  const day = parseInt(dateParts[0], 10);
  const monthName = dateParts[1].toLowerCase();
  const year = parseInt(dateParts[2], 10);
  if (isNaN(day) || isNaN(year) || !(monthName in monthMap)) return null;
  const month = monthMap[monthName];
  const localDate = new Date(year, month, day, parseInt(hour, 10));
  const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
  return utcDate.toISOString().replace('.000', '');
}

function handleStyleDataChange() {
  console.log("Map style data changed/loaded. Re-adding sources/layers.");
  if (map.value && map.value.isStyleLoaded()) {
    addSourcesAndLayers();
    updateStationsSourceData(props.stationGeojson);
    activeWmsLayers.value.clear();
    currentWmsLayerId.value = null;
    handleInterpolationLayer();
  }
}

</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(.my-popup .maplibregl-popup-content) {
  padding: 0;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}
:deep(.my-popup .maplibregl-popup-close-button) {
  font-size: 1.2rem;
  padding: 2px 6px;
  color: #fff;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
  z-index: 1;
  right: 5px;
  top: 2px;
}
:deep(.my-multi-popup .maplibregl-popup-content) {
  padding: 0;
  border-radius: 0.375rem;
}
:deep(.my-multi-popup .maplibregl-popup-close-button) {
  color: #fff;
  right: 5px;
  top: 2px;
}
</style>

<style>
/* Global override if needed */
.maplibregl-popup-content .card {
  border: none;
}
.maplibregl-popup-content .dropdown-menu {
  z-index: 1050;
}
</style>