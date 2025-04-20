<template>
  <div
      ref="toastElementRef"
      class="toast align-items-center text-bg-primary border-0"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
  >
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-patch-check-fill me-2"></i> {{ props.message }}
        <small v-if="props.timeString" class="d-block mt-1">{{ props.timeString }}</small>
      </div>
      <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          aria-label="Close"
          @click="closeToast"
      ></button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
// Import Bootstrap's Toast component logic
import { Toast } from 'bootstrap';

const props = defineProps({
  show: { // Controls visibility from parent
    type: Boolean,
    required: true,
  },
  message: { // The main message to display
    type: String,
    default: 'Notification',
  },
  timeString: { // Optional timestamp string
    type: String,
    default: '',
  }
});

const emit = defineEmits([
  'close-toast', // Emitted when the toast should be hidden (user click or internal event)
]);

const toastElementRef = ref(null); // Template ref for the toast DOM element
const toastInstanceRef = ref(null); // Ref to hold the Bootstrap Toast instance

// Function to emit close event
const closeToast = () => {
  emit('close-toast');
};

// Initialize and manage the Bootstrap Toast instance
onMounted(() => {
  if (toastElementRef.value) {
    // Create a new Bootstrap Toast instance
    toastInstanceRef.value = new Toast(toastElementRef.value, {
      autohide: false // Control visibility strictly via the 'show' prop
    });

    // Listen for the Bootstrap event when the toast is hidden
    // This handles cases where it might be closed by means other than the prop changing (e.g., future autohide)
    // or ensures we emit close if Bootstrap hides it internally before prop changes.
    toastElementRef.value.addEventListener('hidden.bs.toast', () => {
      // Check if it was supposed to be shown - prevents emitting close if it was hidden via prop already
      if(props.show) {
        emit('close-toast');
      }
    });

    // Show the toast initially if the prop is true when mounted
    if (props.show) {
      toastInstanceRef.value.show();
    }
  }
});

// Clean up the Bootstrap Toast instance when the component unmounts
onBeforeUnmount(() => {
  toastInstanceRef.value?.dispose(); // Use optional chaining safely
});

// Watch the 'show' prop to programmatically show/hide the toast
watch(() => props.show, (newValue) => {
  if (toastInstanceRef.value) {
    if (newValue) {
      toastInstanceRef.value.show();
    } else {
      toastInstanceRef.value.hide();
    }
  }
});

</script>

<style scoped>
/* Add any specific scoped styles for the toast if needed */
.toast {
  /* Ensure it appears above other elements as needed */
  /* z-index is often handled by the positioning classes from the parent */
  min-width: 250px; /* Example: Ensure minimum width */
}
.toast-body small {
  opacity: 0.8;
}
</style>