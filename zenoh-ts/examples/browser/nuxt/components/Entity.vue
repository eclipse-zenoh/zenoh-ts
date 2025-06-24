<template>
  <div class="entity">
    <!-- Wrapper to make header and actions share horizontal space -->
    <div class="entity-header">
      <div class="entity-title">
        {{ title }}
      </div>
      <div v-if=" descr" class="entity-descr">
        - {{ descr }}
      </div>

      <!-- Entity actions - separate but sharing horizontal space -->
      <div class="entity-actions">
        <CheckButton
          v-if="$slots['info']"
          v-model:pressed="infoExpanded"
          label="Info..."
        />
        <CheckButton
          v-if="$slots['edits']"
          v-model:pressed="editsExpanded"
          label="Edit..."
        />
        <slot name="actions" />
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
  descr?: string;
}

defineProps<Props>();

const editsExpanded = defineModel<boolean>("editsExpanded", {
  default: false,
});

const infoExpanded = ref(false);
</script>
