<template>
  <div class="option-group option-group-full-width radio-option-group">
    <label>{{ props.label }}:</label>
    <div class="radio-group">
      <label class="radio-option">
        <input 
          type="radio" 
          :name="props.name"
          value="reply" 
          :checked="props.modelValue === 'reply'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Reply</span>
      </label>
      <label class="radio-option">
        <input 
          type="radio" 
          :name="props.name"
          value="replyErr" 
          :checked="props.modelValue === 'replyErr'"
          @change="updateValue"
          :disabled="props.disabled"
        >
        <span>Error</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: 'reply' | 'replyErr'
  disabled?: boolean
  label?: string
  name: string
}

interface Emits {
  (e: 'update:modelValue', value: 'reply' | 'replyErr'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: 'Response Type'
})
const emit = defineEmits<Emits>()

function updateValue(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value as 'reply' | 'replyErr')
}
</script>