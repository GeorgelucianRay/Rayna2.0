// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // rămâne cum ai: afișezi prompt când există update
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        // ✅ UNICA schimbare: mărim limita de fișiere ce pot fi precached
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Rayna2.0',
        short_name: 'Rayna',
        description: 'Tu transportista virtual.',
        theme_color: '#111827',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        scope: '/',
        icons: [
          { src: '192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
})