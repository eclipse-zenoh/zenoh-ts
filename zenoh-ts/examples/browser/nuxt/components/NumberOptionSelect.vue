<template>
  <div class="option-group">
    <label>{{ label }}:</label>
    <select :value="modelValue ?? ''" @input="updateValue" :disabled="disabled || false">
      <option value="">(default)</option>
      <option 
        v-for="option in options" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { OptionItem } from '../composables/zenohDemo/safeUtils'

interface Props {
  modelValue: number | undefined
  disabled?: boolean
  options: OptionItem[]
  label: string
}

interface Emits {
  (e: 'update:modelValue', value: number | undefined): void
}

withDefaults(defineProps<Props>(), {
  disabled: false
})
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value === '' ? undefined : Number(target.value)
  emit('update:modelValue', value)
}
</script>
