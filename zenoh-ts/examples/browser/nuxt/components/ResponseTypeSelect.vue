<template>
  <div class="option-group option-group-full-width radio-option-group">
    <label>{{ props.label }}:</label>
    <div class="radio-group">
      <label class="radio-option">
        <input
          type="radio"
          :name="props.name"
          value="Sample"
          :checked="props.modelValue === 'Sample'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Sample</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          :name="props.name"
          value="Error"
          :checked="props.modelValue === 'Error'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Error</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          :name="props.name"
          value="Ignore"
          :checked="props.modelValue === 'Ignore'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Ignore</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: 'Sample' | 'Error' | 'Ignore'
  disabled?: boolean
  label?: string
  name: string
}

interface Emits {
  (e: 'update:modelValue', value: 'Sample' | 'Error' | 'Ignore'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: 'Response Type'
})
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value as 'Sample' | 'Error' | 'Ignore')
}
</script>