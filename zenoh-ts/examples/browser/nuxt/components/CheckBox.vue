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
  threeState?: boolean // If true, supports 3-state (true/false/undefined), if false, only 2-state (true/false)
}

interface Emits {
  (e: 'update:modelValue', value: boolean | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  threeState: true
})
const emit = defineEmits<Emits>()

const checkbox = ref<HTMLInputElement>()

// Update checkbox state when the value changes
function updateCheckboxState() {
  if (checkbox.value) {
    const value = props.modelValue;
    if (value === undefined) {
      checkbox.value.indeterminate = props.threeState;
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

// Handle checkbox clicks for both 2-state and 3-state modes
function handleCheckboxClick() {
  if (props.threeState) {
    // Three-state behavior
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
  } else {
    // Two-state behavior
    if (props.modelValue === true || props.modelValue === undefined) {
      emit('update:modelValue', false);
    } else {
      emit('update:modelValue', true);
    }
  }
}

// Get display label for state
function getStateLabel() {
  if (props.threeState) {
    if (props.modelValue === undefined) return '(default)';
    if (props.modelValue === true) return 'True';
    return 'False';
  } else {
    // For 2-state mode, treat undefined as false
    return props.modelValue === true ? 'True' : 'False';
  }
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