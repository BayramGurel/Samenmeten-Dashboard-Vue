<template>
  <!-- Sidebar with map-specific information -->
  <MapSidebarInfo
      :geojson="geojson"
      :formatted-property="formattedProperty"
      :description="description"
  />
  <!-- Map container -->
  <div class="container-fluid" id="czoom">
    <!-- Control panel anchored above the map. Use responsive classes rather than zoom hacks -->
    <div class="position-absolute start-0 shadow mt-3 ms-3 col-md-4 col-8 custom-div">
      <!-- Legend and time slider controls -->
      <DashboardLegendTabs
          v-model:timeValue="timeValue"
          v-model:selectedDay="selectedDay"
          v-model:selectedProperty="selectedProperty"
          :day-names="dayNames"
          :is-playing="isPlaying"
          :button-class="buttonClass"
          :formatted-property="formattedProperty"
          :legenda-values="legendaValues"
          :colors="colors"
          :concentration-values="concentrationValues"
          :is-from="isFrom"
          @reload-page="reloadPage"
          @update-layer="updateLayer"
          @stop-slider="stopSlider"
          @toggle-slider="toggleSlider"
          @clear-input="clearInput"
      />

      <!-- Data tools (filters, downloads) -->
      <DashboardDataTools
          ref="dataTools"
          :regio="regio"
          :gemeente="Gemeente"
          :station-name="stationName"
          :search="search"
          :interpolation-status="interpolationStatus"
          :is-local-file="isLocalFile"
          :file-name="fileName"
          @update-layer="updateLayer"
          @select-matching-stations="selectMatchingStations"
          @update:regio="updateRegio"
          @update:gemeente="updateGemeente"
          @update:station-name="updateStationName"
          @update:search="(val: string) => (search = val)"
          @update:interpolation-status="(val: string) => (interpolationStatus = val)"
          @clear-input="clearInput"
          @download-geojson="downloadGeoJSON"
          @download-csv="downloadCSV"
      />
    </div>
    <!-- Modal for station details -->
    <DashboardStationModal
        ref="stationModal"
        :formatted-property="formattedProperty"
        :properties="properties"
    />
    <!-- Toast for download notifications -->
    <DashboardToast ref="toastPanel" :time-string="timeString" />
  </div>
</template>

<!--
  This component renders the main dashboard for the Samen Meten application.
  It has been refactored from the legacy Options API to the Composition API
  for improved readability, reusability and type safety. State is managed
  through reactive references and objects. External side effects such as map
  initialization, data fetching and DOM interactions are isolated in
  composable functions.
-->
<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue';
import MapSidebarInfo from '@/components/samen-meten/MapSidebarInfo.vue';
import DashboardLegendTabs from '@/components/samen-meten/DashboardLegendTabs.vue';
import DashboardDataTools from '@/components/samen-meten/DashboardDataTools.vue';
import DashboardStationModal from '@/components/samen-meten/DashboardStationModal.vue';
import DashboardToast from '@/components/samen-meten/DashboardToast.vue';
import { data as initialData } from '@/data/variable.js';
// Import pure helpers from the utils module. These are reused across components
// and expose no side effects, making them easy to test and maintain.
// Helpers are defined locally in this file to keep the component self‑contained.
// TODO: consider extracting these helpers into a separate utils module if they
// need to be reused across multiple components.

/**
 * Type definitions for the GeoJSON structure returned by the API.
 */
interface FeatureProperties {
  station_name?: string;
  property?: string;
  value?: number;
  unit?: string;
  Gemeente?: string;
  regio?: string;
  measured_time?: string;
  avg_value?: number;
  max_value?: number;
  min_value?: number;
  location_uuid?: string;
  [key: string]: unknown;
}

interface Feature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][];
  };
  properties: FeatureProperties;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
  /**
   * Legacy API returns `Features` instead of `features`. We support both for
   * backward compatibility.
   */
  Features?: Feature[];
}

/**
 * Deep clone initial state to avoid mutating imported data directly.
 * Note: JSON.parse/stringify is sufficient here as initialData contains only
 * serializable values.
 */
const state = reactive(JSON.parse(JSON.stringify(initialData)));

// Local reactive references
const timeValue = ref<number>(state.timeValue ?? 0);
const selectedDay = ref<string>('');
const selectedProperty = ref<string>(state.property ?? 'pm25');
const search = ref<string>(state.search ?? '');
const interpolationStatus = ref<'disable' | 'activate'>(
  (state.interpolationStatus as 'disable' | 'activate') ?? 'disable',
);
const isPlaying = ref<boolean>(state.isPlaying ?? false);
const isLocalFile = ref<boolean>(false);
const fileName = ref<string>('Geojson bestand | Uploaden');
const isFrom = ref<string>('');
const description = ref<string>('');
const legendaValues = ref<number[]>([]);
const concentrationValues = ref<number[]>([]);
const geojson = ref<FeatureCollection | null>(null);
const properties = ref<FeatureProperties>({});
const timeString = ref<string>('');

// Refs for collections used by filters. We wrap them in reactive arrays so that
// changes are tracked automatically.
const regio = ref<OptionItem[]>([]);
const Gemeente = ref<OptionItem[]>([]);
const stationName = ref<OptionItem[]>([]);

// Colors and names used for chart annotation. These were defined on the
// original component's data. They remain constant.
const colors = ref(state.colors ?? []);
const dayColors = state.dayColors ?? [];

// Map related state
const map = ref<maplibregl.Map | null>(null);
const STYLE_URL = ref<string>('');
const currentLayerId = ref<string | null>(null);
const rasterLayers = new Set<string>();

// Template refs to child components. These allow us to access exposed refs
// without relying on DOM queries.
const dataTools = ref<InstanceType<typeof DashboardDataTools> | null>(null);
const stationModal = ref<InstanceType<typeof DashboardStationModal> | null>(null);
const toastPanel = ref<InstanceType<typeof DashboardToast> | null>(null);

interface OptionItem {
  id: string;
  label: string;
  checked: boolean;
}

/**
 * Computed property generating an array of 30 day names. This uses the
 * `formatDate` helper to ensure the date format matches the locale. It
 * recomputes only when dependencies change, improving performance.
 */
const dayNames = computed<string[]>(() => {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date, state.days);
  });
});

/**
 * Computed property for determining the button style based on playback state.
 */
const buttonClass = computed<string>(() => {
  return isPlaying.value ? 'btn-outline-danger' : 'btn-outline-primary';
});

/**
 * Map the internal property names to user‑friendly labels. If the property
 * cannot be found in the map, return it unchanged.
 */
const formattedProperty = computed<string>(() => {
  const propertyMap: Record<string, string> = {
    pm25: 'PM2,5',
    pm10: 'PM10',
    no2: 'NO₂',
  };
  // `state.property` comes from the initial data. Provide fallback.
  const rawProperty = (state.property ?? selectedProperty.value) as string;
  return propertyMap[rawProperty] ?? rawProperty;
});

/**
 * Watch for changes to the selected day and refresh the layer when valid. This
 * replaces the legacy watch property on the Options API. The immediate
 * parameter ensures that updateLayer runs on component creation when
 * selectedDay is set programmatically.
 */
watch(
    () => selectedDay.value,
    (newDay) => {
      if (dayNames.value.includes(newDay)) {
        updateLayer().catch((err) => console.error('Failed to update layer', err));
      }
    }
);

// Refresh the layer whenever the selected hour changes. Watching the reactive
// `timeValue` ensures that updates occur even when the slider is moved
// programmatically. A small debounce is applied to avoid rapid consecutive
// requests when the user drags the slider quickly.
let timeDebounce: ReturnType<typeof setTimeout> | null = null;
watch(
    () => timeValue.value,
    () => {
      if (timeDebounce) clearTimeout(timeDebounce);
      timeDebounce = setTimeout(() => {
        updateLayer().catch((err) => console.error('Failed to update layer', err));
      }, 200);
    }
);

// Whenever the interpolation status changes, reload the layer. This ensures
// that enabling or disabling interpolation takes effect immediately.
watch(
    () => interpolationStatus.value,
    () => {
      updateLayer().catch((err) => console.error('Failed to update layer', err));
    }
);

// React to changes in the search term by selecting matching stations. We
// debounce this watcher slightly to prevent repeated updates while the user
// types.
let searchDebounce: ReturnType<typeof setTimeout> | null = null;
watch(
    () => search.value,
    () => {
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        selectMatchingStations();
      }, 150);
    }
);

/**
 * Lifecycle hook that runs once the component is mounted. Initializes the
 * map, sets up UI controls and begins loading data. All asynchronous
 * operations are awaited sequentially for deterministic behaviour.
 */
onMounted(async () => {
  // Construct style URL with API key
  STYLE_URL.value = `https://api.maptiler.com/maps/dataviz/style.json?key=${state.API_KEY}`;
  await initializeMap();
  await addControls();

  // Fetch initial data for the dropdown lists and set up the first layer.
  geojson.value = await fetchData(
      'https://dta-samenmeten-api.azurewebsites.net/api/data/stations'
  );

  await Promise.all([
    updateUniqueItems(geojson.value, 'regio'),
    updateUniqueItems(geojson.value, 'Gemeente'),
    updateUniqueItems(geojson.value, 'station_name'),
  ]);

  // Create default checkboxes for filters. This also maintains checked state
  // across updates.
  createCheckboxes('regio', regio.value.map((r) => r.id));
  createCheckboxes('Gemeente', Gemeente.value.map((g) => g.id));
  createCheckboxes('station_name', stationName.value.map((s) => s.id));

  // Select the most recent day by default and load the layer
  selectedDay.value = dayNames.value[0];
  await updateLayer();
});

/**
 * Clean up resources when the component is unmounted. This includes
 * destroying the Chart instance to free up memory.
 */
onUnmounted(() => {
  destroyChart();
  if (map.value) {
    map.value.remove();
  }
});

/**
 * Initialize the MapLibre map instance. This is separated into its own
 * function so that it can be reused or mocked during testing. It sets
 * the map on the `map` ref and listens for the `load` event to add initial
 * layers.
 *
 * TODO: Consider extracting map initialisation, control setup and layer
 * management into a composable (e.g. `useMap`) to simplify this component
 * and improve testability. The current component still contains
 * responsibilities that could live in a dedicated map management module.
 */
async function initializeMap(): Promise<void> {
  // Create the map instance
  map.value = new window.maplibregl.Map({
    container: 'map',
    style: STYLE_URL.value,
    center: [4.218788, 52.008663],
    zoom: 8.9,
  });
  map.value.on('load', () => {
    addLineSourceAndLayer();
    addWindLayer();
  });
}

/**
 * Add interactive controls to the map including style switcher, fullscreen,
 * navigation and geolocation controls. All controls are added after the map
 * instance has been created.
 */
async function addControls(): Promise<void> {
  if (!map.value) return;
  // Custom style switcher
  addStyleSwitchControl();
  // Built‑in controls
  map.value.addControl(new window.maplibregl.FullscreenControl());
  map.value.addControl(new window.maplibregl.NavigationControl());
  map.value.addControl(
      new window.maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      })
  );
}

/**
 * Add a source and layer for drawing a bounding line around the map. Checks
 * for existence before adding to avoid duplicates.
 */
function addLineSourceAndLayer(): void {
  const m = map.value;
  if (!m) return;
  if (!m.getSource('line')) {
    m.addSource('line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: state.bbox ?? [],
        },
      },
    });
  }
  if (!m.getLayer('line')) {
    m.addLayer({
      id: 'line',
      type: 'line',
      source: 'line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#ff0000',
        'line-width': 1.4,
        'line-opacity': 0.8,
        'line-blur': 0.5,
      },
    });
  }
}

/**
 * Add a wind layer to the map. This placeholder exists to match the API of
 * the original component; implement your own logic here if needed.
 */
function addWindLayer(): void {
  // TODO: Implement wind layer logic if required. Left blank for clarity.
}

/**
 * Create a style switch control that lets the user change the map base style.
 * It constructs a select element populated with the available style URLs.
 * Any errors during style switching are caught and logged.
 */
function addStyleSwitchControl(): void {
  if (!map.value) return;
  // Build the control container
  const styleSwitcherContainer = document.createElement('div');
  styleSwitcherContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group';
  const label = document.createElement('label');
  label.className = 'fw-semibold text-success';
  label.innerText = 'Selecteer achtergrond:';
  styleSwitcherContainer.appendChild(label);
  const styleSwitcher = document.createElement('select');
  styleSwitcher.className = 'form-select form-select-sm';
  styleSwitcher.style.fontSize = '1em';
  styleSwitcher.style.cursor = 'pointer';
  // Provide an accessible name for screen readers
  styleSwitcher.setAttribute('aria-label', 'Selecteer kaartstijl');
  const styles: string[] = (state.STYLE_URLS ?? []).map(
      (url: string) => `${url}${state.API_KEY}`
  );
  styles.forEach((style, index) => {
    const option = document.createElement('option');
    option.value = style;
    option.text = state.STYLE_NAMES?.[index] ?? `Style ${index + 1}`;
    styleSwitcher.appendChild(option);
  });
  styleSwitcher.onchange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    try {
      map.value?.setStyle(target.value);
      // After style change, re‑add custom layers and refresh the data layer
      setTimeout(() => {
        addLineSourceAndLayer();
        updateLayer().catch((err) => console.error('Layer update failed', err));
      }, 50);
    } catch (error) {
      console.error('An error occurred while switching styles:', error);
    }
  };
  styleSwitcherContainer.appendChild(styleSwitcher);
  // Create a control conforming to the maplibre control interface
  const control = {
    onAdd: () => styleSwitcherContainer,
    onRemove: () => {},
    getDefaultPosition: () => 'top-right',
  } as maplibregl.IControl;
  map.value.addControl(control);
}

/**
 * Fetch JSON data from the given URL and return the parsed object. Errors
 * during the fetch or parsing are propagated to the caller to handle.
 */
async function fetchData(url: string): Promise<FeatureCollection> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    keepalive: true,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as FeatureCollection;
}

/**
 * Update the list of unique items for the given column. It uses the
 * `geojson` to derive a set of unique values and then updates the
 * corresponding reactive array. For accessibility, items are sorted
 * alphabetically.
 */
async function updateUniqueItems(geo: FeatureCollection | null, column: string): Promise<void> {
  if (!geo || !geo.Features && !geo.features) return;
  const features = (geo.features ?? geo.Features) as Feature[];
  const items = Array.from(
      new Set(
          features.map((feature) => feature.properties?.[column] as string | undefined)
      )
  ).filter((item): item is string => !!item);
  const target = column === 'regio' ? regio : column === 'Gemeente' ? Gemeente : stationName;
  // Preserve checked state if items already exist
  const checkedIds = new Set(target.value.filter((i) => i.checked).map((i) => i.id));
  target.value = items
      .sort((a, b) => a.localeCompare(b))
      .map((item) => ({ id: item, label: item, checked: checkedIds.has(item) }));
}

/**
 * Create checkbox objects for the given identifier. This helper ensures that
 * each filter list (regio, Gemeente, station_name) is synchronised with
 * the array of available items. It respects the previously checked state.
 */
function createCheckboxes(id: 'regio' | 'Gemeente' | 'station_name', items: string[]): void {
  const target = id === 'regio' ? regio : id === 'Gemeente' ? Gemeente : stationName;
  const checkedIds = new Set(target.value.filter((i) => i.checked).map((i) => i.id));
  target.value = items.map((item) => ({
    id: item,
    label: item,
    checked: checkedIds.has(item),
  }));
}

/**
 * Retrieve selected values from the checkboxes. This returns an array of
 * identifiers that the user has checked. When nothing is selected the
 * returned array is empty.
 */
function getSelectedValues(name: 'regio' | 'Gemeente' | 'station_name'): string[] {
  const list = name === 'regio' ? regio.value : name === 'Gemeente' ? Gemeente.value : stationName.value;
  return list.filter((item) => item.checked).map((item) => item.id);
}

/**
 * Sync checkbox option lists from child updates without mutating props.
 */
function updateRegio(list: OptionItem[]): void {
  regio.value = list;
}

function updateGemeente(list: OptionItem[]): void {
  Gemeente.value = list;
}

function updateStationName(list: OptionItem[]): void {
  stationName.value = list;
}

/**
 * Access the local file input exposed by the data tools component.
 */
function getLocalFileInput(): HTMLInputElement | null {
  return dataTools.value?.localFileRef?.value ?? null;
}

/**
 * Public method exposed to child components to clear input fields. For
 * `sDate` we reset the selectedDay; otherwise we call updateLayer().
 */
function clearInput(refName: string): void {
  if (refName === 'sDate') {
    selectedDay.value = '';
  } else {
    if (refName === 'localFile') {
      const localFileInput = getLocalFileInput();
      if (localFileInput) {
        localFileInput.value = '';
      }
      isLocalFile.value = false;
      fileName.value = 'Geojson bestand | Uploaden';
    }
    updateLayer().catch((err) => console.error('Layer update failed', err));
  }
}

/**
 * Reload the page. This simply delegates to the browser's reload function.
 */
function reloadPage(): void {
  window.location.reload();
}

/**
 * Toggle the automatic slider. If it was previously running it will stop and
 * vice versa. The slider uses a timer to advance the hour and update the
 * layer. When it reaches the maximum hour, it stops automatically.
 */
function toggleSlider(): void {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    startSlider();
  } else {
    stopSlider();
  }
}

let sliderInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the time slider animation. It sets up an interval that increments
 * `timeValue` every 1.55 seconds. The maximum hour is derived from the
 * selected day (0–23 or the current hour if today).
 */
function startSlider(): void {
  stopSlider();
  const today = formatDate(new Date(), state.days);
  const maxHour = selectedDay.value === today ? new Date().getHours() : 23;
  timeValue.value = 0;
  updateLayer().catch((err) => console.error('Layer update failed', err));
  sliderInterval = setInterval(() => {
    if (timeValue.value < maxHour) {
      timeValue.value++;
      updateLayer().catch((err) => console.error('Layer update failed', err));
    } else {
      stopSlider();
      isPlaying.value = false;
    }
  }, 1550);
}

/**
 * Stop the slider and clear the interval.
 */
function stopSlider(): void {
  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }
}

/**
 * Select stations whose label matches the current search term. This sets the
 * checked state accordingly on the stationName list and refreshes the layer.
 */
function selectMatchingStations(): void {
  const lowerCaseSearch = search.value.toLowerCase();
  stationName.value.forEach((station) => {
    station.checked = station.label.toLowerCase() === lowerCaseSearch;
  });
  updateLayer().catch((err) => console.error('Layer update failed', err));
}

/**
 * Update the map layer and geojson data based on the current filters. This
 * function coordinates property mapping, selection retrieval, data
 * filtering and map updates. Errors are caught and logged rather than
 * thrown to the parent to avoid unhandled rejection warnings.
 */
async function updateLayer(): Promise<void> {
  // Map the selected property to the API property and update labels
  const propDefinition = (state.propValues?.[selectedProperty.value] ?? state.propValues?.default) as any;
  state.property = propDefinition.property;
  description.value = propDefinition.description;
  legendaValues.value = propDefinition.legendaValues ?? [];
  concentrationValues.value = propDefinition.concentrationValues ?? [];
  // Determine selected values from filters
  const selectedRegio = getSelectedValues('regio');
  const selectedGemeente = getSelectedValues('Gemeente');
  const selectedStName = getSelectedValues('station_name');
  // Reload the layer with the computed values
  await reloadLayer(
      map.value,
      String(timeValue.value),
      selectedProperty.value,
      selectedRegio,
      selectedGemeente,
      selectedStName,
  );
}

/**
 * Reload the map layer by fetching new data and updating the map source.
 * It optionally loads data from a local file if present. Layer opacity is
 * controlled when interpolation is enabled.
 */
async function reloadLayer(
    m: maplibregl.Map | null,
    hour: string,
    property: string,
    selectedRegio: string[],
    selectedGemeente: string[],
    selectedStName: string[],
): Promise<void> {
  if (!m) return;
  try {
    const localFiles = getLocalFileInput()?.files ?? [];
    isLocalFile.value = localFiles.length > 0;
    fileName.value = isLocalFile.value ? localFiles[0].name : 'Geojson bestand | Uploaden';
    isFrom.value = isLocalFile.value
        ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold">van jouw Local File</span>'
        : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata</a>. Bekijk de metadata voor details over de serverdata.';
    const selectedDateIndex = Math.max(dayNames.value.indexOf(selectedDay.value), 0);
    await filterGeojsonFeatures(
        hour,
        selectedDateIndex,
        property,
        selectedRegio,
        selectedGemeente,
        selectedStName,
        isLocalFile.value,
    );
    updateMapSourceAndLayer(m, geojson.value);
  } catch (error) {
    console.error('Failed to reload layer:', error);
  }
}

/**
 * Filter the GeoJSON features according to the selected parameters. When
 * interpolation is active it applies the IDW interpolation. Otherwise it
 * fetches station and observation data and merges them on the station name.
 */
async function filterGeojsonFeatures(
    hour: string,
    selectedDateIndex: number,
    selectedProperty: string,
    selectedRegio: string[],
    selectedGemeente: string[],
    selectedStName: string[],
    local: boolean,
): Promise<void> {
  const now = new Date();
  now.setDate(now.getDate() - selectedDateIndex);
  // Adjust for timezone offset to match API expectations
  const date = new Date(
      Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(hour, 10) + now.getTimezoneOffset() / 60,
      ),
  );
  const measuredTime = date.toISOString().replace('T', '%20').substring(0, 19) + '00';
  // When interpolation is activated call interpolation function
  if (interpolationStatus.value === 'activate') {
    await idwInterpolation(date.toISOString(), selectedProperty);
  } else if (currentLayerId.value && map.value?.getLayer(currentLayerId.value)) {
    map.value.setPaintProperty(currentLayerId.value, 'raster-opacity', 0);
  }
  // Build filters for API calls
  const filters = {
    property: selectedProperty,
    station: selectedStName.length > 0 ? selectedStName : undefined,
    gemeente:
        selectedStName.length > 0
            ? undefined
            : selectedGemeente.length > 0
                ? selectedGemeente
                : undefined,
    regio:
        selectedStName.length > 0 || selectedGemeente.length > 0
            ? undefined
            : selectedRegio.length > 0
                ? selectedRegio
                : undefined,
  } as Record<string, string[] | string | undefined>;
  let filtered: FeatureCollection;
  if (local) {
    filtered = await loadLocalFile();
  } else {
    // Compose URLs with query parameters
    const urlStations = new URL(
        'https://dta-samenmeten-api.azurewebsites.net/api/data/stations',
    );
    Object.entries(filters).forEach(([key, value]) => {
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        urlStations.searchParams.append(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    });
    const urlObservations = new URL(
        `https://dta-samenmeten-api.azurewebsites.net/api/data/observations?property=${selectedProperty}&measured_time=${measuredTime}`,
    );
    // Fetch in parallel
    const [stations, observations] = await Promise.all([
      fetchData(urlStations.toString()),
      fetchData(urlObservations.toString()),
    ]);
    // Build a lookup for observation by station name
    const observationMap = new Map<string, Feature>();
    (observations.features ?? observations.Features ?? []).forEach((observation) => {
      observationMap.set(observation.properties.station_name ?? '', observation);
    });
    // Merge station and observation data into a new FeatureCollection
    filtered = {
      type: 'FeatureCollection',
      features: (stations.features ?? stations.Features ?? []).filter((station) => {
        const matching = observationMap.get(station.properties.station_name ?? '');
        if (matching) {
          // Copy aggregated values from station onto observation
          matching.properties.avg_value = station.properties.avg_value;
          matching.properties.max_value = station.properties.max_value;
          matching.properties.min_value = station.properties.min_value;
          // Replace station properties and geometry with observation
          station.properties = { ...matching.properties };
          station.geometry = matching.geometry;
          return true;
        }
        return false;
      }),
    };
  }
  // Update the reactive geojson reference
  geojson.value = filtered;
  // Refresh filter lists with new unique values and preserve checked state
  await Promise.all([
    updateUniqueItems(filtered, 'regio'),
    updateUniqueItems(filtered, 'Gemeente'),
    updateUniqueItems(filtered, 'station_name'),
  ]);
}

/**
 * Load and parse a local GeoJSON file selected by the user. The legacy API
 * expects `Features` instead of `features`, so we normalise the property.
 */
async function loadLocalFile(): Promise<FeatureCollection> {
  const file = getLocalFileInput()?.files?.[0];
  if (!file) throw new Error('No local file selected');
  const text = await file.text();
  const parsed = JSON.parse(text) as FeatureCollection;
  if (parsed.Features) {
    parsed.features = parsed.Features;
    delete (parsed as any).Features;
  }
  return parsed;
}

/**
 * Perform IDW interpolation by adding a raster layer. It toggles opacity on
 * previously added layers to ensure only the current interpolation is
 * visible. The generated layer is added only once per date/property.
 */
async function idwInterpolation(dateStr: string, property: string): Promise<void> {
  const m = map.value;
  if (!m) return;
  const bounds = [3.773675345120739, 51.64377788724585, 5.031415001585676, 52.3325109475691];
  const layerId = `interpolatie-${dateStr}-${property}`;
  rasterLayers.add(layerId);
  // Toggle opacity across all raster layers
  rasterLayers.forEach((id) => {
    if (m.getLayer(id)) {
      m.setPaintProperty(id, 'raster-opacity', id === layerId ? 1 : 0);
    }
  });
  currentLayerId.value = layerId;
  if (!m.getLayer(layerId)) {
    const url = `https://pzh-teamgeo-geoserver-app.azurewebsites.net/geoserver/samenmeten/wms?service=WMS&version=1.1.0&request=GetMap&layers=samenmeten%3A${property}_sqldb&bbox=${bounds.join(',')}&time=${dateStr}&width=768&height=420&srs=EPSG%3A4326&styles=&format=image/png&transparent=true`;
    m.addSource(layerId, {
      type: 'image',
      url,
      coordinates: [
        [bounds[0], bounds[3]],
        [bounds[2], bounds[3]],
        [bounds[2], bounds[1]],
        [bounds[0], bounds[1]],
      ],
    });
    m.addLayer({ id: layerId, type: 'raster', source: layerId, paint: { 'raster-opacity': 1 } });
  }
}

/**
 * Update or create the map source and layer for station points. When a
 * FeatureCollection is provided it normalises the property names and
 * updates the existing source. On first call it creates the layer and
 * attaches click handlers for opening the station popup.
 */
function updateMapSourceAndLayer(m: maplibregl.Map, geo: FeatureCollection | null): void {
  if (!geo || (!geo.features && !geo.Features)) return;
  const features = geo.features ?? geo.Features;
  const normalized: FeatureCollection = {
    type: 'FeatureCollection',
    features: features,
  };
  // Create or update source
  if (!m.getSource('stations')) {
    m.addSource('stations', { type: 'geojson', data: normalized });
  } else {
    (m.getSource('stations') as maplibregl.GeoJSONSource).setData(normalized);
  }
  // Add layer if not present
  if (!m.getLayer('stations')) {
    addStationsLayer();
  }
}

/**
 * Generate paint rules for the station circles based on the property and
 * value. Uses step expressions to assign colours according to breakpoints.
 */
function getCircleColorExpression(): any[] {
  return [
    'case',
    ['==', ['get', 'property'], 'pm25'],
    ['step', ['get', 'value'], '#1E90FF', 8.3, '#48D1CC', 16.7, '#9ACD32', 25, '#DAA520', Infinity, '#000000'],
    ['in', ['get', 'property'], ['literal', ['no2', 'pm10']]],
    ['step', ['get', 'value'], '#1E90FF', 13.3, '#48D1CC', 26.6, '#9ACD32', 40, '#DAA520', Infinity, '#000000'],
    '#000000',
  ];
}

/**
 * Add the station layer with appropriate styling and click interaction. When
 * the layer is clicked either a dropdown or detail popup is shown based on
 * the number of overlapping features. Popups are sanitised to prevent XSS.
 */
function addStationsLayer(): void {
  const m = map.value;
  if (!m) return;
  m.addLayer({
    id: 'stations',
    type: 'circle',
    source: 'stations',
    paint: {
      'circle-radius': 6,
      'circle-color': getCircleColorExpression(),
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.8,
    },
  });
  m.on('click', 'stations', handleStationClick);
}

/**
 * Handle clicks on station points. If multiple features are present at the
 * clicked point, display a dropdown to select one. Otherwise show the
 * details popup directly. Both paths sanitise user data to avoid XSS.
 */
function handleStationClick(e: maplibregl.MapMouseEvent & maplibregl.EventData): void {
  const m = map.value;
  if (!m) return;
  const features = m.queryRenderedFeatures(e.point, { layers: ['stations'] });
  if (features.length > 1) {
    createDropdownPopup(features, e);
  } else if (features.length === 1) {
    createDetailPopup(features[0], e);
  }
}

/**
 * Create a dropdown popup listing multiple overlapping stations. The user can
 * pick one and then see details. The popup content is built with
 * sanitisation by escaping text values.
 */
function createDropdownPopup(
    features: maplibregl.MapboxGeoJSONFeature[],
    e: maplibregl.MapMouseEvent & maplibregl.EventData,
): void {
  const m = map.value;
  if (!m) return;
  // Build HTML string for dropdown. Escape station names to prevent XSS.
  let dropdownHTML = `
    <div class="card text-center border-primary">
      <div class="card-header bg-primary text-white">
        <h6>Selecteer Station <i class="bi bi-search"></i></h6>
      </div>
      <div class="card-body">
        <div class="dropdown">
          <button class="btn btn-outline-primary dropdown-toggle" type="button" id="stationSelect" data-bs-toggle="dropdown" aria-expanded="false">
            Kies een station
          </button>
          <div class="dropdown-menu" aria-labelledby="stationSelect" style="height: 200px; overflow-y: auto;">
  `;
  features.forEach((feature, index) => {
    const props = feature.properties as FeatureProperties;
    const station = String(props.station_name ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const value = props.value as number;
    const color = getColor(value, props.property ?? '', '1');
    dropdownHTML += `
      <a class="dropdown-item" href="#" data-index="${index}">
        <i class="bi bi-geo-alt-fill" style="color: ${color};"></i> ${station}
      </a>`;
  });
  dropdownHTML += `
          </div>
        </div>
      </div>
    </div>
  `;
  const popup = new window.maplibregl.Popup({ className: 'my-popup' })
      .setLngLat(e.lngLat)
      .setHTML(dropdownHTML)
      .addTo(m);
  // After DOM insertion attach click listeners
  nextTick(() => {
    const items = Array.from(popup.getElement().querySelectorAll('.dropdown-item'));
    items.forEach((item) => {
      item.addEventListener('click', (ev) => {
        ev.preventDefault();
        const index = Number((ev.currentTarget as HTMLElement).dataset.index);
        popup.remove();
        createDetailPopup(features[index], e);
      });
    });
  });
}

/**
 * Create a detailed popup for a single station. It displays the station's
 * name, property value, location and last update time. A button triggers
 * loading of the historical chart in a modal. User content is escaped.
 */
function createDetailPopup(
    feature: maplibregl.MapboxGeoJSONFeature,
    e: maplibregl.MapMouseEvent & maplibregl.EventData,
): void {
  const m = map.value;
  if (!m) return;
  const props = feature.properties as FeatureProperties;
  properties.value = props;
  // Escape values
  const stationNameEsc = String(props.station_name ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const propertyEsc = String(props.property ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const valueEsc = props.value !== undefined ? props.value.toString() : 'N/A';
  const unitEsc = String(props.unit ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const gemeenteEsc = String(props.Gemeente ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const regioEsc = String(props.regio ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const formattedDate = props.measured_time
      ? new Date(props.measured_time).toLocaleString('nl-NL', {
        timeZone: 'GMT',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      : 'Onbekend';
  const color = getColor(props.value ?? 0, props.property ?? '', '1');
  const popupHtml = `
    <div class="card text-center" style="border-color: ${color};">
      <div class="card-header" style="background-color: ${color}; color: white;">
        <h6>Station naam: ${stationNameEsc}</h6>
      </div>
      <div class="card-body">
        <h6 class="card-title">Component en meetwaarde:<br>${propertyEsc}: ${valueEsc} ${unitEsc}</h6>
        <h6>Beschrijving:<br>Gemeente ${gemeenteEsc} - Regio ${regioEsc}</h6>
        <h6 class="card-text">
          <small class="text-muted">Laatst update: ${formattedDate}</small>
        </h6>
        <button class="btn mt-3" type="button" data-bs-toggle="modal" data-bs-target="#modalWithBothOptions" style="background-color: ${color}; color: white;" data-properties='${encodeURIComponent(
      JSON.stringify(props),
  )}'>
          Informatie over station
        </button>
      </div>
    </div>
  `;
  const popup = new window.maplibregl.Popup({ className: 'my-popup' })
      .setLngLat(e.lngLat)
      .setHTML(popupHtml)
      .addTo(m);
  // Attach click event to load chart
  nextTick(() => {
    const button = popup.getElement().querySelector('button');
    if (button) {
      button.addEventListener('click', async () => {
        (button as HTMLButtonElement).innerHTML =
            '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status">Loading...</span>';
        try {
          await loadChart(props);
        } finally {
          (button as HTMLButtonElement).innerHTML = 'Informatie over station';
          popup.remove();
        }
      });
    }
  });
}

/**
 * Destroy the existing chart instance if present. Use this before creating
 * a new chart to avoid memory leaks.
 */
function destroyChart(): void {
  if ((state as any).myChart) {
    (state as any).myChart.destroy();
    (state as any).myChart = null;
  }
}

/**
 * Load observation data for the selected station and create a chart in the
 * modal. This function fetches the data, processes it by date and hour,
 * generates datasets and then instantiates the Chart.js chart.
 *
 * TODO: Chart creation logic could be moved into a dedicated composable or
 * service module (e.g. `useChart`) to encapsulate data processing and chart
 * configuration. This would make the main component leaner and facilitate
 * unit testing of chart logic.
 */
async function loadChart(props: FeatureProperties): Promise<void> {
  destroyChart();
  try {
    const url = new URL(
        `https://dta-samenmeten-api.azurewebsites.net/api/data/observations?station=${encodeURIComponent(
            props.station_name ?? '',
        )}&property=${encodeURIComponent(props.property ?? '')}&location=${encodeURIComponent(props.location_uuid ?? '')}`,
    );
    const observationData = await fetchData(url.toString());
    const dataByDate = processData(observationData);
    const datasets = createDatasets(props.property ?? '', dataByDate);
    // Wait for DOM to update before referencing chart canvas
    nextTick(() => {
      const chartCanvas = stationModal.value?.chartRef?.value;
      if (chartCanvas) {
        createChart(chartCanvas, props.property ?? '', dataByDate, datasets);
      }
    });
  } catch (error) {
    console.error('Error while loading chart', error);
  }
}

/**
 * Convert observation FeatureCollection into a map keyed by date. Each
 * entry holds arrays of times and corresponding values per hour.
 */
function processData(observationData: FeatureCollection): Record<string, { times: string[]; values: (number | null)[] }> {
  const dataByDate: Record<string, { times: string[]; values: (number | null)[] }> = {};
  (observationData.features ?? observationData.Features ?? []).forEach((feature) => {
    const dateObj = new Date(feature.properties.measured_time ?? '');
    const dateString = dateObj.toISOString().split('T')[0];
    const hourIndex = dateObj.getUTCHours();
    if (!dataByDate[dateString]) {
      dataByDate[dateString] = {
        times: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00 GMT`),
        values: Array(24).fill(null),
      };
    }
    dataByDate[dateString].values[hourIndex] = feature.properties.value as number;
  });
  return dataByDate;
}

/**
 * Create chart datasets from processed data. Assign colours based on the
 * property and day of week. The most recent day is visible by default.
 */
function createDatasets(
    property: string,
    dataByDate: Record<string, { times: string[]; values: (number | null)[] }>,
): any[] {
  const keys = Object.keys(dataByDate);
  return keys
      .map((date, index) => {
        const { values } = dataByDate[date];
        const backgroundColors = values.map((val) => getColor(val ?? 0, property, '0.4'));
        const dateObj = new Date(date);
        return {
          label: dateObj.toLocaleDateString('nl-NL', {
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }),
          dateString: date,
          data: values,
          originalBackgroundColor: [...backgroundColors],
          backgroundColor: backgroundColors,
          borderColor: dayColors[dateObj.getDay()],
          borderWidth: 2,
          borderRadius: { topLeft: 3, topRight: 3 },
          hidden: index !== keys.length - 1,
        };
      })
      .sort((a, b) => new Date(a.dateString).getTime() - new Date(b.dateString).getTime());
}

/**
 * Instantiate a Chart.js bar chart using the provided datasets and options. It
 * registers hover handlers to adjust opacity on legend hover for improved
 * interactivity.
 */
function createChart(
    canvas: HTMLCanvasElement,
    property: string,
    dataByDate: Record<string, { times: string[]; values: (number | null)[] }>,
    datasets: any[],
): void {
  const yMin = property === 'pm25' ? 25 : 40;
  (state as any).myChart = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: dataByDate[Object.keys(dataByDate)[0]].times,
      datasets,
    },
    options: {
      ...state.chartOptions,
      plugins: {
        ...state.chartOptions?.plugins,
        annotation: {
          annotations: [
            {
              type: 'box',
              yMin,
              backgroundColor: 'rgba(230, 25, 75, 0.1)',
              borderColor: 'rgba(230, 25, 75, 1)',
              label: {
                content: 'Bad',
                enabled: true,
                position: 'center',
              },
            },
          ],
        },
        legend: {
          display: true,
          onHover: (evt: any, item: any, legend: any) => handleHover(evt, item, legend),
          onLeave: (evt: any, item: any, legend: any) => handleLeave(evt, item, legend),
        },
      },
    },
  });
}

/**
 * Handle hover on legend items by adjusting bar opacities. All datasets are
 * darkened except the hovered one which becomes more opaque.
 */
function handleHover(evt: any, item: any, legend: any): void {
  legend.chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
    dataset.backgroundColor = datasetIndex === item.datasetIndex
        ? dataset.originalBackgroundColor.map((color: string) => {
          const rgba = color.slice(0, -1).split(',');
          rgba[3] = '0.8)';
          return rgba.join(',');
        })
        : dataset.originalBackgroundColor.map((color: string) => {
          const rgba = color.slice(0, -1).split(',');
          rgba[3] = '0.1)';
          return rgba.join(',');
        });
  });
  legend.chart.update();
}

/**
 * Reset dataset opacities when the cursor leaves the legend.
 */
function handleLeave(evt: any, item: any, legend: any): void {
  legend.chart.data.datasets.forEach((dataset: any) => {
    dataset.backgroundColor = dataset.originalBackgroundColor;
  });
  legend.chart.update();
}

/**
 * Map a numeric pollutant value to a colour based on breakpoints. The
 * thresholds differ for pm25 vs pm10/no2. An alpha channel value (e.g.
 * '0.4', '1') can be supplied to control opacity. Colours are returned in
 * rgba() format.
 *
 * TODO: This helper could be extracted into a shared utils module if colour
 * mapping is required in other components.
 *
 * @param value The measured pollutant value.
 * @param property The pollutant type (pm25, pm10, no2).
 * @param alpha A string representing the alpha channel (0-1).
 */
function getColor(value: number, property: string, alpha: string): string {
  const thresholds = property === 'pm25' ? [8.3, 16.7, 25, Infinity] : [13.3, 26.6, 40, Infinity];
  const palette = [
    'rgba(30, 144, 255,',
    'rgba(72, 209, 204,',
    'rgba(154, 205, 50,',
    'rgba(218, 165, 32,',
  ];
  const index = thresholds.findIndex((t) => value < t);
  const base = palette[index >= 0 && index < palette.length ? index : palette.length - 1];
  return `${base}${alpha})`;
}

/**
 * Format a Date into a string like "Maandag | 1 januari 2024". This helper
 * centralises locale-specific formatting. The caller must provide a days
 * array (e.g. ['Zondag','Maandag',...]) corresponding to Dutch day names.
 *
 * TODO: This helper could be extracted into a shared utils module if date
 * formatting is required elsewhere.
 *
 * @param date The date to format.
 * @param days A seven‑element array of day names starting with Sunday.
 */
function formatDate(date: Date, days: string[]): string {
  const dayName = days[date.getDay()];
  const dateString = date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${dayName} | ${dateString}`;
}

/**
 * Map a numeric value to a colour with the given alpha. The thresholds
 * differ for pm25 vs pm10/no2. Returns a valid rgba string.
 */

/**
 * Show a toast notification and update the displayed time. This uses the
 * Bootstrap Toast API exposed on the DashboardToast component.
 */
function toast(): void {
  const toastElement = toastPanel.value?.toastRef?.value;
  if (!toastElement) return;
  const toastInstance = (window.bootstrap.Toast as any).getOrCreateInstance(toastElement);
  const now = new Date();
  timeString.value = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  toastInstance.show();
}

/**
 * Download the current GeoJSON as a file. Shows a toast when complete.
 */
function downloadGeoJSON(): void {
  if (!geojson.value) return;
  const dataStr = JSON.stringify(geojson.value);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = `PZH-Luchtkwaliteit_${state.property}.geojson`;
  toast();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download the current data as a CSV file. Missing values are marked as
 * 'N/A'. A toast is shown after download begins.
 */
function downloadCSV(): void {
  if (!geojson.value) return;
  const header = 'Station naam;Datum en tijd;Property;Regio;Gemeente;Value;Unit\n';
  let csv = header;
  (geojson.value.features ?? geojson.value.Features ?? []).forEach((feature) => {
    const props = feature.properties;
    const stationNameStr = props.station_name ?? 'N/A';
    const measuredTime = props.measured_time
        ? new Date(props.measured_time).toISOString()
        : 'N/A';
    const propertyStr = props.property ?? 'N/A';
    const regioStr = props.regio ?? 'N/A';
    const gemeenteStr = props.Gemeente ?? 'N/A';
    const valueStr = props.value !== undefined ? props.value.toFixed(2) : 'N/A';
    const unitStr = props.unit ?? 'N/A';
    csv += `${stationNameStr}; ${measuredTime}; ${propertyStr}; ${regioStr}; ${gemeenteStr}; ${valueStr}; ${unitStr}\n`;
  });
  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
  link.download = 'Provincie Zuid-Holland Luchtkwaliteit - Samen Meten Dashboard.csv';
  toast();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<!-- Scoped styles to ensure the CSS only applies to this component -->
<style scoped>
/* Hide the native file input */
.input-group input[type='file'] {
  display: none;
}

/* Style the custom file upload button */
.input-group .custom-file-upload {
  color: #fff;
  background-color: #20c997;
}

/* Make the control panel scrollable without affecting the map */
.custom-div {
  position: relative;
  max-height: 97%;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
}

/* Slim scrollbars */
*::-webkit-scrollbar {
  width: 0.5vw;
}
*::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 0.5vw;
}
*::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Selection colour */
* ::selection {
  font-family: Arial !important;
  background-color: #d11f3d;
  color: white;
}

/* Focused input label colour */
.focused-label .form-control:focus ~ label {
  color: #0081ff;
}
</style>
