<template>
  <button 
    :class="buttonClasses"
    :disabled="isDisabled"
    @click="$emit('click')"
  >
    {{ expanded ? '▲' : '▼' }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Whether the content is expanded (true = ▲, false = ▼) */
  expanded: boolean
  /** Whether the button is disabled */
  disabled?: boolean
}

interface Emits {
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

defineEmits<Emits>()

// Compute CSS classes based on state
const buttonClasses = computed(() => {
  const base = 'collapse-btn'
  const active = props.expanded ? 'collapse-btn--active' : ''
  
  return [base, active].filter(Boolean).join(' ')
})

// Compute disabled state - only disabled if explicitly true
const isDisabled = computed(() => props.disabled === true)
</script>

<style scoped>
/* Container-adaptive collapse button styles */
.collapse-btn {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  
  /* Default sizing - will be overridden by container */
  padding: 4px 6px;
  min-width: 20px;
  height: auto;
  
  /* Adapt to container size */
  width: 100%;
  height: 100%;
  min-height: 20px;
}

.collapse-btn:hover:not(:disabled) {
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

.collapse-btn:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.collapse-btn:active {
  transform: translateY(0);
}
</style>
