<template>
  <div class="option-group">
    <label>{{ label }}:</label>
    <div class="express-control" :class="{ disabled: disabled || false }">
      <input 
        type="checkbox" 
        ref="checkbox"
        :disabled="disabled || false"
        @click="handleCheckboxClick"
        class="compact-input"
      >
      <span class="express-state-label">{{ getStateLabel() }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'

interface Props {
  modelValue: boolean | undefined
  disabled?: boolean
  label: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})
const emit = defineEmits<Emits>()

const checkbox = ref<HTMLInputElement>()

// Update checkbox state when the value changes
function updateCheckboxState() {
  if (checkbox.value) {
    const value = props.modelValue;
    if (value === undefined) {
      checkbox.value.indeterminate = true;
      checkbox.value.checked = false;
    } else if (value === true) {
      checkbox.value.indeterminate = false;
      checkbox.value.checked = true;
    } else { // false
      checkbox.value.indeterminate = false;
      checkbox.value.checked = false;
    }
  }
}

// Handle three-state checkbox clicks
function handleCheckboxClick() {
  if (props.modelValue === undefined) {
    // From default (indeterminate) to true (checked)
    emit('update:modelValue', true);
  } else if (props.modelValue === true) {
    // From true (checked) to false (unchecked)
    emit('update:modelValue', false);
  } else {
    // From false (unchecked) to default (indeterminate)
    emit('update:modelValue', undefined);
  }
}

// Get display label for state
function getStateLabel() {
  if (props.modelValue === undefined) return '(default)';
  if (props.modelValue === true) return 'True';
  return 'False';
}

// Initialize checkbox state when mounted
onMounted(() => {
  // Use setTimeout to ensure DOM is fully rendered
  setTimeout(() => {
    updateCheckboxState();
  }, 0);
});

// Watch for changes and update checkbox state
watch(() => props.modelValue, () => {
  nextTick(updateCheckboxState);
})
</script>

<style scoped>
/* Import shared CSS variables and ensure consistent height */
.express-control {
  /* These styles are defined in shared.css but we ensure they're applied */
  min-height: var(--compact-input-height);
  height: var(--compact-input-height);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--compact-gap);
  padding: var(--compact-button-padding);
  border: 1px solid #ced4da;
  border-radius: var(--compact-border-radius);
  background: white;
  box-sizing: border-box;
}

.express-control.disabled {
  background: #f8f9fa;
  color: #6c757d;
}

.express-state-label {
  font-size: var(--compact-font-size);
  color: #495057;
  line-height: 1.4;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: visible;
}

.compact-input {
  margin: 0;
  flex-shrink: 0;
  width: calc(var(--compact-font-size) + 2px);
  height: calc(var(--compact-font-size) + 2px);
  min-width: calc(var(--compact-font-size) + 2px);
  min-height: calc(var(--compact-font-size) + 2px);
  align-self: flex-start;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: var(--compact-margin);
  box-sizing: border-box;
}

.option-group label {
  font-weight: 600;
  color: #495057;
  font-size: var(--compact-label-font-size);
  margin-bottom: var(--compact-margin);
  display: block;
}
</style>