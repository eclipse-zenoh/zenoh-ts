<template>
  <div class="option-group option-group-full-width">
    <label>{{ label }}:</label>
    <input 
      type="text" 
      :value="modelValue" 
      @input="handleInput"
      :placeholder="placeholder || ''"
      :disabled="disabled || false"
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  label: string
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.option-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  width: 100%;
}

.option-group label {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 0.875rem;
  color: #495057;
}

.option-group input {
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}

.option-group input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.option-group input:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}
</style>