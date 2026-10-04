import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/mucho-cash-helper/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/mucho-cash-helper/',
        name: 'Mucho Cash Helper',
        short_name: 'Mucho Cash',
        description: 'Store ordering, cash and e-transfer checkout for Prince George, BC.',
        start_url: '/mucho-cash-helper/',
        scope: '/mucho-cash-helper/',
        display: 'standalone',
        background_color: '#f7f6f0',
        theme_color: '#224f3e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/mucho-cash-helper/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
})
