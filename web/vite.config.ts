import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../cmd/server/web/dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 51234,
    proxy: {
      '/api': {
        target: 'http://localhost:51235',
        changeOrigin: true,
      },
    },
  },
})