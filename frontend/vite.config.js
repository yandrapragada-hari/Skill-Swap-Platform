import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Keep the same port CRA was using to avoid disruption
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // If there's socket.io, we might need to proxy that too, but usually it connects directly or via path
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true,
      }
    }
  }
});
