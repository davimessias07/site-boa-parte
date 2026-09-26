import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 127.0.0.1 e não "localhost": no Windows "localhost" tenta IPv6 primeiro e cada requisição
// do proxy esperava ~100 ms+ antes de cair no IPv4 (imagens demoravam a aparecer).
const api = 'http://127.0.0.1:3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // data/ tem milhares de fotos + o banco: vigiar isso só gasta CPU (e trava o dev server na sincronização).
    watch: { ignored: ['**/data/**', '**/dist/**'] },
    proxy: {
      '/api': api,
      '/uploads': api,
    },
  },
  // `vite preview --outDir publicar` simula a Vercel: sem proxy, /uploads e /dados são arquivos da pasta.
  preview: { proxy: {} },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules[\/](react|react-dom|react-router|scheduler|@tanstack)[\/]/ }],
        },
      },
    },
  },
})
