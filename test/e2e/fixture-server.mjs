import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const port = 4173;

const server = http.createServer((req, res) => {
  const file = req.url === '/' || req.url === '/urgency.html'
    ? resolve(root, 'urgency.html')
    : null;
  if (!file) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(readFileSync(file));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`fixture server http://127.0.0.1:${port}/urgency.html`);
});
