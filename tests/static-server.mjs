import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const directory = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.webp': 'image/webp' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(directory + sep) || !types[extname(file)] || !(await stat(file)).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found'); }
}).listen(8093, '127.0.0.1', () => console.log('Vitrine HTML: http://127.0.0.1:8093'));
