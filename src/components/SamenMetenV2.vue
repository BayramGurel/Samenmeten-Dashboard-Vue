<template>
  <!-- make sure this wrapper has non-zero height (e.g. h-screen) and position:relative -->
  <div class="relative w-full h-screen">
    <MapContainer
        :styleUrl="`https://api.maptiler.com/maps/dataviz/style.json?key=${API_KEY}`"
        :center="[4.218788, 52.008663]"
        :zoom="8.9"
    />
  </div>
</template>

<script setup>
// import { ref } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
const API_KEY = 'FbKICYxfhm1aP5pa4olH'

//
// // Reactive defaults—swap out or wire to API/store as you build
// const center = ref<[number, number]>([52.37, 4.89])  // Amsterdam
// const zoom   = ref<number>(12)

// → If you need props from App.vue or a store, replace ref() with computed()
</script>

<style scoped>

</style>
