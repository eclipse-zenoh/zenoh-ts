<template>
  <div class="operation-group" :class="{ 'dialog-mode': optionsExpanded && showOptionsToggle }">
    <!-- Single header that transforms based on state -->
    <div class="operation-header" :class="{ 'dialog-title-bar': optionsExpanded && showOptionsToggle }">
      <h4 :class="{ 'dialog-title': optionsExpanded && showOptionsToggle }">
        {{ title }}
        <span v-if="!optionsExpanded && keyExpr" class="header-keyexpr">
          - {{ keyExpr }}
        </span>
      </h4>
      <div class="header-actions">
        <!-- Action buttons - hidden when dialog is expanded -->
        <template v-if="!optionsExpanded || !showOptionsToggle">
          <slot name="actions" />
        </template>
        <!-- CollapseButton on the right -->
        <CollapseButton
          v-if="showOptionsToggle"
          v-model:expanded="optionsExpanded"
        />
      </div>
    </div>
    
    <!-- Options content that appears below header when expanded -->
    <div v-if="optionsExpanded && showOptionsToggle" class="dialog-content">
      <div class="options-grid">
        <slot name="options" />
      </div>
      
      <!-- Action buttons at bottom -->
      <div class="dialog-actions">
        <slot name="actions" />
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
  margin-bottom: var(--compact-gap);
  padding: var(--compact-gap);
  background-color: #f0f0f0;
  border: none;
  border-radius: 0;
  font-family: 'MS Sans Serif', sans-serif;
}

/* Dialog mode styling */
.operation-group.dialog-mode {
  padding: 0;
  background: transparent;
}

/* Operation header - transforms into dialog title bar when in dialog mode */
.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--compact-gap);
  transition: all 0.2s ease;
}

/* When in dialog mode, the header becomes the title bar */
.operation-header.dialog-title-bar {
  margin-bottom: 0;
  padding: var(--compact-margin) var(--compact-gap);
  background: linear-gradient(to bottom, #0054e3, #0054e3 50%, #1e6bc4 50%, #3a7bd4);
  border-bottom: 1px solid #000080;
  color: white;
  border-top: 2px outset #c0c0c0;
  border-left: 2px outset #c0c0c0;
  border-right: 2px outset #c0c0c0;
}

.operation-header h4 {
  margin: 0;
  font-size: var(--compact-label-font-size);
  font-weight: bold;
  color: #333;
  font-family: 'MS Sans Serif', sans-serif;
  transition: color 0.2s ease;
}

/* Title styling when in dialog mode */
.dialog-title {
  color: white !important;
  text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
}

.header-keyexpr {
  color: #666;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: var(--compact-gap);
  align-items: center;
}

/* Dialog content area */
.dialog-content {
  padding: var(--compact-gap);
  background: #f0f0f0;
  border-left: 2px outset #c0c0c0;
  border-right: 2px outset #c0c0c0;
  border-bottom: 2px outset #c0c0c0;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--compact-gap);
  margin-bottom: var(--compact-gap);
}

/* Action buttons at bottom of dialog */
.dialog-actions {
  display: flex;
  gap: var(--compact-gap);
  justify-content: flex-end;
  padding-top: var(--compact-gap);
  border-top: 1px solid #c0c0c0;
  margin-top: var(--compact-gap);
}

/* Match button sizes to title size using shared variables */
.header-actions :deep(button),
.header-actions :deep(.compact-button) {
  font-size: var(--compact-label-font-size) !important;
  height: auto;
  line-height: 1.2;
  padding: var(--compact-margin) var(--compact-padding-v);
}

/* Specific styling for CollapseButton in header */
.header-actions :deep(.collapse-button) {
  font-size: var(--compact-label-font-size) !important;
  height: auto;
  min-height: auto;
  padding: var(--compact-margin) var(--compact-margin);
}

/* Ensure triangle symbols match title size */
.header-actions :deep(.button-triangle) {
  font-size: var(--compact-label-font-size) !important;
}

/* Match action buttons in dialog actions to title size too */
.dialog-actions :deep(button),
.dialog-actions :deep(.compact-button) {
  font-size: var(--compact-label-font-size) !important;
  height: auto;
  line-height: 1.2;
  padding: var(--compact-margin) var(--compact-padding-v);
}

/* Add spacing between operation-header and any following content */
.operation-header + * {
  margin-top: var(--compact-gap);
}

/* Override spacing when in dialog mode */
.operation-header.dialog-title-bar + * {
  margin-top: 0;
}
</style>
