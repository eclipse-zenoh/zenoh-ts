// https://nuxt.com/docs/api/configuration/nuxt-config
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  // SSR can be enabled, but we'll use client-only rendering for Zenoh components
  ssr: true,
  typescript: {
    typeCheck: true,
    strict: true
  },
  vite: {
    plugins: [
      wasm(),
      topLevelAwait()
    ],
    server: {
      fs: {
        allow: ['..']
      }
    },
    // Exclude Zenoh from SSR bundling
    ssr: {
      noExternal: []
    },
    optimizeDeps: {
    }
  },
  nitro: {
    experimental: {
      wasm: true
    }
  },
  // Build configuration for better WASM support
  build: {
    transpile: []
  }
})
