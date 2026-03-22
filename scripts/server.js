const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

const ALLOWED_PREFIXES = ['/styles/', '/scripts/', '/images/', '/pages/', '/articles/', '/'];

function isAllowed(urlPath) {
  if (!urlPath) return false;
  if (urlPath === '/') return true;
  return ALLOWED_PREFIXES.some(p => urlPath.startsWith(p));
}

function send404(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('404 Not Found');
}

const server = http.createServer((req, res) => {
  try {
    const rawUrl = (req.url || '/').split('?')[0];
    const urlPath = decodeURIComponent(rawUrl);
    if (!isAllowed(urlPath)) return send404(res);

    const target = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    const fullPath = path.join(ROOT, target);
    const resolved = path.resolve(fullPath);

    if (!resolved.startsWith(path.resolve(ROOT))) return send404(res);

    fs.stat(resolved, (err, stat) => {
      if (err || !stat.isFile()) return send404(res);
      const ext = path.extname(resolved).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      res.statusCode = 200;
      res.setHeader('Content-Type', type);
      const stream = fs.createReadStream(resolved);
      stream.on('error', () => send404(res));
      stream.pipe(res);
    });
  } catch (e) {
    send404(res);
  }
});

server.listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}/`));
// (server started above)
