import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Langflow Stage2 생성(15~60s+) — 기본 proxy timeout 초과 방지
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
});
