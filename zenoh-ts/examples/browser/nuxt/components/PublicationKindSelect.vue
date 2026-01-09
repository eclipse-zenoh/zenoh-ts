<template>
  <NumberOptionSelectRequired
    :model-value="modelValue"
    :disabled="disabled ?? false"
    :options="options"
    label="Publication Kind"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { SampleKind } from '@eclipse-zenoh/zenoh-ts'
import type { OptionItem } from '../composables/zenohDemo/safeUtils'
import NumberOptionSelectRequired from './NumberOptionSelectRequired.vue'

interface Props {
  modelValue: SampleKind
  disabled?: boolean
  options: OptionItem[]
}

interface Emits {
  (e: 'update:modelValue', value: SampleKind): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
