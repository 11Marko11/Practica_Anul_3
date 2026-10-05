import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8443,
    // In development the API runs locally (`npm run dev` in server/); in production Vercel forwards /api (see vercel.json).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
