import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Trois cibles :
 *  - `dev` / `build`          → site classique (Vercel, serveur local)
 *  - `build --mode pages`     → GitHub Pages, servi sous /<nom-du-depot>/
 *  - `build --mode fichier`   → un seul fichier, tout en ligne (voir
 *                               scripts/build-fichier-unique.mjs)
 */
export default defineConfig(({ mode }) => {
  const fichierUnique = mode === 'fichier'
  return {
    base: mode === 'pages' ? (process.env.BASE_PAGES ?? '/') : '/',
    plugins: [react(), tailwindcss()],
    server: { port: 5173, host: true },
    build: {
      outDir: fichierUnique ? 'dist-fichier' : 'dist',
      cssCodeSplit: !fichierUnique,
      assetsInlineLimit: fichierUnique ? 100_000_000 : 4096,
      chunkSizeWarningLimit: fichierUnique ? 4000 : 900,
      rollupOptions: fichierUnique
        ? {
            output: {
              inlineDynamicImports: true,
              entryFileNames: 'bundle.js',
              assetFileNames: 'bundle[extname]',
            },
          }
        : undefined,
    },
  }
})
