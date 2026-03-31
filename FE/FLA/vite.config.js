import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers?.authorization || req.headers?.Authorization;
            if (auth) {
              proxyReq.setHeader('Authorization', auth);
            }
          });
        },
      },
      "/auth": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
})
