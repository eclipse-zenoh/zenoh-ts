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
