import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/gsheets': {
        target: 'https://script.google.com/macros/s/AKfycbxntT9GG5ZKlQl2_vNNQmaoy9G8fTxVx3dGg933R4qnB5bwjNzBVDnvCJTnRWthQb1g7g/exec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gsheets/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://script.google.com');
          });
        }
      }
    }
  }
})