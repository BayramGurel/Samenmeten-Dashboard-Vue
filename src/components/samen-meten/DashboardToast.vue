<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3 content-none" style="z-index: 9999;">
    <div ref="liveToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-patch-check me-2"></i>
          De bestanden zijn gedownload.
          <small class="d-block mt-1">{{ timeString }}</small>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardToast',
  props: {
    timeString: {
      type: String,
      required: true,
    },
  },
};
</script>
