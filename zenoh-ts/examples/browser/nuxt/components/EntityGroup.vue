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
  background: #f0f0f0;
  border: 2px outset #c0c0c0;
  border-radius: 0;
  overflow: hidden;
  transition: opacity 0.3s ease;
  font-family: 'MS Sans Serif', sans-serif;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
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
  background: linear-gradient(to bottom, #0054e3, #0054e3 50%, #1e6bc4 50%, #3a7bd4);
  border-bottom: 1px solid #000080;
  font-family: 'MS Sans Serif', sans-serif;
  color: white;
  font-size: var(--compact-label-font-size);
  font-weight: bold;
  text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
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
  background: transparent;
  color: white;
  text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
}

.section-title {
  color: white !important;
  font-size: var(--compact-label-font-size);
  font-weight: bold;
  margin: 0;
  letter-spacing: 0px;
  font-family: 'MS Sans Serif', sans-serif;
  text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
}

.section-content {
  padding: calc(var(--compact-gap) * 1.5); /* 12px with 8px base */
  background: #f0f0f0;
  font-family: 'MS Sans Serif', sans-serif;
}

.entity-block {
  margin-bottom: calc(var(--compact-gap) * 2); /* 16px with 8px base */
  padding: 0;
  background: #f0f0f0;
  font-family: 'MS Sans Serif', sans-serif;
}
</style>
