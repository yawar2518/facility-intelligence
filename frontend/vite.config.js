import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to Django during development
      // So we don't have CORS issues in the browser
      '/api': 'http://localhost:8000',
    }
  }
})