<template>
  <div class="row p-2">
    <div class="col text-center">
      <h3 class="pb-2 text-primary border-bottom border-primary">IDW interpolatie</h3>
      <div class="row my-3">
        <div class="col-10 text-start">
          De ‘IDW Interpolatie’ is een krachtige functie die luchtkwaliteitswaarden op ongemeten locaties
          voorspelt, waarbij meetpunten in de nabijheid een grotere invloed hebben. Met de ‘Verbergen’ en
          ‘Weergeven op kaart’ opties kunt u de zichtbaarheid van deze voorspelde waarden op de kaart beheren.<br><br>Houd er
          rekening mee dat er bij het eerste gebruik een kleine vertraging kan optreden, maar bij latere
          toepassingen wordt de interpolatie vloeiend weergegeven. De nauwkeurigheid van de voorspellingen is
          afhankelijk van de kwaliteit en spreiding van de meetpunten.
        </div>
        <div class="col">
          <img :src="require('@/assets/interpolatie-legenda.png')" class="img-fluid rounded w-auto h-75">
        </div>
        <div class="btn-group btn-group-sm mt-2" role="group" aria-label="Basic radio toggle button group">
          <input
              type="radio"
              class="btn-check"
              name="btnradio-analysis" value="disable"
              id="disable-analysis" autocomplete="off"
              :checked="interpolationStatus === 'disable'"
              @change="emit('update:interpolationStatus', 'disable')"
          >
          <label class="btn btn-outline-danger" for="disable-analysis">Verbergen</label>

          <input
              type="radio"
              class="btn-check"
              name="btnradio-analysis" value="activate"
              id="activate-analysis" autocomplete="off"
              :checked="interpolationStatus === 'activate'"
              @change="emit('update:interpolationStatus', 'activate')"
          >
          <label class="btn btn-outline-primary" for="activate-analysis">Weergeven op kaart</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Define Props
defineProps({
  interpolationStatus: String,
});

// Define Emits
const emit = defineEmits(['update:interpolationStatus']);

// No script logic moved here
</script>