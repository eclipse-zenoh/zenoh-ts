<template>
  <div class="option-group">
    <label>
      Encoding:
      <!-- Custom Toggle Checkbox in title row -->
      <label class="custom-checkbox-label">
        <input 
          type="checkbox" 
          :checked="customEncoding" 
          @change="handleCustomToggle"
          :disabled="disabled || false"
          class="custom-encoding-checkbox"
        >
        Custom
      </label>
    </label>
    <!-- Predefined Encoding Dropdown -->
    <select 
      v-if="!customEncoding"
      :value="modelValue" 
      @input="handleEncodingChange"
      :disabled="disabled || false"
      class="encoding-select"
    >
      <option value="">(default)</option>
      <option 
        v-for="option in encodingOptions" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    
    <!-- Custom Encoding Input -->
    <input 
      v-else
      type="text" 
      :value="modelValue" 
      @input="handleEncodingChange"
      :disabled="disabled || false"
      placeholder="e.g., text/plain"
      class="encoding-text-input"
    >
  </div>
</template>

<script setup lang="ts">
import type { OptionItem } from '../composables/zenohDemo/safeUtils'

interface Props {
  modelValue: string
  customEncoding: boolean
  encodingOptions: OptionItem[]
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:customEncoding', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

// Handle encoding value changes
function handleEncodingChange(event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement
  emit('update:modelValue', target.value)
}

// Handle custom/predefined toggle
function handleCustomToggle(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:customEncoding', target.checked)
}

// Watch for custom encoding changes to clear the field when switching modes
watch(() => props.customEncoding, () => {
  // Clear the field when switching between modes to allow fresh input
  emit('update:modelValue', '')
}, { immediate: false })
</script>

<!-- No scoped styles needed - all styles are in shared.css -->
