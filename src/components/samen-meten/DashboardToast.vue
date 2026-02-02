<template>
  <!-- Toast container anchored at bottom-right. Uses Bootstrap's toast classes
       and ARIA attributes for assistive technologies. -->
  <div
      class="toast-container position-fixed bottom-0 end-0 p-3 content-none"
      style="z-index: 9999;"
  >
    <div
        ref="toastRef"
        class="toast align-items-center text-white bg-primary border-0"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">
          <!-- Decorative icon marking a successful operation. It's hidden from
               screen readers because the text conveys the meaning. -->
          <i class="bi bi-patch-check me-2" aria-hidden="true"></i>
          De bestanden zijn gedownload.
          <small class="d-block mt-1">{{ props.timeString }}</small>
        </div>
        <!-- Close button with an accessible label -->
        <button
            type="button"
            class="btn-close btn-close-white me-2 m-auto"
            data-bs-dismiss="toast"
            aria-label="Sluiten"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue';

/**
 * Props accepted by DashboardToast. Only a timestamp string is required. A
 * future enhancement could include custom messages or types (success,
 * error) and use those to adjust styling dynamically.
 */
const props = defineProps<{
  timeString: string;
}>();

/**
 * Reference to the underlying toast element. The parent component should
 * access this ref via `$refs.toastPanel?.toastRef` and then create a
 * Bootstrap Toast instance (e.g. `bootstrap.Toast.getOrCreateInstance`).
 */
const toastRef = ref<HTMLDivElement | null>(null);

// Export the ref to allow the parent to manipulate the toast directly
export { toastRef };

// TODO: Consider converting this component into a more generic toast that
// accepts message and variant props, and exposes a method for showing
// programmatically. This would simplify usage across the application.
</script>

<style scoped>
/* Placeholder for any custom toast styling. The default Bootstrap classes
   handle most styling needs. */
</style>