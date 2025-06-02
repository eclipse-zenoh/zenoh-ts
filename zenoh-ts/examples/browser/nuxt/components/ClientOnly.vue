<template>
  <div v-if="mounted">
    <slot />
  </div>
  <div v-else-if="$slots['fallback']">
    <slot name="fallback" />
  </div>
</template>

<script setup lang="ts">
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})
</script>
