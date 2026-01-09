<template>
  <div class="entity-group" :class="[sectionClass, { disabled: disabled }]">
    <!-- Wrapper to make header and actions share horizontal space -->
    <div class="section-header">
      <div class="section-icon">{{ icon }}</div>
      <div class="section-title">{{ title }}</div>

      <!-- Section actions - separate but sharing horizontal space -->
      <div v-if="$slots['actions'] || props.collapsible" class="section-actions">
        <slot name="actions" />
        <!-- Fold/Unfold button (always present if foldable) -->
        <CheckButton
          v-if="props.collapsible"
          :pressed="props.collapsed ?? false"
          @update:pressed="emit('update:collapsed', $event)"
        />
      </div>
    </div>

    <div v-if="!props.collapsed" class="section-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>

<script setup lang="ts">
import CheckButton from './CheckButton.vue'

interface Props {
  title: string
  icon: string
  sectionClass?: string
  disabled?: boolean
  collapsed?: boolean
  collapsible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sectionClass: '',
  disabled: false,
  collapsible: false
})

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void
}>()
</script>
