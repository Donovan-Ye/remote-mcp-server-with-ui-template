import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    devSourcemap: true,
  },
  root: path.resolve(__dirname),
  publicDir: 'public',
  base: '/ui',
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
