import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/donors': 'http://localhost:3001',
      '/donations': 'http://localhost:3001',
      '/email': 'http://localhost:3001',
      '/upload': 'http://localhost:3001',
    },
  },
});
