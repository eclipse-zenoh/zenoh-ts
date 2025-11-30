<template>
  <div class="option-group option-group-full-width radio-option-group">
    <label>{{ props.label }}:</label>
    <div class="radio-group">
      <label class="radio-option">
        <input
          type="radio"
          :name="props.name"
          value="put"
          :checked="props.modelValue === 'put'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Put</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          :name="props.name"
          value="delete"
          :checked="props.modelValue === 'delete'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Delete</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: 'put' | 'delete'
  disabled?: boolean
  label?: string
  name: string
}

interface Emits {
  (e: 'update:modelValue', value: 'put' | 'delete'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: 'Publication Kind'
})
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value as 'put' | 'delete')
}
</script>
