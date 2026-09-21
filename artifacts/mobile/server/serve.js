/**
 * Production server for SubTrack.
 *
 * Two modes depending on the visitor:
 *
 *   1. Expo Go client (expo-platform header present)
 *      → serve the native platform manifest from static-build/
 *
 *   2. Browser / web tester (no expo-platform header)
 *      → serve the Expo web build from dist/  (SPA, all paths → index.html)
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const STATIC_ROOT = path.resolve(__dirname, '..', 'static-build'); // native bundles
const WEB_ROOT    = path.resolve(__dirname, '..', 'dist');          // web build
const basePath    = (process.env.BASE_PATH || '/').replace(/\/+$/, '');

const MIME_TYPES = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.map':   'application/json',
};

// ── Native manifest for Expo Go ───────────────────────────────────────────────
function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  const manifest = fs.readFileSync(manifestPath, 'utf-8');
  res.writeHead(200, {
    'content-type': 'application/json',
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
  });
  res.end(manifest);
}

// ── Web SPA: serve dist/ with index.html fallback ────────────────────────────
function serveWeb(pathname, res) {
  // Strip base path prefix
  let relPath = pathname;
  if (basePath && relPath.startsWith(basePath)) {
    relPath = relPath.slice(basePath.length) || '/';
  }

  const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(WEB_ROOT, safePath);

  // Serve exact file if it exists and is not a directory
  if (
    filePath.startsWith(WEB_ROOT) &&
    fs.existsSync(filePath) &&
    !fs.statSync(filePath).isDirectory()
  ) {
    const ext = path.extname(filePath).toLowerCase();
    const ct  = MIME_TYPES[ext] || 'application/octet-stream';

    // Long-lived cache for hashed assets; no-cache for HTML
    const cacheControl = (ext === '.html' || ext === '')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable';

    res.writeHead(200, { 'content-type': ct, 'cache-control': cacheControl });
    res.end(fs.readFileSync(filePath));
    return;
  }

  // SPA fallback — return index.html for any unrecognised route
  const indexPath = path.join(WEB_ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) {
    res.writeHead(503, { 'content-type': 'text/plain' });
    res.end('Web build not found. Run `pnpm --filter @workspace/mobile run build` first.');
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
  });
  res.end(fs.readFileSync(indexPath));
}

// ── Request router ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url      = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const platform = req.headers['expo-platform'];

  // Native Expo Go clients
  if (platform === 'ios' || platform === 'android') {
    return serveManifest(platform, res);
  }

  // Browser / web testers
  serveWeb(pathname, res);
});

const port = parseInt(process.env.PORT || '3000', 10);
server.listen(port, '0.0.0.0', () => {
  console.log(`SubTrack web app serving on port ${port}`);
  console.log(`Web build: ${fs.existsSync(WEB_ROOT) ? '✓ found' : '✗ missing — run build first'}`);
});
