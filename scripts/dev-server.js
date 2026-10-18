import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import handler from '../api/auth.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const port = Number(process.env.PORT || 8092);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/auth') return handler(req, res);
  try {
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.split('/').some(segment => segment.startsWith('.')) || !['GET', 'HEAD'].includes(req.method)) throw Error();
    const path = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(root + sep) || !types[extname(path)]) throw Error();
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`SHE development server listening on port ${port}`));
