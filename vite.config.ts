import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Intake Panel',
        short_name: 'Intake',
        start_url: '/?source=pwa',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0ea5e9',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: '餐前打卡', url: '/?quick=pre', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] },
          { name: '记录活动', url: '/?quick=activity', icons: [{ src: '/pwa-192.png', sizes: '192x192' }] }
        ]
      }
    })
  ]
})
