import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (development/production)
  const env = loadEnv(mode, process.cwd(), '')

  // Use env variables with fallbacks
  const apiUrl = env.VITE_API_URL || 'http://localhost:3303'
  const wsUrl = env.VITE_WS_URL || 'ws://localhost:3303'
  const port = parseInt(env.VITE_PORT || '5173', 10)

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        // globPatterns already handles these
        manifest: {
          name: env.VITE_APP_NAME || 'WA Gateway',
          short_name: 'WA Gateway',
          description: 'WhatsApp Gateway Dashboard',
          theme_color: '#16a34a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'id',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port,
      host: '0.0.0.0',
      proxy: {
        '/api': { target: apiUrl, changeOrigin: true },
        '/auth': { target: apiUrl, changeOrigin: true },
        '/dashboard': { target: apiUrl, changeOrigin: true },
        '/ws': { target: wsUrl, ws: true },
      },
    },
  }
})
