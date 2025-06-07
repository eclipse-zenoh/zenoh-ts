<template>
  <button 
    :class="buttonClasses"
    @click="handleClick"
  >
    <template v-if="expandedText !== undefined || collapsedText !== undefined">
      <!-- Custom text mode: show appropriate text based on state -->
      <span class="button-text">
        {{ expanded ? (expandedText || '') : (collapsedText || label || '') }}
      </span>
    </template>
    <template v-else>
      <!-- Default mode: show label + triangle -->
      <span v-if="label" class="button-label">{{ label }}</span>
      <span class="button-triangle">{{ expanded ? '▲' : '▼' }}</span>
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
  const base = 'compact-button'
  const variant = props.expanded ? 'btn-primary' : ''
  
  return [base, variant].filter(Boolean).join(' ')
})
</script>