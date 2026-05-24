import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const enablePWA = env.VITE_ENABLE_PWA !== 'false'

  return {
    base: './',
    plugins: [
      react(),
      ...(enablePWA
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              devOptions: {
                enabled: true,
              },
              includeAssets: ['robots.txt', 'sitemap.xml', 'icons/icon-192x192.svg', 'icons/icon-512x512.svg'],
              manifest: {
                name: 'Referral Ninja',
                short_name: 'RefNinja',
                description: 'Turn referrals into income',
                theme_color: '#39FF14',
                background_color: '#050B06',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                  {
                    src: '/icons/icon-192x192.svg',
                    sizes: '192x192',
                    type: 'image/svg+xml'
                  },
                  {
                    src: '/icons/icon-512x512.svg',
                    sizes: '512x512',
                    type: 'image/svg+xml',
                    purpose: 'any maskable'
                  }
                ]
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}']
              }
            })
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
