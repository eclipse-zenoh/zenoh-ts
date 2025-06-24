<template>
  <button 
    :class="buttonClasses"
    @click="handleClick"
  >
    <span class="button-text">
      {{ !pressed ? (label || '▲') : (labelPressed || label || '▼') }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Current pressed state */
  pressed?: boolean
  /** Text to show when not pressed */
  label?: string
  /** Text to show when pressed (falls back to label if not provided) */
  labelPressed?: string
}

interface Emits {
  (e: 'update:pressed', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  pressed: true
})

const emit = defineEmits<Emits>()

// Handle button click
function handleClick() {
  const newValue = !props.pressed
  emit('update:pressed', newValue)
}

// Compute CSS classes based on state
const buttonClasses = computed(() => {
  const stateClass = props.pressed ? 'btn-pressed' : ''
  const baseClass = 'check-button' // Add identifying class for styling
  return [baseClass, stateClass].filter(Boolean).join(' ')
})
</script>

