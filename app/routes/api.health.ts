import { json } from '@remix-run/cloudflare';

/**
 * Liveness probe for Docker / Dokploy.
 *
 * Deliberately unauthenticated and deliberately does NOT touch MongoDB: a health check
 * that fails on a database blip would get the container killed and restart-looped, which
 * turns a recoverable outage into downtime. This answers "is the server process up".
 */
export function loader() {
  return json({ status: 'ok', timestamp: new Date().toISOString() });
}
