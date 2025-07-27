import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}']
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Rayna2.0',
        short_name: 'Rayna',
        description: 'Tu transportista virtual.',
        theme_color: '#111827', // Culoarea barei de sus a aplicației
        background_color: '#ffffff', // Culoarea ecranului de încărcare
        start_url: '/',
        display: 'standalone', // Face aplicația să arate ca una nativă
        scope: '/',
        icons: [
          {
            src: '192x192.png', // Corectat pentru a se potrivi cu fișierul dumneavoastră
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '512x512.png', // Corectat pentru a se potrivi cu fișierul dumneavoastră
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '512x512.png', // Corectat pentru a se potrivi cu fișierul dumneavoastră
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
