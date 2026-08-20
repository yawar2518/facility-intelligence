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
      // The public status page is server-rendered by Django itself
      // (apps.monitoring.status_views.PublicStatusView), not a React
      // route — proxy it too so the sidebar's relative link resolves to
      // it instead of falling through to the SPA. Deliberately NOT
      // '/status' — that's already the SPA's own Status Grid route, and
      // Vite's proxy matches by path prefix, so the two would collide.
      '/public-status': 'http://localhost:8000',
    }
  }
})