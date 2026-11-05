import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 lo usa otro proyecto local; strictPort evita que Vite salte a otro puerto en silencio
    port: 5174,
    strictPort: true,
    // Las llamadas a /api se redirigen al backend
    proxy: { '/api': 'http://localhost:3001' },
  },
});
