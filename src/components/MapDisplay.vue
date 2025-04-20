<template>
  <div ref="mapContainer" class="map-container">
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; // Import MapLibre CSS

// --- Props Definition ---
const props = defineProps({
  apiKey: { type: String, required: true }, // Maptiler API Key
  styleUrls: { type: Array, required: true }, // Array of base style URLs
  styleNames: { type: Array, required: true }, // Array of display names for styles
  initialCenter: { type: Array, default: () => [4.218788, 52.008663] }, // Default center (Zuid-Holland)
  initialZoom: { type: Number, default: 8.9 }, // Default zoom level
  geojson: { // GeoJSON data for stations
    type: Object,
    default: () => ({ type: 'FeatureCollection', features: [] }), // Default empty GeoJSON
    // Custom validator (optional but recommended)
    validator: (value) => {
      return value && typeof value === 'object' && value.type === 'FeatureCollection' && Array.isArray(value.features || value.Features);
    }
  },
  interpolationStatus: { type: String, default: 'disable' }, // 'activate' or 'disable' IDW layer
  property: { type: String, required: true }, // Current property (pm25, pm10, no2) for styling/IDW
  bbox: { // Bounding box for line layer and potentially IDW extent
    type: Array,
    default: () => [[3.773675, 51.643777], [5.031415, 52.332510]] // Default bbox [[minLon, minLat], [maxLon, maxLat]]
  },
  rasterLayers: { type: Set, required: true }, // Set to track added raster layer IDs
  currentLayerId: { type: String, default: null }, // ID of the currently visible raster layer
  targetInterpolationDateISO: { // Date string for fetching the correct IDW layer
    type: String,
    default: null, // e.g., '2023-10-27T12:00:00Z'
  }
});

// --- Event Emissions ---
const emit = defineEmits([
  'map-loaded',                // (payload: Maplibre Map instance) - When map is ready
  'station-clicked',           // (payload: object - properties of the clicked station) - For modal display
  'interpolation-layer-added', // (payload: string - layer ID) - When a new IDW layer is added
  'interpolation-layer-updated',// (payload: string | null - current layer ID) - When IDW visibility changes
  'style-changed'              // (no payload) - When the map base style is changed
]);

// --- Refs ---
const mapContainer = ref(null); // Template ref for the map container div
const map = ref(null);          // Holds the MapLibre map instance

// --- Internal State ---
let currentPopups = []; // Array to keep track of active popups

// --- Map Initialization ---
const initializeMap = () => {
  // Ensure container and API key are present
  if (!mapContainer.value || !props.apiKey) {
    console.error("Map container ref or API key not available for map initialization.");
    return;
  }
  // Use the first style URL or a fallback
  const initialStyle = props.styleUrls[0]
      ? `${props.styleUrls[0]}${props.apiKey}`
      : `https://api.maptiler.com/maps/streets/style.json?key=${props.apiKey}`;

  try {
    // Create MapLibre instance
    map.value = new maplibregl.Map({
      container: mapContainer.value,
      style: initialStyle,
      center: props.initialCenter,
      zoom: props.initialZoom,
      attributionControl: true // Show attribution
    });

    // --- Map Event Listeners ---
    map.value.once('load', () => { // Use 'once' if setup should only happen truly once
      console.log("MapDisplay: Map instance loaded.");
      if (!map.value) return; // Guard against race condition on unmount
      addControls(); // Add navigation, fullscreen, geolocate, style switcher
      addLineSourceAndLayer(); // Add bounding box layer
      updateStationsLayer(); // Add initial station data
      updateInterpolationLayerVisibility(); // Set initial IDW visibility
      emit('map-loaded', map.value); // Notify parent that map is ready

      // Listener for style changes (important for re-adding sources/layers)
      map.value.on('styledata', handleStyleDataChange);
    });

    map.value.on('error', (e) => console.error('MapLibre Error:', e?.error?.message || e));

    // Click listener specifically for the 'stations' layer
    map.value.on('click', 'stations', handleStationLayerClick);

    // General map click listener (to close popups when clicking elsewhere)
    map.value.on('click', handleMapClick);

  } catch (error) {
    console.error("Failed to initialize MapLibre map:", error);
    // Optionally: Display an error message to the user in the UI
  }
};

// --- Map Controls ---
const addControls = () => {
  if (!map.value) return;
  try {
    // Add standard controls if they don't exist already (simple check)
    if (!map.value.hasControl(maplibregl.FullscreenControl)) {
      map.value.addControl(new maplibregl.FullscreenControl());
    }
    if (!map.value.hasControl(maplibregl.NavigationControl)) {
      map.value.addControl(new maplibregl.NavigationControl(), 'top-right');
    }
    if (!map.value.hasControl(maplibregl.GeolocateControl)) {
      map.value.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');
    }
    addStyleSwitchControl(); // Add custom style switcher
  } catch (error) {
    console.error("Error adding map controls:", error);
  }
};

// --- Custom Style Switcher Control ---
const addStyleSwitchControl = () => {
  if (!map.value) return;
  try {
    // Check if the control already exists to prevent duplicates on HMR or style reloads
    if (!map.value._controls.some(ctrl => ctrl.container?.classList.contains('map-style-switcher'))) {
      const styleSwitcher = createStyleSwitcher();
      map.value.addControl({
        onAdd: () => styleSwitcher,
        onRemove: () => styleSwitcher.remove(), // Basic cleanup on map remove
        getDefaultPosition: () => 'top-left' // Position control top-left
      }, 'top-left');
    }
  } catch (error) {
    console.error("Error adding style switch control:", error);
  }
};

const createStyleSwitcher = () => {
  // Creates the DOM elements for the style switcher dropdown
  const container = document.createElement('div');
  container.className = 'maplibregl-ctrl maplibregl-ctrl-group map-style-switcher p-1 bg-white rounded shadow-sm'; // Added Bootstrap classes

  const label = document.createElement('label');
  label.className = 'fw-semibold text-success d-block mb-1';
  label.style.fontSize = '0.8em';
  label.innerText = 'Kaartstijl:';
  label.htmlFor = 'mapStyleSelect'; // Accessibility
  container.appendChild(label);

  const select = document.createElement('select');
  select.id = 'mapStyleSelect';
  select.className = 'form-select form-select-sm';
  select.style.cursor = 'pointer';
  select.style.maxWidth = '150px'; // Limit width

  // Populate dropdown options from props
  const styles = props.styleUrls.map(url => `${url}${props.apiKey}`);
  styles.forEach((styleUrl, index) => {
    const option = document.createElement('option');
    option.value = styleUrl;
    option.text = props.styleNames[index] || `Style ${index + 1}`;
    select.appendChild(option);
  });

  // Handle style change
  select.onchange = (event) => {
    if (!map.value) return;
    try {
      map.value.setStyle(event.target.value); // Set the new map style
      // The 'styledata' event will handle re-adding layers
    } catch (error) {
      console.error('Error switching map styles:', error);
      alert("Kon kaartstijl niet laden."); // User feedback
    }
  };
  container.appendChild(select);
  return container;
};

// --- Style Change Handling ---
// This function runs whenever the map's style finishes loading (initial load or change)
const handleStyleDataChange = () => {
  // Check if map and style are fully loaded before proceeding
  if (!map.value || !map.value.isStyleLoaded()) return;
  console.log("MapDisplay: Style data loaded event triggered. Re-adding/updating sources and layers.");
  // Re-add or update layers that might be removed by the style change
  addLineSourceAndLayer();
  updateStationsLayer(); // Will add source/layer if missing, or update data if source exists
  updateInterpolationLayerVisibility(); // Re-evaluate and add/show/hide IDW layers
  emit('style-changed'); // Notify parent
};

// --- Bounding Box Layer ---
const addLineSourceAndLayer = () => {
  if (!map.value?.isStyleLoaded()) return;
  const sourceId = 'bounding-box-line';
  const layerId = 'bounding-box-line-layer';

  // Validate bbox prop structure
  if (!props.bbox || props.bbox.length !== 2 || !props.bbox.every(coord => Array.isArray(coord) && coord.length === 2)) {
    console.warn("Invalid bbox prop structure for line layer:", props.bbox);
    return;
  }

  // Construct coordinates for the rectangle from bbox [[minLon, minLat], [maxLon, maxLat]]
  const [[minLon, minLat], [maxLon, maxLat]] = props.bbox;
  const coords = [ [minLon, maxLat], [maxLon, maxLat], [maxLon, minLat], [minLon, minLat], [minLon, maxLat] ]; // Closed ring
  const lineData = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };

  try {
    const source = map.value.getSource(sourceId);
    if (!source) {
      // Add source if it doesn't exist
      map.value.addSource(sourceId, { type: 'geojson', data: lineData });
    } else {
      // Update data if source already exists
      source.setData(lineData);
    }

    // Add layer if it doesn't exist
    if (!map.value.getLayer(layerId)) {
      map.value.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ff0000', 'line-width': 1.4, 'line-opacity': 0.6, 'line-blur': 0.5 }
      });
    }
  } catch (e) {
    console.error("Error adding/updating line source/layer:", e);
  }
};

// --- Stations Layer ---
const updateStationsLayer = () => {
  if (!map.value?.isStyleLoaded()) return;
  const sourceId = 'stations';
  const layerId = 'stations';

  // Handle both 'features' and 'Features' property names for flexibility
  const features = props.geojson?.features || props.geojson?.Features || [];
  const geojsonData = { type: 'FeatureCollection', features: features };

  try {
    const currentSource = map.value.getSource(sourceId);
    if (!currentSource) {
      // Add source if it doesn't exist
      map.value.addSource(sourceId, { type: 'geojson', data: geojsonData });
      addStationsLayer(); // Add the corresponding layer
    } else {
      // Update source data if it already exists
      currentSource.setData(geojsonData);
      // Ensure layer exists (might have been removed by style change)
      if (!map.value.getLayer(layerId)) {
        addStationsLayer();
      }
    }
  } catch (error) {
    console.error("Error adding/updating stations source:", error);
  }
};

const addStationsLayer = () => {
  // Adds the circle layer for stations if source exists and layer doesn't
  if (!map.value?.getSource('stations') || map.value?.getLayer('stations')) return;
  try {
    map.value.addLayer({
      id: 'stations',
      type: 'circle',
      source: 'stations',
      paint: {
        'circle-radius': 6,
        'circle-color': getCircleColorExpression(), // Use expression for dynamic color
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.8,
        'circle-opacity': 0.9 // Slightly transparent
      }
    });
  } catch (error) {
    console.error("Error adding stations layer:", error);
  }
};

const getCircleColorExpression = () => {
  // MapLibre expression to determine circle color based on property and value
  // Includes 'coalesce' to handle null/missing values gracefully
  return [
    'case',
    // Condition 1: Property is 'pm25'
    ['==', ['get', 'property'], 'pm25'],
    // Result 1: Step expression for PM2.5
    ['step', ['coalesce', ['get', 'value'], -1], // Default to -1 if value is null/missing
      '#CCCCCC', // Color for values < 0 (e.g., null/missing)
      0, '#1E90FF', // Color for 0 <= value < 8.3
      8.3, '#48D1CC', // Color for 8.3 <= value < 16.7
      16.7, '#9ACD32', // Color for 16.7 <= value < 25
      25, '#DAA520'], // Color for value >= 25
    // Condition 2: Property is 'no2' OR 'pm10'
    ['any', ['==', ['get', 'property'], 'no2'], ['==', ['get', 'property'], 'pm10']],
    // Result 2: Step expression for NO2/PM10
    ['step', ['coalesce', ['get', 'value'], -1],
      '#CCCCCC', // Color for null/missing
      0, '#1E90FF', // Color for 0 <= value < 13.3
      13.3, '#48D1CC', // Color for 13.3 <= value < 26.6
      26.6, '#9ACD32', // Color for 26.6 <= value < 40
      40, '#DAA520'], // Color for value >= 40
    // Fallback color if none of the above conditions match
    '#CCCCCC'
  ];
};

// --- Interpolation (IDW) Layer ---
const updateInterpolationLayerVisibility = async () => {
  // This function manages adding, showing, and hiding IDW layers based on props
  if (!map.value?.isStyleLoaded()) return;

  // Get the target date from props (provided by parent)
  const targetDateISO = props.targetInterpolationDateISO;

  // If no target date, hide all known raster layers
  if (!targetDateISO) {
    props.rasterLayers.forEach(id => hideLayer(id));
    emit('interpolation-layer-updated', null); // Notify parent no layer is active
    return;
  }

  // Construct the expected layer ID based on date and property
  const targetLayerId = `interpolatie-${targetDateISO}-${props.property}`;

  if (props.interpolationStatus === 'activate') {
    // If IDW is activated:
    // 1. Add the source/layer if it doesn't exist yet
    if (!map.value.getSource(targetLayerId)) {
      console.log(`MapDisplay: Interpolation source ${targetLayerId} not found. Attempting to add.`);
      await addInterpolationSourceAndLayer(targetLayerId, targetDateISO);
      // Short delay might be needed for layer to be ready after adding source asynchronously
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 2. Ensure only the target layer is visible, hide others
    let foundAndShown = false;
    props.rasterLayers.forEach(id => {
      if (id === targetLayerId) {
        // Attempt to show the target layer
        if (map.value?.getLayer(id)) {
          showLayer(id);
          foundAndShown = true;
          console.log(`MapDisplay: Showing interpolation layer ${id}`);
        } else {
          console.warn(`MapDisplay: Target interpolation layer ${id} not found after add attempt.`);
        }
      } else {
        // Hide all other known raster layers
        hideLayer(id);
      }
    });

    // If target layer wasn't successfully shown (e.g., failed to add), emit null
    emit('interpolation-layer-updated', foundAndShown ? targetLayerId : null);

  } else {
    // If IDW is disabled, hide all known raster layers
    props.rasterLayers.forEach(id => hideLayer(id));
    emit('interpolation-layer-updated', null); // Notify parent no layer is active
  }
};

const addInterpolationSourceAndLayer = async (layerId, dateISO) => {
  // Adds the WMS image source and raster layer for IDW
  if (!map.value || !dateISO || map.value.getSource(layerId)) return; // Don't re-add if source exists

  // Validate bbox
  if (!props.bbox || props.bbox.length !== 2 || !props.bbox.every(coord => Array.isArray(coord) && coord.length === 2)) {
    console.error("Invalid bbox for interpolation layer:", props.bbox);
    return;
  }

  // Construct WMS URL
  const [[minLon, minLat], [maxLon, maxLat]] = props.bbox;
  const bounds = [minLon, minLat, maxLon, maxLat]; // Format: minLon, minLat, maxLon, maxLat
  const imageUrl = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${props.property}_sqldb&bbox=${bounds.join(',')}&time=${dateISO}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`;

  // Define coordinates for the image overlay corners
  const imageCoordinates = [ [bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]] ]; // [top-left, top-right, bottom-right, bottom-left]

  try {
    // Add the image source
    map.value.addSource(layerId, { type: 'image', url: imageUrl, coordinates: imageCoordinates });

    // Add the raster layer (start hidden)
    if (!map.value.getLayer(layerId)) {
      map.value.addLayer({
        id: layerId,
        type: 'raster',
        source: layerId,
        paint: { 'raster-opacity': 0 } // Initialize hidden
      });
      emit('interpolation-layer-added', layerId); // Notify parent a new layer ID was added
      console.log(`MapDisplay: Added interpolation source and layer ${layerId}`);
    }
  } catch (error) {
    console.error(`Error adding interpolation source/layer ${layerId}:`, error);
    // Clean up failed source addition
    if (map.value.getSource(layerId) && !map.value.getLayer(layerId)) {
      try { map.value.removeSource(layerId); } catch (rmError) { console.error("Error removing source after layer add failed:", rmError); }
    }
  }
};

// Helper functions to show/hide layers safely
const showLayer = (layerId) => {
  if (map.value?.getLayer(layerId)) {
    try { map.value.setPaintProperty(layerId, 'raster-opacity', 0.8); } // Use 0.8 for slight transparency
    catch(e) { console.warn(`Could not set opacity for layer ${layerId}:`, e?.error?.message || e); }
  }
};
const hideLayer = (layerId) => {
  if (map.value?.getLayer(layerId)) {
    try { map.value.setPaintProperty(layerId, 'raster-opacity', 0); }
    catch(e) { console.warn(`Could not set opacity for layer ${layerId}:`, e?.error?.message || e); }
  }
};

// --- Click Handling & Popups ---
// Close popups if clicking anywhere on the map except a station
const handleMapClick = (e) => {
  if (!map.value) return;
  // Query features at the clicked point on the 'stations' layer
  const features = map.value.queryRenderedFeatures(e.point, { layers: ['stations'] });
  // If no station features are clicked, close all popups
  if (!features?.length) {
    closeAllPopups();
  }
};

// Handle clicks specifically on the 'stations' layer
const handleStationLayerClick = (e) => {
  if (!map.value || !e.features?.length) return;
  // Prevent map click handler from closing the popup immediately
  e.originalEvent.stopPropagation();
  closeAllPopups(); // Close any existing popups first

  // Query again to handle potential clustering/overlap at the click point
  const features = map.value.queryRenderedFeatures(e.point, { layers: ['stations'] });
  if (features?.length > 1) {
    // If multiple features overlap, show a dropdown selection popup
    createDropdownPopup(features, e.lngLat);
  } else if (features?.length === 1) {
    // If only one feature, show its detail popup directly
    createDetailPopup(features[0], e.lngLat);
  }
};

const createDropdownPopup = (features, lngLat) => {
  if (!map.value) return;
  // Build HTML for the dropdown popup
  let html = `<div class="card text-center border-primary shadow-sm overlapping-stations-popup">
                <div class="card-header bg-primary text-white py-1 px-2">
                  <h6 class="mb-0" style="font-size: 0.9em;">Selecteer Station</h6>
                </div>
                <div class="card-body p-0">
                  <div class="list-group list-group-flush" style="max-height: 150px; overflow-y: auto;">`;
  features.forEach((f, i) => {
    const p = f.properties;
    const color = getColorForPopup(p?.value, p?.property); // Use helper for color
    html += `<a href="#" class="list-group-item list-group-item-action py-1 px-2 station-dropdown-item" data-feature-index="${i}" style="font-size: 0.85em;">
               <i class="bi bi-geo-alt-fill me-1" style="color: ${color};"></i> ${p?.station_name || 'Onbekend'}
             </a>`;
  });
  html += `</div></div></div>`;

  // Create and add the popup to the map
  const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 15, maxWidth: '250px' })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map.value);
  currentPopups.push(popup); // Track the popup

  // Add event listeners to dropdown items *after* the popup is added to the DOM
  nextTick(() => {
    popup.getElement()?.querySelectorAll('.station-dropdown-item').forEach(item => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const index = parseInt(event.currentTarget.dataset.featureIndex, 10);
        if (!isNaN(index) && features[index]) {
          closeAllPopups(); // Close this dropdown
          createDetailPopup(features[index], lngLat); // Show detail popup for selected item
        }
      });
    });
  });
};

const createDetailPopup = (feature, lngLat) => {
  if (!map.value || !feature?.properties) return;
  const properties = feature.properties;
  const popupHTML = getPopupHTML(properties); // Generate HTML content

  // Create and add the detail popup
  const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 15, maxWidth: '300px' })
      .setLngLat(lngLat)
      .setHTML(popupHTML)
      .addTo(map.value);
  currentPopups.push(popup); // Track the popup

  // Add event listener to the "Details" button *after* popup is added
  nextTick(() => {
    popup.getElement()?.querySelector('.station-detail-button')?.addEventListener('click', () => {
      // When button is clicked, emit the station's properties to the parent
      emit('station-clicked', properties);
      // Optional: close popup when detail button is clicked?
      // closeAllPopups();
    });
  });
};

const getPopupHTML = (properties) => {
  // Generates HTML string for the station detail popup
  const { station_name, property, value, unit, Gemeente, regio, measured_time } = properties;
  // Formatting options for date/time
  const timeOpts = { timeZone: 'Europe/Amsterdam', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedDate = measured_time ? new Date(measured_time).toLocaleString('nl-NL', timeOpts) : 'N/A';
  const displayValue = (value != null) ? value.toFixed(2) : 'N/A';
  const displayUnit = unit || '';
  const color = getColorForPopup(value, property); // Get color based on value/property
  // Combine location info safely
  const locationInfo = [Gemeente ? `Gemeente ${Gemeente}` : null, regio ? `Regio ${regio}` : null].filter(Boolean).join(' - ');

  // Return Bootstrap card HTML structure
  return `<div class="card text-center station-popup shadow-sm" style="border: 1px solid ${color}; font-size: 0.9em;">
            <div class="card-header py-1 px-2" style="background-color: ${color}; color: white;">
              <h6 class="mb-0 fw-bold" style="font-size: 1em;">${station_name || 'Onbekend Station'}</h6>
            </div>
            <div class="card-body p-2">
              <h6 class="card-title mb-1 fw-semibold" style="font-size: 0.95em;">${property || 'N/A'}: <strong class="ms-1">${displayValue} ${displayUnit}</strong></h6>
              ${locationInfo ? `<p class="card-text mb-1 text-muted" style="font-size: 0.85em;">${locationInfo}</p>` : ''}
              <p class="card-text mb-2"><small class="text-muted" style="font-size: 0.8em;">Tijd: ${formattedDate}</small></p>
              <button class="btn btn-sm station-detail-button w-100 fw-medium" style="background-color: ${color}; color: white; font-size: 0.85em;" title="Bekijk details en grafiek">
                <i class="bi bi-graph-up me-1"></i> Details & Grafiek
              </button>
            </div>
          </div>`;
};

const getColorForPopup = (value, property) => {
  // Simplified color logic for popup border/header (can be same as getColor in parent)
  if (value == null) return '#CCCCCC'; // Grey for null/undefined
  const thresholds = property === "pm25" ? [8.3, 16.7, 25] : [13.3, 26.6, 40];
  const colors = ['#1E90FF', '#48D1CC', '#9ACD32', '#DAA520']; // Blue, Turquoise, Green, Orange
  if (value < thresholds[0]) return colors[0];
  if (value < thresholds[1]) return colors[1];
  if (value < thresholds[2]) return colors[2];
  return colors[3]; // Use last color if >= highest threshold
};

const closeAllPopups = () => {
  // Remove all tracked popups from the map
  currentPopups.forEach(popup => popup.remove());
  currentPopups = []; // Clear the tracking array
};

// --- Watchers ---
// Watch for changes in the GeoJSON data prop
watch(() => props.geojson, (newVal, oldVal) => {
  // Update the stations layer if the map is ready and data has actually changed
  // Use deep: false because we only need to react if the object reference changes (parent replaces it)
  if (map.value?.isStyleLoaded() && newVal !== oldVal) {
    updateStationsLayer();
  }
}, { deep: false });

// Watch for changes relevant to the interpolation layer
watch(() => [props.interpolationStatus, props.property, props.targetInterpolationDateISO], () => {
  if (map.value?.isStyleLoaded()) {
    updateInterpolationLayerVisibility();
  }
});

// --- Lifecycle Hooks ---
onMounted(() => {
  initializeMap(); // Initialize map when component is mounted
});

onBeforeUnmount(() => {
  console.log("MapDisplay: Unmounting component.");
  closeAllPopups(); // Clean up popups
  if (map.value) {
    map.value.remove(); // Fully remove the map instance and listeners
    map.value = null;
  }
});

</script>

<style>
/* Import Bootstrap Icons CSS if used in popups */
/* @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"); */

.map-container {
  width: 100%;
  height: 100%;
  position: relative; /* Needed for absolute positioning of controls if added here */
  background-color: #e9ecef; /* Light grey background while map loads */
}

/* Optional: Style the maplibre controls */
.maplibregl-ctrl-top-right .maplibregl-ctrl-group {
  margin-top: 5px; /* Add some margin */
}

/* Customize Popup appearance */
.maplibregl-popup-content {
  padding: 0; /* Remove default padding if using Bootstrap cards */
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  border-radius: 0.25rem; /* Match card radius */
}
.maplibregl-popup-close-button {
  font-size: 1.2em;
  padding: 2px 6px;
  /* Improve visibility */
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  margin: 3px;
  color: #333;
}
.maplibregl-popup-close-button:hover {
  background-color: rgba(255, 255, 255, 0.9);
  color: #000;
}

/* Ensure popups appear above other elements if necessary */
.maplibregl-popup {
  z-index: 15; /* Adjust as needed */
}

/* Style switcher specific adjustments */
.map-style-switcher .form-select-sm {
  height: calc(1.5em + 0.5rem + 2px);
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.5rem;
  font-size: .875rem;
}

</style>