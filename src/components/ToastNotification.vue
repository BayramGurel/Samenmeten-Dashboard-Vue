<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 9999;">
    <div ref="liveToast" class="toast align-items-center text-white border-0" :class="toastClass" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <i :class="toastIcon" class="me-2"></i>
          {{ message }}
          <small v-if="timeString" class="d-block mt-1">{{ timeString }}</small>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ToastNotification',
  props: {
    // No props are strictly needed if 'show' method is used to pass data, which is a good pattern here.
  },
  data() {
    return {
      toastInstance: null,
      message: 'Operation successful.', // Default message
      toastType: 'success', // Default type: 'success', 'error', 'warning'
      timeString: '', // Timestamp for the notification
    };
  },
  computed: {
    toastClass() {
      // Dynamically sets the background class based on the toast type
      if (this.toastType === 'error') return 'bg-danger';
      if (this.toastType === 'warning') return 'bg-warning text-dark'; // Ensuring text is readable on yellow
      return 'bg-primary'; // Default to primary color (often used for success)
    },
    toastIcon() {
      // Dynamically sets the icon based on the toast type
      if (this.toastType === 'error') return 'bi bi-x-octagon-fill';
      if (this.toastType === 'warning') return 'bi bi-exclamation-triangle-fill';
      return 'bi bi-patch-check-fill'; // Default success icon
    }
  },
  mounted() {
    // Initialize the Bootstrap Toast component when this Vue component is mounted
    if (window.bootstrap && this.$refs.liveToast) {
      this.toastInstance = new window.bootstrap.Toast(this.$refs.liveToast, {
        delay: 5000 // Autohide delay in milliseconds
      });
    }
  },
  beforeUnmount() {
    // Clean up the Bootstrap Toast instance when the Vue component is about to be destroyed
    if (this.toastInstance && typeof this.toastInstance.dispose === 'function') {
      this.toastInstance.dispose();
    }
    this.toastInstance = null; // Clear the reference
  },
  methods: {
    // Public method to show the toast notification
    show(message = 'Notificatie', type = 'success') {
      this.message = message;
      this.toastType = type;
      // Generate a timestamp string for when the notification is shown
      this.timeString = new Date().toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      // Show the toast if the instance exists
      this.toastInstance?.show();
    }
  }
};
</script>

<style scoped>
/* Scoped styles for the ToastNotification component */
.toast-body small {
  font-size: 0.75em; /* Smaller font size for the timestamp */
}
/* Ensure toast is always on top, though z-index is already high in template */
.toast-container {
  z-index: 1090; /* Bootstrap's default modal z-index is 1055, ensure toast is above */
}
</style>