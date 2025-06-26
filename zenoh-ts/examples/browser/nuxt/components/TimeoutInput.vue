<template>
  <div class="option-group">
    <label class="compact-label">
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
      type="number" 
      :value="modelValue" 
      @input="handleInput"
      :placeholder="placeholder || '10000'"
      :min="min || 0"
      :disabled="disabled || isEmpty"
      class="compact-input"
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: number | undefined
  isEmpty: boolean
  label?: string
  placeholder?: string
  min?: number
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: number | undefined): void
  (e: 'update:isEmpty', value: boolean): void
}

withDefaults(defineProps<Props>(), {
  label: 'Timeout (ms)'
})
const emit = defineEmits<Emits>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value === '' ? undefined : Number(target.value)
  emit('update:modelValue', value)
}

function handleEmptyToggle(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:isEmpty', target.checked)
}
</script>

<!-- No scoped styles needed - all styles are in shared.css -->
