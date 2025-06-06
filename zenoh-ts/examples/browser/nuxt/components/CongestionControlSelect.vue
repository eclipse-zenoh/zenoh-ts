<template>
  <div class="option-group">
    <label>Congestion Control:</label>
    <select :value="props.modelValue" @input="updateValue" :disabled="props.disabled">
      <option :value="undefined">(default)</option>
      <option 
        v-for="option in props.congestionControlOptions" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { CongestionControl } from '@eclipse-zenoh/zenoh-ts'
import type { OptionItem } from '../composables/zenohDemo/utils'

interface Props {
  modelValue: CongestionControl | undefined
  disabled?: boolean
  congestionControlOptions: OptionItem[]
}

interface Emits {
  (e: 'update:modelValue', value: CongestionControl | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value === 'undefined' ? undefined : Number(target.value) as CongestionControl
  emit('update:modelValue', value)
}
</script>
