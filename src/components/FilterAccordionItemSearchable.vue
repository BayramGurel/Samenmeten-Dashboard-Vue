<template>
  <div class="accordion-item">
    <h2 class="accordion-header" :id="`heading-${itemIdPrefix}`">
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapse-${itemIdPrefix}`" aria-expanded="false" :aria-controls="`collapse-${itemIdPrefix}`">
        <span class="me-2 fw-medium text-primary-emphasis">{{ title }}</span>
        <span :class="badgeClass">{{ count > 0 ? count : 'Geen' }}</span>
      </button>
    </h2>
    <div :id="`collapse-${itemIdPrefix}`" class="accordion-collapse collapse" :aria-labelledby="`heading-${itemIdPrefix}`" :data-bs-parent="'#filtersAccordionControls'"> <div class="accordion-body" style="max-height: 22vh; overflow-y: auto;">
      <div class="form-floating mb-2 focused-label">
        <input
            type="search"
            :value="searchQuery"
            @input="updateSearchQuery($event.target.value)"
            @change="$emit('select-matching')"
            class="form-control form-control-sm text-primary rounded shadow-sm"
            :list="`datalist-${itemIdPrefix}`"
            :id="`searchInput-${itemIdPrefix}`"
            placeholder=" "
        >
        <label :for="`searchInput-${itemIdPrefix}`">Zoeken naar {{ title.toLowerCase() }}</label>
      </div>
      <datalist :id="`datalist-${itemIdPrefix}`">
        <option v-for="checkbox in (items || [])" :key="`dl-${checkbox.id}`" :value="checkbox.label"></option>
      </datalist>

      <div v-if="!items || items.length === 0" class="text-muted small">Geen {{ title.toLowerCase() }} beschikbaar.</div>
      <div v-for="checkbox in filteredItems" :key="checkbox.id" class="form-check">
        <input
            type="checkbox"
            :id="`${itemIdPrefix}-${checkbox.id}`"
            :value="checkbox.id"
            v-model="checkbox.checked"  @change="onSelectionChange"
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
  name: 'FilterAccordionItemSearchable',
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
    searchQuery: String, // No default needed if parent always provides it (e.g. via v-model)
    itemIdPrefix: {
      type: String,
      required: true
    }
  },
  computed: {
    badgeClass() {
      return this.count === 0 ? 'badge rounded-pill bg-danger' : 'badge rounded-pill bg-primary';
    },
    filteredItems() {
      // Ensure items is an array before trying to filter
      const currentItems = this.items || [];
      if (!this.searchQuery) {
        return currentItems;
      }
      const lowerSearch = this.searchQuery.toLowerCase();
      return currentItems.filter(item => item.label && item.label.toLowerCase().includes(lowerSearch));
    }
  },
  methods: {
    onSelectionChange() {
      // When a checkbox is changed, we emit all currently checked items from the original (unfiltered) list
      // Ensure items is an array before trying to filter
      const selectedIds = (this.items || []).filter(item => item.checked).map(item => item.id);
      this.$emit('filter-change', selectedIds);
    },
    updateSearchQuery(value) {
      this.$emit('search-query-updated', value);
    }
  },
  emits: ['filter-change', 'search-query-updated', 'select-matching']
};
</script>

<style scoped>
.accordion-body {
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
}
.form-check {
  margin-bottom: 0.25rem;
}
.form-check-label {
  word-break: break-word; /* Prevent long labels from breaking layout */
}
.form-control-sm {
  font-size: 0.8rem; /* Smaller search input */
}
</style>