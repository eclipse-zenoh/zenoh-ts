<template>
  <NumberOptionSelectRequired
    :model-value="modelValue"
    :disabled="disabled ?? false"
    :options="options"
    label="Response Type"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import type { ResponseType } from '../composables/useZenohDemo'
import type { OptionItem } from '../composables/zenohDemo/safeUtils'
import NumberOptionSelectRequired from './NumberOptionSelectRequired.vue'

interface Props {
  modelValue: ResponseType
  disabled?: boolean
  options: OptionItem[]
}

interface Emits {
  (e: 'update:modelValue', value: ResponseType): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleUpdate(value: number) {
  emit('update:modelValue', value as ResponseType)
}
</script>
