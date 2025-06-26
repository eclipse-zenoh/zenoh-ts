<template>
  <div class="option-group option-group-full-width">
    <label>
      {{ label }}:
      <label class="checkbox-label inline-checkbox">
        <input 
          type="checkbox" 
          :checked="isEmpty" 
          @change="handleEmptyToggle"
          :disabled="disabled || false"
        >
        (empty)
      </label>
    </label>
    <input 
      type="text" 
      :value="modelValue" 
      @input="handleInput"
      :placeholder="placeholder || ''"
      :disabled="disabled || isEmpty"
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  isEmpty: boolean
  label: string
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:isEmpty', value: boolean): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleEmptyToggle(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:isEmpty', target.checked)
}
</script>

<!-- No scoped styles needed - all styles are in shared.css -->
