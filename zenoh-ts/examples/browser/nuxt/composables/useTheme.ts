import { ref } from 'vue'

export type ThemeName = 'none' | 'boxed' | 'windows95'

interface Theme {
  name: string
  displayName: string
  cssFile: string
}

const themes: Record<ThemeName, Theme> = {
  none: {
    name: 'none',
    displayName: 'None',
    cssFile: '/themes/none.css'
  },
  boxed: {
    name: 'boxed',
    displayName: 'Boxed',
    cssFile: '/themes/boxed.css'
  },
  windows95: {
    name: 'windows95',
    displayName: 'Windows 95',
    cssFile: '/themes/windows95.css'
  }
}

const currentTheme = ref<ThemeName>('windows95')
let currentThemeLink: HTMLLinkElement | null = null

const loadTheme = async (themeName: ThemeName) => {
  if (import.meta.client) {
    // Remove existing theme link
    if (currentThemeLink) {
      currentThemeLink.remove()
      currentThemeLink = null
    }

    // Add new theme link
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = themes[themeName].cssFile
    link.dataset['theme'] = themeName
    document.head.appendChild(link)
    currentThemeLink = link

    // Wait for the stylesheet to load
    return new Promise<void>((resolve) => {
      link.onload = () => resolve()
      link.onerror = () => resolve() // Still resolve on error to not block
    })
  }
}

export const useTheme = () => {
  const setTheme = async (themeName: ThemeName) => {
    currentTheme.value = themeName
    await loadTheme(themeName)
    
    // Store in localStorage
    if (import.meta.client) {
      localStorage.setItem('selectedTheme', themeName)
    }
  }

  const initTheme = async () => {
    if (import.meta.client) {
      // Load theme from localStorage or default
      const savedTheme = localStorage.getItem('selectedTheme') as ThemeName
      const themeToLoad = savedTheme && themes[savedTheme] ? savedTheme : 'windows95'
      await setTheme(themeToLoad)
    }
  }

  const getAvailableThemes = () => {
    return Object.values(themes)
  }

  const getCurrentTheme = () => currentTheme.value
  const getCurrentThemeDisplay = () => themes[currentTheme.value]?.displayName || 'Unknown'

  return {
    currentTheme: readonly(currentTheme),
    setTheme,
    initTheme,
    getAvailableThemes,
    getCurrentTheme,
    getCurrentThemeDisplay
  }
}
