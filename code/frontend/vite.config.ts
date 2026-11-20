import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite-Build-Template §11.1. Ports come only from env (code/ root .env files):
//   VITE_DEV_PORT — port the dev server listens on inside the container
//   FRONTEND_PORT — host-side port the browser uses (HMR websocket)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    port: Number(process.env.VITE_DEV_PORT),
    strictPort: true,
    watch: { usePolling: true },
    hmr: { clientPort: Number(process.env.FRONTEND_PORT) }, // browser-side port
  },
  build: {
    target: 'es2022',
    sourcemap: false, // no source maps shipped to prod
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] } },
    },
  },
});
