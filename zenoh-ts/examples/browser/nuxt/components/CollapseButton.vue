<template>
  <button 
    :class="buttonClasses"
    @click="handleClick"
  >
    <template v-if="expandedText !== undefined || collapsedText !== undefined">
      <!-- Custom text mode: show appropriate text based on state -->
      <span class="collapse-btn-text">
        {{ expanded ? (expandedText || '') : (collapsedText || label || '') }}
      </span>
    </template>
    <template v-else>
      <!-- Default mode: show label + triangle -->
      <span v-if="label" class="collapse-btn-label">{{ label }}</span>
      <span class="collapse-btn-triangle">{{ expanded ? '▲' : '▼' }}</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Current expanded state */
  expanded?: boolean
  /** Optional label text to show before the triangle */
  label?: string
  /** Text to show when expanded (instead of triangle) */
  expandedText?: string
  /** Text to show when collapsed (instead of triangle) */
  collapsedText?: string
}

interface Emits {
  (e: 'update:expanded', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false
})

const emit = defineEmits<Emits>()

// Handle button click
function handleClick() {
  const newValue = !props.expanded
  emit('update:expanded', newValue)
}

// Compute CSS classes based on state
const buttonClasses = computed(() => {
  const base = 'collapse-btn'
  const active = props.expanded ? 'collapse-btn--active' : ''
  
  return [base, active].filter(Boolean).join(' ')
})
</script>

<style scoped>
/* Container-adaptive collapse button styles */
.collapse-btn {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: var(--compact-border-radius);
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--compact-font-size);
  line-height: 1.4;
  
  /* Default sizing - will be overridden by container */
  padding: var(--compact-padding);
  min-width: auto;
  min-height: var(--compact-input-height);
  height: auto;
  width: auto;
}

.collapse-btn-label {
  font-weight: 500;
  white-space: nowrap;
  font-size: var(--compact-font-size);
}

.collapse-btn-triangle {
  flex-shrink: 0;
  font-size: 10px;
}

.collapse-btn-text {
  flex-shrink: 0;
  font-size: var(--compact-font-size);
  font-weight: 500;
}

.collapse-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(233, 236, 239, 0.3);
}

.collapse-btn.collapse-btn--active {
  background: #f8f9fa;
  color: #495057;
  border-color: #dee2e6;
}

.collapse-btn:active {
  transform: translateY(0);
}
</style>
