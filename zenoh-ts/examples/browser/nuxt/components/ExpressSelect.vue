<template>
  <TriStateCheckbox
    :model-value="modelValue"
    :disabled="disabled ?? false"
    label="Express (no batching)"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import TriStateCheckbox from './TriStateCheckbox.vue'

interface Props {
  modelValue: boolean | undefined
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean | undefined): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
