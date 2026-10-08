import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: env.BACKEND_URL || process.env.BACKEND_URL || 'https://pos.sonaribd.com',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[vite] http proxy error:', err.message);
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  message: 'Backend connection unavailable',
                  error: err.message
                }));
              }
            });
          }
        }
      }
    },
  };
});
