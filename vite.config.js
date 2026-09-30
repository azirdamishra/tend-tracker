import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwards to the Express dev server (`npm run dev:server`) so
      // storage-shim.ts's relative fetch('/api/...') calls work in dev too.
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:3001',
    },
  },
})
