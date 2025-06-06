<template>
  <div class="option-group">
    <label>Reliability:</label>
    <select :value="modelValue ?? ''" @input="updateValue" :disabled="disabled || false">
      <option value="">(default)</option>
      <option 
        v-for="option in reliabilityOptions" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { Reliability } from '@eclipse-zenoh/zenoh-ts'
import type { OptionItem } from '../composables/zenohDemo/utils'

interface Props {
  modelValue: Reliability | undefined
  disabled?: boolean
  reliabilityOptions: OptionItem[]
}

interface Emits {
  (e: 'update:modelValue', value: Reliability | undefined): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value === '' ? undefined : Number(target.value)
  emit('update:modelValue', value)
}
</script>
