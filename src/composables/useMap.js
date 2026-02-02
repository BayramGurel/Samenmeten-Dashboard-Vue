import { ref } from 'vue';
import { createDropdownPopup, createDetailPopup } from '@/utils/popupHelper';

/**
 * Manage MapLibre map initialization, layers, controls, and interactions.
 *
 * TODO: Consider accepting configuration objects per layer so this composable
 * can be reused for other dashboards without editing the source.
 */
export function useMap({
  mapContainerId,
  apiKey,
  styleUrls,
  styleNames,
  bbox,
  getColor,
  onStationSelect,
  onStationDetails,
}) {
  const map = ref(null);
  const currentLayerId = ref(null);
  const rasterLayers = new Set();

  /**
   * Initialize the MapLibre map instance and attach base layers.
   *
   * @param {string} styleUrl
   */
  function initializeMap(styleUrl) {
    map.value = new window.maplibregl.Map({
      container: mapContainerId,
      style: styleUrl,
      center: [4.218788, 52.008663],
      zoom: 8.9,
    });

    map.value.on('load', () => {
      addLineSourceAndLayer();
      addWindLayer();
    });
  }

  /**
   * Add built-in and custom controls to the map.
   *
   * @param {() => void} onStyleChange
   */
  function addControls(onStyleChange) {
    if (!map.value) return;
    addStyleSwitchControl(onStyleChange);
    map.value.addControl(new window.maplibregl.FullscreenControl());
    map.value.addControl(new window.maplibregl.NavigationControl());
    map.value.addControl(
      new window.maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
    );
  }

  function addLineSourceAndLayer() {
    const m = map.value;
    if (!m) return;
    if (!m.getSource('line')) {
      m.addSource('line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: bbox ?? [],
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

  function addWindLayer() {
    // TODO: Implement wind layer logic if required. Left blank for clarity.
  }

  function addStyleSwitchControl(onStyleChange) {
    if (!map.value) return;
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
    styleSwitcher.setAttribute('aria-label', 'Selecteer kaartstijl');

    const styles = (styleUrls ?? []).map((url) => `${url}${apiKey}`);
    styles.forEach((style, index) => {
      const option = document.createElement('option');
      option.value = style;
      option.text = styleNames?.[index] ?? `Style ${index + 1}`;
      styleSwitcher.appendChild(option);
    });

    styleSwitcher.onchange = (event) => {
      const target = event.target;
      if (!target) return;
      try {
        map.value?.setStyle(target.value);
        setTimeout(() => {
          addLineSourceAndLayer();
          onStyleChange?.();
        }, 50);
      } catch (error) {
        console.error('An error occurred while switching styles:', error);
      }
    };
    styleSwitcherContainer.appendChild(styleSwitcher);
    const control = {
      onAdd: () => styleSwitcherContainer,
      onRemove: () => {},
      getDefaultPosition: () => 'top-right',
    };
    map.value.addControl(control);
  }

  function getCircleColorExpression() {
    return [
      'case',
      ['==', ['get', 'property'], 'pm25'],
      ['step', ['get', 'value'], '#1E90FF', 8.3, '#48D1CC', 16.7, '#9ACD32', 25, '#DAA520', Infinity, '#000000'],
      ['in', ['get', 'property'], ['literal', ['no2', 'pm10']]],
      ['step', ['get', 'value'], '#1E90FF', 13.3, '#48D1CC', 26.6, '#9ACD32', 40, '#DAA520', Infinity, '#000000'],
      '#000000',
    ];
  }

  function updateMapSourceAndLayer(geo) {
    const m = map.value;
    if (!m || !geo || (!geo.features && !geo.Features)) return;
    const features = geo.features ?? geo.Features;
    const normalized = {
      type: 'FeatureCollection',
      features: features,
    };

    if (!m.getSource('stations')) {
      m.addSource('stations', { type: 'geojson', data: normalized });
    } else {
      const source = m.getSource('stations');
      if (source && source.setData) {
        source.setData(normalized);
      }
    }

    if (!m.getLayer('stations')) {
      addStationsLayer();
    }
  }

  function addStationsLayer() {
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

  function handleStationClick(event) {
    const m = map.value;
    if (!m) return;
    const features = m.queryRenderedFeatures(event.point, { layers: ['stations'] });
    if (features.length > 1) {
      createDropdownPopup({
        map: m,
        features,
        lngLat: event.lngLat,
        getColor,
        onSelect: (props) => onStationSelect?.(props),
        onDetail: (props) => onStationDetails?.(props),
        openDetailPopup: createDetailPopup,
      });
    } else if (features.length === 1) {
      createDetailPopup({
        map: m,
        feature: features[0],
        lngLat: event.lngLat,
        getColor,
        onSelect: (props) => onStationSelect?.(props),
        onDetail: (props) => onStationDetails?.(props),
      });
    }
  }

  async function idwInterpolation(dateStr, property) {
    const m = map.value;
    if (!m) return;
    const bounds = [3.773675345120739, 51.64377788724585, 5.031415001585676, 52.3325109475691];
    const layerId = `interpolatie-${dateStr}-${property}`;
    rasterLayers.add(layerId);
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

  function hideInterpolationLayer() {
    const m = map.value;
    if (!m || !currentLayerId.value) return;
    if (m.getLayer(currentLayerId.value)) {
      m.setPaintProperty(currentLayerId.value, 'raster-opacity', 0);
    }
  }

  return {
    map,
    currentLayerId,
    initializeMap,
    addControls,
    addLineSourceAndLayer,
    updateMapSourceAndLayer,
    idwInterpolation,
    hideInterpolationLayer,
  };
}
