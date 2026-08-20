import { json } from '@remix-run/cloudflare';
import JSZip from 'jszip';
import { requireAuth } from '~/lib/auth.server';
import { getProviderToken } from '~/lib/config/provider-tokens.server';

type TemplateFile = { name: string; path: string; content: string };

/*
 * Extracted template files are keyed to an immutable GitHub release tag, so once we've
 * unzipped a release its contents never change. Without caching, every new project a
 * user starts re-downloads and re-unzips the whole template repo inside the Worker on
 * every request - that's CPU-heavy enough to hit Cloudflare's per-request CPU time
 * limit and just hang, which is what "creating initial files" getting stuck looks like.
 */
const memoryCache = new Map<string, { files: TemplateFile[]; expiresAt: number }>();
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour - safety net in case a tag ever gets force-pushed
const EDGE_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

function pruneMemoryCache() {
  const now = Date.now();

  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}

export async function loader({ request, context }: { request: Request; context: any }) {
  const env = context?.cloudflare?.env;
  await requireAuth(request, env);

  const url = new URL(request.url);
  const repo = url.searchParams.get('repo');

  if (!repo) {
    return json({ error: 'Repository name is required' }, { status: 400 });
  }

  /*
   * Prefers the super-admin-managed token, falling back to the deployment env
   * vars this route used to read directly. Still optional — public template
   * repos resolve fine unauthenticated, they just get a lower rate limit.
   */
  const githubToken = await getProviderToken('github', env);

  try {
    const baseUrl = 'https://api.github.com';

    const commonHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'sitara-builder/1.0',
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
    };

    // Get the latest release - cheap network call, needed to derive the cache key
    const releaseResponse = await fetch(`${baseUrl}/repos/${repo}/releases/latest`, {
      headers: commonHeaders,
    });

    if (!releaseResponse.ok) {
      const body = await releaseResponse.text();
      console.error(`GitHub API ${releaseResponse.status} for ${repo}:`, body, '| token present:', !!githubToken);
      throw new Error(`GitHub API error: ${releaseResponse.status}`);
    }

    const releaseData = (await releaseResponse.json()) as any;
    const zipballUrl = releaseData.zipball_url;
    const cacheKeyStr = `${repo}@${releaseData.tag_name}`;

    // 1. Fastest path: this warm isolate already extracted this release recently
    pruneMemoryCache();

    const memoryHit = memoryCache.get(cacheKeyStr);

    if (memoryHit) {
      return json(memoryHit.files);
    }

    // 2. Next-fastest path: Cloudflare's edge cache, shared across isolates on this PoP
    const caches = context?.cloudflare?.caches;
    const edgeCacheKey = caches
      ? new Request(`https://template-cache.internal/${encodeURIComponent(cacheKeyStr)}`)
      : null;

    if (caches && edgeCacheKey) {
      try {
        const cached = await caches.default.match(edgeCacheKey);

        if (cached) {
          const files = (await cached.json()) as TemplateFile[];
          memoryCache.set(cacheKeyStr, { files, expiresAt: Date.now() + MEMORY_TTL_MS });

          return json(files);
        }
      } catch (error) {
        // Cache API isn't available on every domain (e.g. *.workers.dev/*.pages.dev) - fall through to a full fetch
        console.warn('[github-template] edge cache read failed:', error);
      }
    }

    // 3. Full miss: download and unzip the release
    const zipResponse = await fetch(zipballUrl, {
      headers: commonHeaders,
    });

    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch release zipball: ${zipResponse.status}`);
    }

    // Get the zip content as ArrayBuffer
    const zipArrayBuffer = await zipResponse.arrayBuffer();

    // Use JSZip to extract the contents
    const zip = await JSZip.loadAsync(zipArrayBuffer);

    // Find the root folder name
    let rootFolderName = '';
    zip.forEach((relativePath) => {
      if (!rootFolderName && relativePath.includes('/')) {
        rootFolderName = relativePath.split('/')[0];
      }
    });

    // Extract all files
    const promises = Object.keys(zip.files).map(async (filename) => {
      const zipEntry = zip.files[filename];

      // Skip directories
      if (zipEntry.dir) {
        return null;
      }

      // Skip the root folder itself
      if (filename === rootFolderName) {
        return null;
      }

      // Remove the root folder from the path
      let normalizedPath = filename;

      if (rootFolderName && filename.startsWith(rootFolderName + '/')) {
        normalizedPath = filename.substring(rootFolderName.length + 1);
      }

      // Get the file content
      const content = await zipEntry.async('string');

      return {
        name: normalizedPath.split('/').pop() || '',
        path: normalizedPath,
        content,
      };
    });

    const results = await Promise.all(promises);
    const fileList = results.filter(Boolean) as TemplateFile[];

    memoryCache.set(cacheKeyStr, { files: fileList, expiresAt: Date.now() + MEMORY_TTL_MS });

    if (caches && edgeCacheKey) {
      const ctx = context?.cloudflare?.ctx;
      const cacheResponse = new Response(JSON.stringify(fileList), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${EDGE_CACHE_TTL_SECONDS}`,
        },
      });

      const putPromise = Promise.resolve(caches.default.put(edgeCacheKey, cacheResponse)).catch((error: unknown) => {
        console.warn('[github-template] edge cache write failed:', error);
      });

      // Don't block the response on the cache write
      if (ctx?.waitUntil) {
        ctx.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }

    return json(fileList);
  } catch (error) {
    console.error('Error processing GitHub template:', error);
    return json({ error: 'Failed to fetch template files' }, { status: 500 });
  }
}
