import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
  ],
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  define: {
    'process.env.API_KEY': JSON.stringify('PROXY_MODE'),
    'process.env.GEMINI_API_KEY': JSON.stringify('PROXY_MODE')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
