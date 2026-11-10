import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    // Forward API calls to Django (python manage.py runserver), so the browser sees one
    // origin and Django needs no CORS settings in development.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    // mapbox-gl is ~1.9 MB but is its own lazy chunk, loaded only on a building's page
    // when a token is set. The search page does not download it.
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
