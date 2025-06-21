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
        <div class="header-actions">
          <slot name="actions" />
          <CollapseButton
            v-if="$slots['info']"
            v-model:expanded="infoExpanded"
            collapsed-text="Info..."
            expanded-text="Close info"
          />
          <CollapseButton
            v-if="$slots['options']"
            v-model:expanded="optionsExpanded"
          />
        </div>
      </div>
      <div v-if="optionsExpanded && $slots['options']" class="options-grid">
        <slot name="options" />
      </div>
    </div>

    <!-- Default slot for general content -->
    <slot />

    <!-- Info section -->
    <div v-if="$slots['info'] && infoExpanded" class="info-section">
      <slot name="info" />
    </div>

    <!-- Special slot for sub-entities -->
    <div v-if="$slots['sub-entities']" class="sub-entities">
      <slot name="sub-entities" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  keyExpr?: string;
}

defineProps<Props>();

const optionsExpanded = defineModel<boolean>("optionsExpanded", {
  default: false,
});

const infoExpanded = ref(false);
</script>

<style scoped>
/* Layout controlled by CSS variables - themes can override these */
.entity {
  display: var(--layout-entity-display);
  margin-bottom: var(--compact-gap);
  padding: var(--compact-gap);
}

.entity-header {
  display: var(--layout-entity-header-display);
  flex-direction: var(--layout-entity-header-direction);
  justify-content: var(--layout-entity-header-justify);
  align-items: var(--layout-entity-header-align);
  margin-bottom: var(--compact-gap);
  position: relative;
  min-height: 1.5em;
}

.entity-header h4 {
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: var(--layout-actions-display);
  flex-direction: var(--layout-actions-direction);
  gap: var(--layout-actions-gap);
  align-items: center;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.entity-edits {
  margin-bottom: var(--compact-gap);
  padding: var(--compact-gap);
}

.options-grid {
  display: var(--layout-options-display);
  grid-template-columns: var(--layout-options-columns);
  gap: var(--compact-gap);
  margin-bottom: var(--compact-gap);
}

.entity-header + * {
  margin-top: var(--compact-gap);
}

.sub-entities {
  margin-top: var(--compact-gap);
  padding-top: var(--compact-gap);
}

.sub-entities .entity {
  margin-bottom: calc(var(--compact-gap) * 0.75);
}

.info-section {
  margin-top: var(--compact-gap);
  padding: var(--compact-gap);
}
</style>
