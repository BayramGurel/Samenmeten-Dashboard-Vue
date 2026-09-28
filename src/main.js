import { createApp } from 'vue';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

import App from './App.vue';

Chart.register(...registerables, annotationPlugin);

// Existing dashboard components use these libraries through their browser globals.
// Keeping the globals here lets the components stay small while the dependencies
// are bundled and versioned through npm instead of runtime CDNs.
window.bootstrap = bootstrap;
window.maplibregl = maplibregl;
window.Chart = Chart;

createApp(App).mount('#app');
