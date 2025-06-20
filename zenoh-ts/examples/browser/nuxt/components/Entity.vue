<template>
  <div class="entity">
    <div class="entity-edits" :class="{ 'edits-expanded': optionsExpanded }">
      <div class="entity-header">
        <h4>
          {{ title }}
          <span v-if="!optionsExpanded && keyExpr" class="header-keyexpr">
            - {{ keyExpr }}
          </span>
        </h4>
        <div v-if="!optionsExpanded" class="header-actions">
          <slot name="actions" />
          <CollapseButton
            v-if="showOptionsToggle"
            v-model:expanded="optionsExpanded"
          />
        </div>
        <div v-else-if="showOptionsToggle" class="header-actions">
          <CollapseButton v-model:expanded="optionsExpanded" />
        </div>
      </div>
      <div v-if="optionsExpanded && showOptionsToggle" class="options-grid">
        <slot name="options" />
        <div class="expanded-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  keyExpr?: string;
  showOptionsToggle?: boolean;
}

withDefaults(defineProps<Props>(), {
  keyExpr: "",
  showOptionsToggle: true,
});

const optionsExpanded = defineModel<boolean>("optionsExpanded", {
  default: false,
});
</script>

<style scoped>
.entity {
  margin-bottom: var(--compact-gap);
  padding: var(--compact-gap);
  background-color: #f0f0f0;
  border: none;
  border-radius: 0;
  font-family: "MS Sans Serif", sans-serif;
}

/* Entity header */
.entity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--compact-gap);
  position: relative;
  height: 1.5em; /* Fixed height to prevent position changes */
}

.entity-header h4 {
  margin: 0;
  font-size: var(--compact-label-font-size);
  font-weight: bold;
  color: #333;
  font-family: "MS Sans Serif", sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-keyexpr {
  color: #666;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: var(--compact-gap);
  align-items: center;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

/* Options content - styling depends on expanded state */
.entity-edits {
  background: #f0f0f0;
  margin-bottom: var(--compact-gap);
  padding: var(--compact-gap);
  transition: all 0.2s ease;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--compact-gap);
  margin-bottom: var(--compact-gap);
}

/* Action buttons when expanded */
.expanded-actions {
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

/* Match action buttons in expanded actions to title size too */
.expanded-actions :deep(button),
.expanded-actions :deep(.compact-button) {
  font-size: var(--compact-label-font-size) !important;
  height: auto;
  line-height: 1.2;
  padding: var(--compact-margin) var(--compact-padding-v);
}

/* Add spacing between entity-header and any following content */
.entity-header + * {
  margin-top: var(--compact-gap);
}

/* Conditional styling based on fold/unfold status */
/* When folded - no border around entity-edits */
.entity-edits {
  border: none;
}

/* When unfolded - make entity-edits look like embossed out panel */
.edits-expanded {
  border: 2px outset #c0c0c0;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
}
</style>
