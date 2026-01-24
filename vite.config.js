// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',

      // ✅ Actualizat: includem fișierele din noul folder icons
      includeAssets: ['icons/ios/32.png', 'icons/ios/180.png', 'icons/android/android-launchericon-512-512.png'],
      
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
          // ✅ Android Icons
          {
            src: 'icons/android/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          // ✅ Windows Icons (Am adăugat una principală de Windows din lista ta)
          {
            src: 'icons/windows11/Square150x150Logo.scale-100.png',
            sizes: '150x150',
            type: 'image/png'
          }
        ]
      },

      workbox: {
        globDirectory: 'dist',
        // ✅ Ne asigurăm că Workbox scanează și folderul icons
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'glb-models',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-decoders',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/models\//],
      },

      devOptions: {
        enabled: false,
      }
    })
  ]
});