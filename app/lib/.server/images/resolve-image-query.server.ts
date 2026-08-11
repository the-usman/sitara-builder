import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('resolve-image-query');

/**
 * Resolves an image search query to a real, working photo URL via the Unsplash
 * Search API (authenticated, not the deprecated/shut-down source.unsplash.com
 * redirect service), falling back to Pexels. Returns undefined — never a guessed
 * or fabricated URL — when no key is configured or both lookups fail, so callers
 * never hand the site generator a link that 404s.
 */
export async function resolveImageQuery(
  query: string,
  env: Record<string, string | undefined> = {},
  apiKeys: Record<string, string> = {},
): Promise<string | undefined> {
  const unsplashKey = apiKeys?.UNSPLASH_ACCESS_KEY || env?.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY;

  if (unsplashKey) {
    const url = await searchUnsplash(query, unsplashKey);

    if (url) {
      return url;
    }
  }

  const pexelsKey = apiKeys?.PEXELS_API_KEY || env?.PEXELS_API_KEY || process.env.PEXELS_API_KEY;

  if (pexelsKey) {
    const url = await searchPexels(query, pexelsKey);

    if (url) {
      return url;
    }
  }

  return undefined;
}

/** Resolves many queries concurrently, deduplicated. Never throws. */
export async function resolveImageQueries(
  queries: string[],
  env: Record<string, string | undefined> = {},
  apiKeys: Record<string, string> = {},
): Promise<Map<string, string | undefined>> {
  const unique = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
  const results = await Promise.all(unique.map((q) => resolveImageQuery(q, env, apiKeys)));

  return new Map(unique.map((q, i) => [q, results[i]]));
}

async function searchUnsplash(query: string, accessKey: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' } },
    );

    if (!res.ok) {
      logger.warn(`Unsplash search failed (${res.status}) for "${query}"`);
      return undefined;
    }

    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string } }> };

    return data.results?.[0]?.urls?.regular;
  } catch (error) {
    logger.warn(`Unsplash search error for "${query}":`, String(error));
    return undefined;
  }
}

async function searchPexels(query: string, apiKey: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?per_page=1&query=${encodeURIComponent(query)}`, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      logger.warn(`Pexels search failed (${res.status}) for "${query}"`);
      return undefined;
    }

    const data = (await res.json()) as { photos?: Array<{ src?: { large?: string } }> };

    return data.photos?.[0]?.src?.large;
  } catch (error) {
    logger.warn(`Pexels search error for "${query}":`, String(error));
    return undefined;
  }
}
