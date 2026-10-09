/*
 * Production Node server for Docker/Dokploy — replaces `wrangler pages dev`.
 *
 * wrangler runs the app inside workerd, which cannot share a socket between requests, so every
 * MongoDB query paid a fresh DNS + TLS + auth handshake. Plain Node keeps one pooled client
 * (see app/lib/mongo.server.ts). Cloudflare Pages deploys are unaffected: they still use
 * functions/[[path]].ts.
 *
 * Usage: `pnpm run build && node server.mjs` (PORT defaults to 5173).
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequestHandler } from '@remix-run/node';

const root = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(root, 'build', 'client');
const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || '0.0.0.0';

const build = await import(pathToFileURL(path.join(root, 'build', 'server', 'index.js')).href);
const handleRequest = createRequestHandler(build, process.env.NODE_ENV || 'production');

const MIME_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
};

/*
 * The app reads deployment variables from `context.cloudflare.env` first. The server bundle
 * also shims `process` for the browser, so this real-env snapshot is what makes them visible.
 */
const loadContext = {
  cloudflare: {
    env: { ...process.env },
    ctx: { waitUntil: () => {}, passThroughOnException: () => {} },
    caches: undefined,
    cf: undefined,
  },
};

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  let pathname;

  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return false;
  }

  const filePath = path.join(clientDir, pathname);

  // Path traversal guard, and `/` is a Remix route, not a directory listing.
  if (!filePath.startsWith(clientDir + path.sep) || pathname.endsWith('/')) {
    return false;
  }

  let info;

  try {
    info = await stat(filePath);
  } catch {
    return false;
  }

  if (!info.isFile()) {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,

    // Vite fingerprints everything under /assets, so those never change; other files might.
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  });

  if (req.method === 'HEAD') {
    res.end();
  } else {
    createReadStream(filePath).pipe(res);
  }

  return true;
}

function toFetchRequest(req, res) {
  const proto = req.headers['x-forwarded-proto']?.split(',')[0].trim() || 'http';
  const url = new URL(req.url, `${proto}://${req.headers.host || `localhost:${port}`}`);

  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  // Aborts LLM streams and other long work when the browser goes away.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) {
      controller.abort();
    }
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
    signal: controller.signal,
  });
}

async function sendFetchResponse(res, response) {
  const headers = {};

  for (const [key, value] of response.headers) {
    if (key !== 'set-cookie') {
      headers[key] = value;
    }
  }

  const cookies = response.headers.getSetCookie();

  if (cookies.length) {
    headers['set-cookie'] = cookies;
  }

  res.writeHead(response.status, response.statusText, headers);

  if (!response.body) {
    res.end();
    return;
  }

  // Written chunk by chunk (no buffering) so streamed LLM output reaches the browser as it arrives.
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!res.write(value)) {
        await new Promise((resolve) => {
          res.once('drain', resolve);
          res.once('close', resolve);
        });
      }

      if (res.destroyed) {
        await reader.cancel();
        return;
      }
    }

    res.end();
  } catch (error) {
    console.error('[server] response stream failed:', error);
    res.destroy();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (await serveStatic(req, res)) {
      return;
    }

    const response = await handleRequest(toFetchRequest(req, res), loadContext);
    await sendFetchResponse(res, response);
  } catch (error) {
    console.error('[server] request failed:', error);

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }

    res.end('Internal Server Error');
  }
});

// LLM responses can stream for minutes; Node's defaults would cut them off.
server.requestTimeout = 0;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 61_000;

server.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, closing`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
