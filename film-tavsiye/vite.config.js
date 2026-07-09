import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages: /Finansal-rehber/perde/
  base: process.env.VITE_BASE || './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Perde — Film Tavsiyesi',
        short_name: 'Perde',
        description: 'Moduna göre, zevkine özel film önerisi',
        theme_color: '#0c0a09',
        background_color: '#0c0a09',
        display: 'standalone',
        start_url: './',
        lang: 'tr',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
