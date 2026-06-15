import type { ModelRate } from './model-pricing';

/**
 * Live per-model pricing for the aggregator providers that actually expose it
 * over their model-list APIs (OpenRouter, Together). First-party providers
 * (Anthropic/OpenAI/Google/...) do NOT serve prices, so they stay on the
 * static table in model-pricing.ts.
 *
 * Rates are normalized to USD per 1,000,000 tokens and cached per provider —
 * prices change rarely, so a long TTL keeps the chat hot path from paying a
 * network round-trip on every completion.
 */

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — prices are near-static

type RateMap = Map<string, ModelRate>;
const cache = new Map<string, { rates: RateMap; loadedAt: number }>();

function fresh(providerKey: string): RateMap | undefined {
  const hit = cache.get(providerKey);
  return hit && Date.now() - hit.loadedAt < CACHE_TTL_MS ? hit.rates : undefined;
}

// OpenRouter: public endpoint, no auth. pricing.{prompt,completion} are USD PER TOKEN.
async function loadOpenRouter(): Promise<RateMap> {
  const map: RateMap = new Map();
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Content-Type': 'application/json' },
  });
  const json = (await res.json()) as { data?: Array<{ id: string; pricing?: { prompt?: unknown; completion?: unknown } }> };

  for (const m of json.data ?? []) {
    const input = Number(m.pricing?.prompt) * 1_000_000;
    const output = Number(m.pricing?.completion) * 1_000_000;

    if (Number.isFinite(input) && Number.isFinite(output)) {
      map.set(m.id.toLowerCase(), { input, output });
    }
  }

  return map;
}

// Together: needs Bearer auth. pricing.{input,output} are already USD per 1M tokens.
async function loadTogether(serverEnv: Record<string, string>, apiKeys: Record<string, string>): Promise<RateMap> {
  const map: RateMap = new Map();
  const apiKey = apiKeys?.Together || serverEnv?.TOGETHER_API_KEY;
  const baseUrl = serverEnv?.TOGETHER_API_BASE_URL || 'https://api.together.xyz/v1';

  if (!apiKey) {
    return map; // can't fetch without a key — caller falls back to the static table
  }

  const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const json = (await res.json()) as Array<{ id: string; pricing?: { input?: unknown; output?: unknown } }>;

  for (const m of json ?? []) {
    const input = Number(m.pricing?.input);
    const output = Number(m.pricing?.output);

    if (Number.isFinite(input) && Number.isFinite(output)) {
      map.set(m.id.toLowerCase(), { input, output });
    }
  }

  return map;
}

/**
 * Resolve the live per-1M-token rate for a selected model, or undefined when
 * the provider has no live source / the lookup fails. Never throws — pricing
 * must never break a chat response.
 */
export async function getLiveModelRate(
  provider: string,
  model: string,
  serverEnv: Record<string, string> = {},
  apiKeys: Record<string, string> = {},
): Promise<ModelRate | undefined> {
  const providerKey = (provider || '').toLowerCase();

  if (providerKey !== 'openrouter' && providerKey !== 'together') {
    return undefined;
  }

  try {
    let rates = fresh(providerKey);

    if (!rates) {
      rates = providerKey === 'openrouter' ? await loadOpenRouter() : await loadTogether(serverEnv, apiKeys);

      // Only cache a non-empty result so a transient failure doesn't pin an empty map for 6h.
      if (rates.size > 0) {
        cache.set(providerKey, { rates, loadedAt: Date.now() });
      }
    }

    return rates.get((model || '').toLowerCase());
  } catch (error) {
    console.error(`[live-pricing] ${providerKey} lookup failed:`, String(error));
    return undefined;
  }
}
