<template>
  <div class="option-group">
    <label>Encoding:</label>
    <div class="encoding-control">
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
      
      <!-- Custom Toggle Checkbox -->
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OptionItem } from '../composables/zenohDemo/utils'

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

<style scoped>
/* Compact Encoding Field Styling */
.encoding-control {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.encoding-control .encoding-select,
.encoding-control .encoding-text-input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.encoding-control .custom-checkbox-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.custom-checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #6c757d;
  cursor: pointer;
  user-select: none;
}

.custom-encoding-checkbox {
  margin: 0;
  cursor: pointer;
}

.encoding-control .encoding-select:disabled,
.encoding-control .encoding-text-input:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.encoding-control .encoding-select:focus,
.encoding-control .encoding-text-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.option-group label {
  font-weight: 600;
  color: #495057;
}
</style>
