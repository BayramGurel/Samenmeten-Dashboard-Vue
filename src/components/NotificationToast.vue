<template>
  <div ref="liveToastRef" id="liveToastNotification" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-patch-check me-2"></i>
        De bestanden zijn gedownload.
        <small class="d-block mt-1">{{ timeString }}</small>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
// Import bootstrap JS or ensure it's globally available
import * as bootstrap from 'bootstrap'; // Example import

// Define Props
const props = defineProps({
  show: Boolean,
  timeString: String,
});

// Define Emits
const emit = defineEmits(['hidden']); // Emitted when toast is hidden

// --- Verbatim Moved Refs ---
const liveToastRef = ref(null);

// --- Local state for Bootstrap Toast instance ---
const toastInstance = ref(null);

// --- Lifecycle hook to initialize ---
onMounted(() => {
  if (liveToastRef.value && bootstrap.Toast) {
    // Initialize Bootstrap Toast instance **WITHOUT** autohide/delay options
    // to match original behavior (manual dismiss only)
    toastInstance.value = new bootstrap.Toast(liveToastRef.value); // CORRECTED: No options object
    // Listen for Bootstrap's hidden event
    liveToastRef.value.addEventListener('hidden.bs.toast', () => {
      emit('hidden'); // Emit event so parent can sync state if needed
    });
  } else {
    console.error("Toast element or Bootstrap JS not found.");
  }
});

// --- Watcher to show/hide based on prop ---
watch(() => props.show, (newValue) => {
  if (toastInstance.value) {
    if (newValue) {
      toastInstance.value.show();
    } else {
      // Note: Calling hide() might trigger the 'hidden.bs.toast' event as well
      toastInstance.value.hide();
    }
  }
});

</script>
