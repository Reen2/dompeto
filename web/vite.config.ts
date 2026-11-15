import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,
    includeAssets: ['favicon.png', 'icons/*.png'],
    manifest: {
      name: 'Dompet — Catatan Keuangan Pribadi',
      short_name: 'Dompet',
      description: 'Pencatat keuangan pribadi offline. Semua data tersimpan di perangkatmu.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#FAF8F4',
      theme_color: '#A8813C',
      lang: 'id',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api/],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  })],
  base: '/',
  build: { outDir: 'dist', sourcemap: false },
  server: { port: 5173, host: true },
});