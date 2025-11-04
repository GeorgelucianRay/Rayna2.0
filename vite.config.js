// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 🔴 rămâne cum ți-ai dorit: utilizatorul e întrebat la update
      registerType: 'prompt',
      injectRegister: 'auto',

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
        // (opțional) schimbă versiunea când faci release ca să grăbești update-urile
        // version: '1.0.8',
        icons: [
          { src: '192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },

      workbox: {
        // ✅ precache corect al bundle-ului din dist (elimină warning-ul)
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB

        // ✅ SPA fallback → nu mai ai ecran alb offline/cold-start
        navigateFallback: '/index.html',

        // ✅ curățăm cache-urile vechi la update
        cleanupOutdatedCaches: true,

        // (în mod normal, cu `prompt` lași aceste două pe false,
        // dar le poți porni dacă vrei ca noul SW să preia instant)
        // clientsClaim: true,
        // skipWaiting: true,

        // 🔴 runtimeCaching păstrat exact cum l-ai cerut
        runtimeCaching: [
          {
            // .glb (modele glTF)
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'NetworkFirst', // pentru a evita 404 din cache când modelul se schimbă
            options: {
              cacheName: 'glb-models',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 zile
            },
          },
          {
            // .wasm (de ex. DRACO)
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-decoders',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 zile
            },
          },
        ],

        // 🔴 păstrăm denylist-ul pentru a nu servi app-shell pe rutele către modele
        navigateFallbackDenylist: [/^\/models\//],
      },

      devOptions: {
        enabled: false,
      }
    })
  ]
});