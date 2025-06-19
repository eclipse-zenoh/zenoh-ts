<template>
  <div class="operation-group">
    <div class="operation-header">
      <h4>
        {{ title }}
        <span v-if="!optionsExpanded && keyExpr" class="header-keyexpr">
          - {{ keyExpr }}
        </span>
      </h4>
      <div class="header-actions">
        <CollapseButton
          v-if="showOptionsToggle"
          collapsedText="Edit..."
          expandedText="Close edit"
          v-model:expanded="optionsExpanded"
        />
        <slot name="actions" />
      </div>
    </div>
    
    <!-- Options Panel -->
    <div v-if="optionsExpanded && showOptionsToggle" class="options-panel">
      <div class="options-grid">
        <slot name="options" />
      </div>
    </div>
    
    <!-- Default content slot -->
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  keyExpr?: string
  showOptionsToggle?: boolean
}

withDefaults(defineProps<Props>(), {
  keyExpr: '',
  showOptionsToggle: true
})

const optionsExpanded = defineModel<boolean>('optionsExpanded', { default: false })
</script>

<style scoped>
.operation-group {
  margin-bottom: 12px;
  padding: var(--compact-gap, 8px);
  background-color: #f0f0f0;
  border: none;
  border-radius: 0;
  font-family: 'MS Sans Serif', sans-serif;
}

.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--compact-gap, 8px);
}

.operation-header h4 {
  margin: 0;
  font-size: 11px;
  font-weight: bold;
  color: #333;
  font-family: 'MS Sans Serif', sans-serif;
}

.header-keyexpr {
  color: #666;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: var(--compact-gap, 8px);
  align-items: center;
}

.options-panel {
  margin-top: var(--compact-gap, 8px);
  padding: var(--compact-gap, 8px);
  background: #e0e0e0;
  border: 1px inset #c0c0c0;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--compact-gap, 8px);
}

/* Add spacing between operation-header and any following content */
.operation-header + * {
  margin-top: var(--compact-gap, 8px);
}
</style>
