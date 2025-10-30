// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        // ce se precache-uiește la build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB

        // ⬇️ IMPORTANT: cum servim resurse .glb / .wasm la runtime
        runtimeCaching: [
          {
            // toate fișierele .glb (model glTF binar)
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            // NetworkFirst evită să rămâi cu 404 din cache; poți schimba în 'CacheFirst' după ce confirmi că merge
            handler: 'NetworkFirst',
            options: {
              cacheName: 'glb-models',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 zile
            },
          },
          {
            // dacă vei folosi DRACO (decoder .wasm)
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-decoders',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 zile
            },
          },
        ],

        // ⬇️ Previne navigation fallback (app-shell) pe rutele către modele
        // (protejăm /models/ ca să nu primească index.html din SW)
        navigateFallbackDenylist: [/^\/models\//],
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