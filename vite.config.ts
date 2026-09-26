import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Bộ hình Sprout Lands nằm trong assets/ và được phục vụ ở gốc trang (vd. /Characters/...).
// Giấy phép không cho phát tán lại bộ hình: đừng đưa thư mục này lên repo/public công khai.

/** Chép các file PWA (manifest, service worker, icon tự vẽ) trong pwa/ ra gốc trang. */
function pwa(): Plugin {
  const dir = new URL('./pwa/', import.meta.url);
  const files = readdirSync(dir);
  return {
    name: 'pwa-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].slice(1);
        if (!name || !files.includes(name) || name === 'sw.js') return next(); // dev: không bật service worker
        res.setHeader('Content-Type', name.endsWith('.png') ? 'image/png' : 'application/manifest+json');
        res.end(readFileSync(new URL(name, dir)));
      });
    },
    generateBundle() {
      for (const name of files) this.emitFile({ type: 'asset', fileName: name, source: readFileSync(new URL(name, dir)) });
    },
  };
}

export default defineConfig({
  publicDir: 'assets',
  plugins: [pwa()],
});
