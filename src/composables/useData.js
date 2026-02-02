import { computed, ref } from 'vue';

/**
 * Centralized data fetching, filtering, and list generation for dashboard data.
 *
 * TODO: Consider adding caching for station/observation API calls to reduce
 * duplicate requests when only UI filters change.
 */
export function useData(state) {
  const geojson = ref(null);
  const regio = ref([]);
  const gemeente = ref([]);
  const stationName = ref([]);
  const description = ref('');
  const legendaValues = ref([]);
  const concentrationValues = ref([]);
  const isFrom = ref('');
  const isLocalFile = ref(false);
  const fileName = ref('Geojson bestand | Uploaden');

  const dayNames = computed(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return formatDate(date, state.days);
    });
  });

  const timeOptions = computed(() => {
    return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  });

  /**
   * Apply selected property metadata to state and return the API property.
   *
   * @param {string} selectedProperty
   * @returns {string}
   */
  function applyPropertyDefinition(selectedProperty) {
    const propDefinition = state.propValues?.[selectedProperty]
      ?? state.propValues?.default
      ?? {};
    state.property = propDefinition.property;
    description.value = propDefinition.description;
    legendaValues.value = propDefinition.legendaValues ?? [];
    concentrationValues.value = propDefinition.concentrationValues ?? [];
    return state.property;
  }

  async function fetchData(url) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      keepalive: true,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return await response.json();
  }

  async function updateUniqueItems(geo, column) {
    if (!geo || (!geo.Features && !geo.features)) return;
    const features = geo.features ?? geo.Features;
    const items = Array.from(
      new Set(features.map((feature) => feature.properties?.[column])),
    ).filter((item) => !!item);
    const target = column === 'regio' ? regio : column === 'Gemeente' ? gemeente : stationName;
    const checkedIds = new Set(target.value.filter((i) => i.checked).map((i) => i.id));
    target.value = items
      .sort((a, b) => a.localeCompare(b))
      .map((item) => ({ id: item, label: item, checked: checkedIds.has(item) }));
  }

  function createCheckboxes(id, items) {
    const target = id === 'regio' ? regio : id === 'Gemeente' ? gemeente : stationName;
    const checkedIds = new Set(target.value.filter((i) => i.checked).map((i) => i.id));
    target.value = items.map((item) => ({
      id: item,
      label: item,
      checked: checkedIds.has(item),
    }));
  }

  function getSelectedValues(name) {
    const list = name === 'regio' ? regio.value : name === 'Gemeente' ? gemeente.value : stationName.value;
    return list.filter((item) => item.checked).map((item) => item.id);
  }

  function updateLocalFileState(localFileInput) {
    const localFiles = localFileInput?.files ?? [];
    isLocalFile.value = localFiles.length > 0;
    fileName.value = isLocalFile.value ? localFiles[0].name : 'Geojson bestand | Uploaden';
    isFrom.value = isLocalFile.value
      ? 'De gegevens zijn afkomstig <span class="link-success fw-semibold">van jouw Local File</span>'
      : 'De gegevens zijn afkomstig van <a href="https://api-samenmeten.rivm.nl/v1.0/Things" target="_blank" class="link-success link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover fw-semibold">onze metadata</a>. Bekijk de metadata voor details over de serverdata.';
  }

  async function loadLocalFile(localFileInput) {
    const file = localFileInput?.files?.[0];
    if (!file) throw new Error('No local file selected');
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed.Features) {
      parsed.features = parsed.Features;
      delete parsed.Features;
    }
    return parsed;
  }

  async function filterGeojsonFeatures({
    hour,
    selectedDateIndex,
    selectedProperty,
    selectedRegio,
    selectedGemeente,
    selectedStName,
    local,
    interpolationStatus,
    idwInterpolation,
    hideInterpolationLayer,
    localFileInput,
  }) {
    const now = new Date();
    now.setDate(now.getDate() - selectedDateIndex);
    const date = new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parseInt(hour, 10) + now.getTimezoneOffset() / 60,
      ),
    );
    const measuredTime = date.toISOString().replace('T', '%20').substring(0, 19) + '00';

    if (interpolationStatus === 'activate') {
      await idwInterpolation?.(date.toISOString(), selectedProperty);
    } else {
      hideInterpolationLayer?.();
    }

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
    };

    let filtered;
    if (local) {
      filtered = await loadLocalFile(localFileInput);
    } else {
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
      const [stations, observations] = await Promise.all([
        fetchData(urlStations.toString()),
        fetchData(urlObservations.toString()),
      ]);

      const observationMap = new Map();
      (observations.features ?? observations.Features ?? []).forEach((observation) => {
        observationMap.set(observation.properties.station_name ?? '', observation);
      });

      filtered = {
        type: 'FeatureCollection',
        features: (stations.features ?? stations.Features ?? []).filter((station) => {
          const matching = observationMap.get(station.properties.station_name ?? '');
          if (matching) {
            matching.properties.avg_value = station.properties.avg_value;
            matching.properties.max_value = station.properties.max_value;
            matching.properties.min_value = station.properties.min_value;
            station.properties = { ...matching.properties };
            station.geometry = matching.geometry;
            return true;
          }
          return false;
        }),
      };
    }

    geojson.value = filtered;

    await Promise.all([
      updateUniqueItems(filtered, 'regio'),
      updateUniqueItems(filtered, 'Gemeente'),
      updateUniqueItems(filtered, 'station_name'),
    ]);
  }

  async function reloadLayer({
    hour,
    selectedProperty,
    selectedDateIndex,
    selectedRegio,
    selectedGemeente,
    selectedStName,
    interpolationStatus,
    idwInterpolation,
    hideInterpolationLayer,
    localFileInput,
  }) {
    updateLocalFileState(localFileInput);
    await filterGeojsonFeatures({
      hour,
      selectedDateIndex,
      selectedProperty,
      selectedRegio,
      selectedGemeente,
      selectedStName,
      local: isLocalFile.value,
      interpolationStatus,
      idwInterpolation,
      hideInterpolationLayer,
      localFileInput,
    });
  }

  function formatDate(date, days) {
    const dayName = days[date.getDay()];
    const dateString = date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${dayName} | ${dateString}`;
  }

  return {
    geojson,
    regio,
    gemeente,
    stationName,
    description,
    legendaValues,
    concentrationValues,
    isFrom,
    isLocalFile,
    fileName,
    dayNames,
    timeOptions,
    applyPropertyDefinition,
    fetchData,
    updateUniqueItems,
    createCheckboxes,
    getSelectedValues,
    reloadLayer,
    formatDate,
  };
}
