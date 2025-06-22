<template>
  <div class="entity-group" :class="[sectionClass, { disabled: disabled }]">
    <div class="section-header">
      <div class="section-header-icon">{{ icon }}</div>
      <div class="section-header-title">{{ title }}</div>
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
