import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site at https://<username>.github.io/<repo-name>/,
// so every built asset URL needs that repo name as a prefix — otherwise the
// deployed site tries to load its JS/CSS/icons from the domain root and 404s.
// If your GitHub repo isn't named "one64garage", change this to match it
// exactly (with leading and trailing slashes).
const BASE_PATH = '/one64garage/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker updates and activates automatically in the background;
      // the app prompts for a reload once a new version is ready rather than
      // silently swapping code out from under an open session.
      // Registration is handled manually in main.jsx (via virtual:pwa-register)
      // so a friendly "update available" prompt can be shown, instead of the
      // plugin's silently auto-injected registration script.
      injectRegister: false,

      // Everything vite-plugin-pwa needs to know to build a correct offline
      // app shell: HTML, JS/CSS bundles, and every icon in public/icons.
      includeAssets: ['icons/*.png'],

      manifest: {
        name: 'one64garage',
        short_name: 'one64garage',
        description: 'A personal automotive journal linking a 1:64 diecast collection with Gran Turismo driving notes.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        // Not locked to portrait or landscape — the Garage/Journal/Take Out
        // pages are portrait-first, but Drive Mode is a dedicated landscape
        // experience, so the manifest shouldn't fight either one.
        orientation: 'any',
        background_color: '#121314',
        theme_color: '#121314',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // The app shell — precached on first visit so the app opens with no
        // network at all afterwards.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          // Google Fonts: cache-first so typography survives offline after
          // the first successful load, instead of silently falling back to
          // system fonts every time there's no connection.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Vehicle/GT7 data lookups are live, on-demand reference tools —
          // deliberately NOT cached, since stale car specs or a stale GT7
          // car list would be actively misleading rather than helpful.
        ],
      },

      devOptions: {
        // Lets `npm run dev` register a service worker too, so offline
        // behaviour can be tested locally without a full build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
