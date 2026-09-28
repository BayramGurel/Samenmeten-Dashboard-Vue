# Samen Meten – Luchtkwaliteitsdashboard Zuid-Holland

Interactief Vue-dashboard voor het bekijken en analyseren van luchtkwaliteitsmetingen in Zuid-Holland.

**Live:** https://bayramgurel.github.io/

## Wat kun je met het dashboard?

- Meetstations bekijken op een interactieve MapLibre-kaart.
- Wisselen tussen PM2,5, PM10 en NO₂.
- Filteren op regio, gemeente en station.
- Metingen per datum en uur bekijken.
- Tijdreeksen per station visualiseren met Chart.js.
- Een interpolatielaag via WMS tonen.
- Eigen GeoJSON-data openen.
- De actuele selectie exporteren als GeoJSON of CSV.
- Wisselen tussen verschillende kaartstijlen.

## Techniek

- Vue 3 (Composition API)
- JavaScript
- MapLibre GL
- Chart.js + chartjs-plugin-annotation
- Bootstrap 5 + Bootstrap Icons
- GeoJSON, REST API en WMS
- Vue CLI / Webpack
- GitHub Pages

De applicatie gebruikt data-endpoints van het Samen Meten-dashboard en kaartlagen van de Provincie Zuid-Holland.

## Structuur

```text
src/
├── components/
│   ├── SamenMetenDashboard.vue
│   └── samen-meten/
│       ├── DashboardDataTools.vue
│       ├── DashboardLegendTabs.vue
│       ├── DashboardStationModal.vue
│       ├── DashboardToast.vue
│       ├── MapSidebarInfo.vue
│       └── StationChart.vue
├── composables/
│   ├── useData.js
│   └── useMap.js
├── data/
│   └── variable.js
├── utils/
│   ├── popupHelper.js
│   └── samenMetenColors.js
├── App.vue
└── main.js
```

Kaartlogica en datalogica zijn opgesplitst in composables. De grotere gebruikersinterface is verdeeld over losse componenten zodat onderdelen eenvoudiger te onderhouden zijn.

## Lokaal draaien

Vereisten:

- Node.js 20 of nieuwer
- npm

```bash
git clone https://github.com/BayramGurel/Samenmeten-Dashboard-Vue.git
cd Samenmeten-Dashboard-Vue
npm ci
npm run serve
```

De developmentserver draait standaard via Vue CLI.

## Kwaliteitscontroles

```bash
npm run lint
npm run build
```

GitHub Actions voert deze controles automatisch uit bij pushes en pull requests naar `main`.

## Deployment

De broncode staat in deze repository. De productiebuild voor GitHub Pages staat in:

https://github.com/BayramGurel/BayramGurel.github.io

De deployment-repository bouwt de nieuwste versie van deze repository en publiceert die op:

https://bayramgurel.github.io/

## Opmerking over kaartconfiguratie

De MapTiler browser-key die door de kaart wordt gebruikt is client-side zichtbaar, zoals bij browsergebaseerde kaartapps gebruikelijk is. Voor productie hoort deze key in MapTiler beperkt te zijn tot de toegestane domeinen.

## Auteur

Bayram Gurel
