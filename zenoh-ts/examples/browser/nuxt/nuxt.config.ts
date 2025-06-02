// https://nuxt.com/docs/api/configuration/nuxt-config
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  ssr: false, // Disable SSR to avoid WASM issues on server side
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
    }
  },
  nitro: {
    experimental: {
      wasm: true
    }
  }
})
