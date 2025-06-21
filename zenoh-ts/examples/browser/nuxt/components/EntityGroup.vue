<template>
  <div class="entity-group" :class="[sectionClass, { disabled: disabled }]">
    <div class="section-header">
      <div class="section-icon">{{ icon }}</div>
      <h3 class="section-title">{{ title }}</h3>
    </div>
    <div class="section-content">
      <div class="entity-block">
        <slot />
      </div>
    </div>
  </div>
</template>

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

<style scoped>
.entity-group {
  margin-bottom: calc(var(--compact-gap) * 3.75); /* 30px with 8px base */
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.entity-group.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: calc(var(--compact-gap) * 1.5); /* 12px with 8px base */
  padding: var(--compact-margin) var(--compact-gap);
  font-size: var(--compact-label-font-size);
}

.section-icon {
  font-size: calc(var(--compact-label-font-size) * 1.23); /* ~16px with 13px base */
  width: calc(var(--compact-label-font-size) * 1.23);
  height: calc(var(--compact-label-font-size) * 1.23);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0;
}

.section-title {
  font-size: var(--compact-label-font-size);
  margin: 0;
  letter-spacing: 0px;
}

.section-content {
  padding: calc(var(--compact-gap) * 1.5); /* 12px with 8px base */
}

.entity-block {
  margin-bottom: calc(var(--compact-gap) * 2); /* 16px with 8px base */
  padding: 0;
}
</style>
