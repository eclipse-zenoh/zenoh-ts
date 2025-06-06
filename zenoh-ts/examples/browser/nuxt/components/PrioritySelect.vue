<template>
  <div class="option-group">
    <label>Priority:</label>
    <select :value="modelValue" @input="updateValue" :disabled="disabled || false">
      <option :value="undefined">(default)</option>
      <option 
        v-for="option in priorityOptions" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { Priority } from '@eclipse-zenoh/zenoh-ts'
import type { OptionItem } from '../composables/zenohDemo/utils'

interface Props {
  modelValue: Priority | undefined
  disabled?: boolean
  priorityOptions: OptionItem[]
}

interface Emits {
  (e: 'update:modelValue', value: Priority | undefined): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value === 'undefined' ? undefined : Number(target.value)
  emit('update:modelValue', value)
}
</script>
