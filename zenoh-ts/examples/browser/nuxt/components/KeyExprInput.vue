<template>
  <div class="option-group option-group-full-width">
    <label>{{ label }}:</label>
    <input 
      type="text" 
      :value="modelValue" 
      @input="handleInput"
      :placeholder="placeholder || ''"
      :disabled="disabled || false"
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  label: string
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<!-- No scoped styles needed - all styles are in shared.css -->