<template>
  <AirQualityDashboard />
</template>

<script setup>
// Import the main dashboard component
// Make sure the path './AirQualityDashboard.vue' is correct relative to App.vue
import AirQualityDashboard from './components/AirQualityDashboard.vue';

// Components imported in <script setup> are automatically available to the template
// No 'components' registration needed.
</script>

<style>
/* Global Styles - Apply to the entire application */

/* 1. Import Bootstrap CSS (Essential for layout and components) */
/* Make sure you have installed bootstrap: npm install bootstrap bootstrap-icons */
@import 'bootstrap/dist/css/bootstrap.min.css';


/* 3. Basic body reset (optional, but good practice) */
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  /* Prevent flickering scrollbars if content fits viewport */
  overflow: hidden;
}

/* Ensure the root element (#app typically) takes up full viewport height */
#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden; /* Prevent body scroll, dashboard components handle their own scroll */
}

/* Optional: Define global CSS variables if needed */
/* :root { */
/* --bs-primary: #your-color; */
/* } */

/* Add any other global application-wide styles here */

</style>