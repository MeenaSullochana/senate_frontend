import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pin a dedicated port so another project's Vite (often 5173/5180) does not steal ours.
// Use 127.0.0.1 so the proxy does not hit IPv6 ::1 and get ECONNREFUSED.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5288,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
