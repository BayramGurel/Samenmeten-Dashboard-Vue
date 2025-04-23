<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100">
    <div
        ref="toastRef"
        class="toast align-items-center border-0"
        :class="toastClass"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">
          <i :class="iconClass" class="me-2"></i>
          {{ message }}
          <small v-if="timeString" class="d-block mt-1">{{ timeString }}</small>
        </div>
        <button
            type="button"
            class="btn-close btn-close-white me-2 m-auto"
            @click="hideToastManually"
            aria-label="Close"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  message: {
    type: String,
    default: 'Notification.'
  },
  timeString: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'].includes(value)
  },
  delay: {
    type: Number,
    default: 5000
  }
});

const emit = defineEmits(['close-toast']);

const toastRef = ref(null);
const toastInstance = ref(null);

onMounted(() => {
  if (toastRef.value && window.bootstrap?.Toast) {
    toastInstance.value = new window.bootstrap.Toast(toastRef.value, {
      delay: props.delay,
      autohide: true
    });

    toastRef.value.addEventListener('hidden.bs.toast', () => {
      if (props.show) {
        emit('close-toast');
      }
    });

    if (props.show) {
      toastInstance.value?.show();
    }

  } else {
    console.warn('Bootstrap Toast JS not found or toastRef not available.');
  }
});

onBeforeUnmount(() => {
  toastInstance.value?.dispose();
});

watch(() => props.show, (newValue, oldValue) => {
  if (newValue) {
    toastInstance.value?.show();
  } else {
    if (toastInstance.value && toastRef.value && !toastRef.value.classList.contains('hiding') && toastRef.value.classList.contains('show')) {
      toastInstance.value?.hide();
    }
  }
});

function hideToastManually() {
  toastInstance.value?.hide();
}

const toastClass = computed(() => ({
  [`text-bg-${props.type}`]: true
}));

const iconClass = computed(() => {
  switch (props.type) {
    case 'success': return 'bi bi-check-circle-fill';
    case 'danger': return 'bi bi-exclamation-triangle-fill';
    case 'warning': return 'bi bi-exclamation-triangle-fill';
    case 'info': return 'bi bi-info-circle-fill';
    default: return 'bi bi-bell-fill'; // Or use 'bi bi-patch-check-fill' for original icon
  }
});

</script>

<style scoped>
.toast-container {
  z-index: 1100;
}
.toast-body {
  color: inherit;
}
</style>