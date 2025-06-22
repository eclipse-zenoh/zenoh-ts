<template>
  <div class="entity">
    <!-- Entity header - now at same level as entity-edits -->
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

    <!-- Options grid - now at same level as entity-header -->
    <div v-if="optionsExpanded && $slots['options']" class="entity-edits">
      <slot name="options" />
    </div>

    <!-- Default slot for general content -->
    <slot />

    <!-- Info section - now at same level as others -->
    <div v-if="$slots['info'] && infoExpanded" class="entity-info">
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
