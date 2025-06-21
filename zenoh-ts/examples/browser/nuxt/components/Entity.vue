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
/* Minimal functional styles only */
.entity {
  margin-bottom: 8px;
  padding: 8px;
}

.entity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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
  display: flex;
  gap: 8px;
  align-items: center;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.entity-edits {
  margin-bottom: 8px;
  padding: 8px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.entity-header + * {
  margin-top: 8px;
}

.sub-entities {
  margin-top: 8px;
  padding-top: 8px;
}

.sub-entities .entity {
  margin-bottom: 6px;
}

.info-section {
  margin-top: 8px;
  padding: 8px;
}
</style>
