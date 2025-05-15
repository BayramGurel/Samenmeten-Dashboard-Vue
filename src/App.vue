<template>
  <AirQualityDashboard />
</template>

<script setup>
// Import the main dashboard component
import AirQualityDashboard from './components/SamenMetenDashboard.vue';

// Components imported in <script setup> are automatically available to the template
// No 'components' registration needed.
</script>

<style>
/* Global Styles - Apply to the entire application */

/* 1. Import Bootstrap CSS (Essential for layout and components) */
/* Make sure you have installed bootstrap: npm install bootstrap bootstrap-icons */
@import 'bootstrap/dist/css/bootstrap.min.css';

</style>