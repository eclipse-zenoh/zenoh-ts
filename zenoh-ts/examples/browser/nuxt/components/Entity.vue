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
            v-if="props.parametersData"
            v-model:expanded="parametersExpanded"
            collapsed-text="Info..."
            expanded-text="Close info"
          />
          <CollapseButton
            v-if="$slots['options']"
            v-model:expanded="optionsExpanded"
          />
        </div>
        <div v-else-if="$slots['options']" class="header-actions">
          <CollapseButton
            v-if="props.parametersData"
            v-model:expanded="parametersExpanded"
            collapsed-text="Info..."
            expanded-text="Close info"
          />
          <CollapseButton v-model:expanded="optionsExpanded" />
        </div>
      </div>
      <div v-if="optionsExpanded && $slots['options']" class="options-grid">
        <slot name="options" />
        <div class="expanded-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!-- Default slot for general content -->
    <slot />

    <!-- Parameters section -->
    <div
      v-if="props.parametersData && parametersExpanded"
      class="parameters-section"
    >
      <ParameterDisplay type="neutral" :data="props.parametersData" />
    </div>

    <!-- Special slot for sub-entities -->
    <div v-if="$slots['sub-entities']" class="sub-entities">
      <slot name="sub-entities" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ParameterDisplay from "./ParameterDisplay.vue";

interface Props {
  title: string;
  keyExpr?: string;
  parametersData?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  keyExpr: "",
});

const optionsExpanded = defineModel<boolean>("optionsExpanded", {
  default: false,
});

const parametersExpanded = ref(false);
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

/* Sub-entities styling */
.sub-entities {
  margin-top: var(--compact-gap);
  padding-top: var(--compact-gap);
  border-top: 1px solid #d0d0d0;
}

/* Nested entity styling for sub-entities */
.sub-entities .entity {
  background-color: #f8f8f8;
  border: 1px solid #d0d0d0;
  margin-bottom: calc(var(--compact-gap) * 0.75);
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
}

.sub-entities .entity .entity-header h4 {
  font-size: calc(var(--compact-label-font-size) * 0.9);
  color: #555;
}

.sub-entities .entity .header-keyexpr {
  font-size: calc(var(--compact-label-font-size) * 0.8);
  color: #777;
}

/* Parameters section styling */
.parameters-section {
  margin-top: var(--compact-gap);
  padding: var(--compact-gap);
  background-color: #c0c0c0;
  border: 2px inset #c0c0c0;
  border-radius: 0;
  font-family: "MS Sans Serif", sans-serif;
}
</style>
