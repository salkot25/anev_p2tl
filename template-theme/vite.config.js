import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Static files pre-caching for offline capabilities
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // Caching strategies for API and external files
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      // Web manifest metadata for PWA installation
      manifest: {
        name: 'Enterprise Web Application',
        short_name: 'EnterpriseApp',
        description: 'Premium Enterprise Dashboard Template with React, Vite, and Tailwind CSS.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#2563eb',
        orientation: 'portrait-primary',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'logo.png',
            sizes: 'any',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  base: '/',
})
