<template>
  <div class="entity">
    <!-- Wrapper to make header and actions share horizontal space -->
    <div class="entity-header-row">
      <div class="entity-header">
        <div class="entity-header-title">
          {{ title }}
        </div>
        <div v-if="!editsExpanded && keyExpr" class="entity-header-keyexpr">
          - {{ keyExpr }}
        </div>
      </div>

      <!-- Entity actions - separate but sharing horizontal space -->
      <div class="entity-actions">
        <slot name="actions" />
        <CollapseButton
          v-if="$slots['info']"
          v-model:expanded="infoExpanded"
          collapsed-text="Info..."
          expanded-text="Close info"
        />
        <CollapseButton
          v-if="$slots['edits']"
          v-model:expanded="editsExpanded"
        />
      </div>
    </div>

    <!-- Entity edits - now at same level as entity-header -->
    <div v-if="editsExpanded && $slots['edits']" class="entity-edits">
      <slot name="edits" />
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

const editsExpanded = defineModel<boolean>("editsExpanded", {
  default: false,
});

const infoExpanded = ref(false);
</script>
