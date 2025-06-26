<template>
  <div class="entity-group" :class="[sectionClass, { disabled: disabled }]">
    <!-- Wrapper to make header and actions share horizontal space -->
    <div class="section-header">
      <div class="section-icon">{{ icon }}</div>
      <div class="section-title">{{ title }}</div>
      
      <!-- Section actions - separate but sharing horizontal space -->
      <div v-if="$slots['actions']" class="section-actions">
        <slot name="actions" />
      </div>
    </div>
    
    <div class="section-content">
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
interface Props {
  title: string
  icon: string
  sectionClass?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  sectionClass: '',
  disabled: false
})
</script>
