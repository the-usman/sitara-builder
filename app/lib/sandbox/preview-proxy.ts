/*
 * A tiny reverse proxy that runs inside the sandbox in front of the project's dev server:
 *   public port (PROXY_PORT, exposed as the preview URL) → dev server (DEV_PORT, internal).
 *
 * It injects the preview bridge (preview-bridge.ts) into every HTML page — the only way to get
 * it into frameworks without an index.html, like Next.js — serves the bridge, collects the
 * bridge's error beacons, and passes everything else through untouched, including the
 * WebSocket upgrades hot reload depends on. Node built-ins only: it runs with the sandbox's node.
 */
export const PROXY_PORT = 3000;
export const DEV_PORT = 3001;

export const PREVIEW_PROXY_SCRIPT = String.raw`
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';

const PORT = Number(process.env.SITARA_PROXY_PORT);
const UPSTREAM = Number(process.env.SITARA_DEV_PORT);
const BRIDGE = fs.readFileSync(process.env.SITARA_BRIDGE_FILE, 'utf8');
const ERRORS = process.env.SITARA_ERRORS_FILE;
const TAG = '<script src="/__sitara/bridge.js"></script>';

function inject(html) {
  if (html.includes('/__sitara/bridge.js')) return html;
  const head = html.search(/<head[^>]*>/i);
  if (head !== -1) {
    const end = html.indexOf('>', head) + 1;
    return html.slice(0, end) + TAG + html.slice(end);
  }
  return TAG + html;
}

const server = http.createServer((req, res) => {
  if (req.url === '/__sitara/bridge.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(BRIDGE);
    return;
  }

  if (req.url === '/__sitara/error' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { if (body.length < 20000) body += chunk; });
    req.on('end', () => {
      try { fs.appendFileSync(ERRORS, JSON.stringify(JSON.parse(body)) + '\n'); } catch {}
      res.writeHead(204);
      res.end();
    });
    return;
  }

  const wantsHtml = (req.headers.accept || '').includes('text/html');
  const headers = { ...req.headers };
  if (wantsHtml) delete headers['accept-encoding']; // plain text so the tag can be inserted

  const upstream = http.request(
    { host: '127.0.0.1', port: UPSTREAM, method: req.method, path: req.url, headers },
    (up) => {
      const type = up.headers['content-type'] || '';

      if (wantsHtml && type.includes('text/html') && !up.headers['content-encoding']) {
        const chunks = [];
        up.on('data', (c) => chunks.push(c));
        up.on('end', () => {
          const out = Buffer.from(inject(Buffer.concat(chunks).toString('utf8')));
          const h = { ...up.headers, 'content-length': String(out.length) };
          delete h['transfer-encoding'];
          res.writeHead(up.statusCode || 200, h);
          res.end(out);
        });
        return;
      }

      res.writeHead(up.statusCode || 200, up.headers);
      up.pipe(res);
    },
  );

  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/html; charset=utf-8', 'retry-after': '2' });
    res.end('<!doctype html><meta http-equiv="refresh" content="2"><p style="font-family:system-ui">Starting the dev server…</p>');
  });

  req.pipe(upstream);
});

// Hot reload (Vite's and Next's WebSockets): replay the handshake upstream, then splice sockets.
server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(UPSTREAM, '127.0.0.1', () => {
    let handshake = req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\r\n';
    for (let i = 0; i < req.rawHeaders.length; i += 2) handshake += req.rawHeaders[i] + ': ' + req.rawHeaders[i + 1] + '\r\n';
    upstream.write(handshake + '\r\n');
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(PORT, '0.0.0.0');
`;
