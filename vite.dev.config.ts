import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple development configuration without any GitHub Pages specific settings
export default defineConfig({
  plugins: [react()],
  // Use root path for development
  base: '/',
  server: {
    // Open browser automatically
    open: true
  },
  // Specifically override the default entry point for development
  optimizeDeps: {
    entries: ['dev.html']
  },
  build: {
    rollupOptions: {
      input: {
        main: 'dev.html'
      }
    }
  }
}) 