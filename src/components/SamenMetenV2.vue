<template>
<!--  <div class="dashboard">-->
<!--    &lt;!&ndash; 🎛 Controls, legends, stats panels go above the map &ndash;&gt;-->
<!--    <div class="controls">-->
<!--      &lt;!&ndash; e.g. filters, date pickers, info cards &ndash;&gt;-->
<!--    </div>-->

    <!-- Map area grows to fill remaining space -->
    <MapContainer />
<!--        :center="center"-->
<!--        :zoom="zoom"-->
<!--        class="map-area"-->
<!--    />-->
<!--  </div>-->
</template>

<script setup>
// import { ref } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
//
// // Reactive defaults—swap out or wire to API/store as you build
// const center = ref<[number, number]>([52.37, 4.89])  // Amsterdam
// const zoom   = ref<number>(12)

// → If you need props from App.vue or a store, replace ref() with computed()
</script>

<style scoped>

</style>
