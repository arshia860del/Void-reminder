import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'serve-zip-file',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const cleanUrl = req.url?.split('?')[0] || '';
            if (cleanUrl.endsWith('.zip')) {
              const filename = path.basename(cleanUrl);
              const zipPath = path.resolve(__dirname, 'public', filename);
              const fallbackZip = path.resolve(__dirname, 'public/void-reminder-bot.zip');
              const finalPath = fs.existsSync(zipPath) ? zipPath : (fs.existsSync(fallbackZip) ? fallbackZip : null);
              if (finalPath) {
                const stat = fs.statSync(finalPath);
                res.writeHead(200, {
                  'Content-Type': 'application/zip',
                  'Content-Length': stat.size,
                  'Content-Disposition': `attachment; filename="${path.basename(finalPath)}"`,
                  'Cache-Control': 'no-cache',
                });
                fs.createReadStream(finalPath).pipe(res);
                return;
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
