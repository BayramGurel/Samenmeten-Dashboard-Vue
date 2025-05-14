<template>
  <div class="accordion-item">
    <h2 class="accordion-header" :id="`heading-${itemIdPrefix}`">
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${itemIdPrefix}`" aria-expanded="false" :aria-controls="`collapse-${itemIdPrefix}`">
        <span class="me-2 fw-medium text-primary-emphasis">{{ title }}</span>
        <span :class="badgeClass">{{ count > 0 ? count : 'Geen' }}</span>
      </button>
    </h2>
    <div :id="`collapse-${itemIdPrefix}`" class="accordion-collapse collapse" :aria-labelledby="`heading-${itemIdPrefix}`" :data-bs-parent="'#filtersAccordionControls'"> <div class="accordion-body" style="max-height: 20vh; overflow-y: auto;">
      <div v-if="!items || items.length === 0" class="text-muted small">Geen {{ title.toLowerCase() }} beschikbaar.</div>
      <div v-for="checkbox in items" :key="checkbox.id" class="form-check">
        <input
            type="checkbox"
            :id="`${itemIdPrefix}-${checkbox.id}`"
            :value="checkbox.id"
            v-model="checkbox.checked" @change="onSelectionChange"
            class="form-check-input"
        >
        <label :for="`${itemIdPrefix}-${checkbox.id}`" class="form-check-label">{{ checkbox.label }}</label>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterAccordionItem',
  props: {
    title: String,
    items: { // Array of { id: string, label: string, checked: boolean }
      type: Array,
      default: () => [] // Provide a default empty array
    },
    count: {
      type: Number,
      default: 0 // Provide a default count
    },
    itemIdPrefix: {
      type: String,
      required: true
    }
  },
  computed: {
    badgeClass() {
      return this.count === 0 ? 'badge rounded-pill bg-danger' : 'badge rounded-pill bg-primary';
    }
  },
  methods: {
    onSelectionChange() {
      // Ensure items is not null or undefined before filtering
      const selectedIds = (this.items || []).filter(item => item.checked).map(item => item.id);
      this.$emit('filter-change', selectedIds);
    }
  },
  emits: ['filter-change']
};
</script>

<style scoped>
.accordion-body {
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem; /* Smaller padding */
}
.form-check {
  margin-bottom: 0.25rem; /* Less space between checkboxes */
}
.form-check-label {
  word-break: break-word; /* Prevent long labels from breaking layout */
}
</style>