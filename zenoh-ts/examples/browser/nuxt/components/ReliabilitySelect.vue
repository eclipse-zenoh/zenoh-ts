<template>
  <NumberOptionSelect
    :model-value="modelValue"
    :disabled="disabled ?? false"
    :options="options"
    label="Reliability"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { Reliability } from '@eclipse-zenoh/zenoh-ts'
import type { OptionItem } from '../composables/zenohDemo/safeUtils'
import NumberOptionSelect from './NumberOptionSelect.vue'

interface Props {
  modelValue: Reliability | undefined
  disabled?: boolean
  options: OptionItem[]
}

interface Emits {
  (e: 'update:modelValue', value: Reliability | undefined): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
