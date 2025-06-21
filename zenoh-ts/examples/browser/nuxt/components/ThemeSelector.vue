<template>
  <div class="theme-selector">
    <label for="theme-select">Theme:</label>
    <select 
      id="theme-select"
      :value="currentTheme" 
      @change="handleThemeChange"
      class="theme-select"
    >
      <option 
        v-for="theme in availableThemes" 
        :key="theme.name" 
        :value="theme.name"
      >
        {{ theme.displayName }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { ThemeName } from '~/composables/useTheme'

const { currentTheme, setTheme, getAvailableThemes, initTheme } = useTheme()

const availableThemes = getAvailableThemes()

const handleThemeChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  const themeName = target.value as ThemeName
  await setTheme(themeName)
}

// Initialize theme on mount
onMounted(() => {
  initTheme()
})
</script>

<style scoped>
.theme-selector {
  display: flex;
  align-items: center;
  gap: var(--compact-gap);
  padding: var(--compact-gap);
  border: var(--compact-border-width) solid;
  font-size: var(--compact-font-size);
}

.theme-select {
  padding: calc(var(--compact-gap) / 4) calc(var(--compact-gap) / 2);
  border: var(--compact-border-width) solid;
  font-size: var(--compact-font-size);
  min-width: calc(var(--compact-input-height) * 6);
}

.theme-select:focus {
  outline: var(--compact-border-width) solid;
}
</style>
