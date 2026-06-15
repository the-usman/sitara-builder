/**
 * Per-model token pricing, in USD per 1,000,000 tokens.
 *
 * No LLM provider exposes prices over its API — the Anthropic/OpenAI/Google
 * responses return token counts only, and there is no pricing endpoint. So
 * cost is derived from this maintained table, keyed by PROVIDER then by model
 * name (longest-prefix match), exactly the way the user-selected model is
 * identified everywhere else in the app (`model:provider`).
 *
 * Anthropic rates are authoritative (per the claude-api reference, 2026-06).
 * Other providers are list-price estimates — see the per-provider notes — and
 * for OpenRouter/Together the live `pricing` from their model APIs is more
 * accurate than anything static (see getModelRate's note).
 */
export interface ModelRate {
  /** USD per 1M input (prompt) tokens */
  input: number;
  /** USD per 1M output (completion) tokens */
  output: number;
}

type RateTable = Array<{ prefix: string; rate: ModelRate }>;

// Anthropic — authoritative (USD / 1M tokens), most-specific prefixes first.
const ANTHROPIC: RateTable = [
  { prefix: 'claude-fable-5', rate: { input: 10, output: 50 } },
  { prefix: 'claude-mythos-5', rate: { input: 10, output: 50 } },
  { prefix: 'claude-opus-4', rate: { input: 5, output: 25 } }, // 4.5–4.8
  { prefix: 'claude-opus-3', rate: { input: 15, output: 75 } },
  { prefix: 'claude-opus', rate: { input: 5, output: 25 } },
  { prefix: 'claude-sonnet-4', rate: { input: 3, output: 15 } }, // 4.5/4.6
  { prefix: 'claude-haiku-4', rate: { input: 1, output: 5 } },
  { prefix: 'claude-sonnet', rate: { input: 3, output: 15 } },
  { prefix: 'claude-haiku', rate: { input: 1, output: 5 } },
  // Legacy Claude 3.x ids (model name carries the family)
  { prefix: 'claude-3-5-sonnet', rate: { input: 3, output: 15 } },
  { prefix: 'claude-3-7-sonnet', rate: { input: 3, output: 15 } },
  { prefix: 'claude-3-5-haiku', rate: { input: 0.8, output: 4 } },
  { prefix: 'claude-3-opus', rate: { input: 15, output: 75 } },
  { prefix: 'claude-3-haiku', rate: { input: 0.25, output: 1.25 } },
];

// OpenAI — list-price estimates (USD / 1M tokens)
const OPENAI: RateTable = [
  { prefix: 'gpt-4o-mini', rate: { input: 0.15, output: 0.6 } },
  { prefix: 'gpt-4o', rate: { input: 2.5, output: 10 } },
  { prefix: 'gpt-4.1-mini', rate: { input: 0.4, output: 1.6 } },
  { prefix: 'gpt-4.1-nano', rate: { input: 0.1, output: 0.4 } },
  { prefix: 'gpt-4.1', rate: { input: 2, output: 8 } },
  { prefix: 'gpt-4-turbo', rate: { input: 10, output: 30 } },
  { prefix: 'gpt-4', rate: { input: 30, output: 60 } },
  { prefix: 'gpt-3.5-turbo', rate: { input: 0.5, output: 1.5 } },
  { prefix: 'o1-mini', rate: { input: 1.1, output: 4.4 } },
  { prefix: 'o1', rate: { input: 15, output: 60 } },
  { prefix: 'o3-mini', rate: { input: 1.1, output: 4.4 } },
  { prefix: 'o3', rate: { input: 2, output: 8 } },
  { prefix: 'chatgpt-4o', rate: { input: 5, output: 15 } },
];

// Google Gemini — list-price estimates
const GOOGLE: RateTable = [
  { prefix: 'gemini-1.5-flash-8b', rate: { input: 0.0375, output: 0.15 } },
  { prefix: 'gemini-1.5-flash', rate: { input: 0.075, output: 0.3 } },
  { prefix: 'gemini-1.5-pro', rate: { input: 1.25, output: 5 } },
  { prefix: 'gemini-2.0-flash', rate: { input: 0.1, output: 0.4 } },
  { prefix: 'gemini-2.5-pro', rate: { input: 1.25, output: 10 } },
  { prefix: 'gemini-2.5-flash', rate: { input: 0.3, output: 2.5 } },
];

// DeepSeek — list-price estimates
const DEEPSEEK: RateTable = [
  { prefix: 'deepseek-reasoner', rate: { input: 0.55, output: 2.19 } },
  { prefix: 'deepseek-chat', rate: { input: 0.27, output: 1.1 } },
  { prefix: 'deepseek-coder', rate: { input: 0.27, output: 1.1 } },
];

// xAI Grok — list-price estimates
const XAI: RateTable = [
  { prefix: 'grok-3', rate: { input: 3, output: 15 } },
  { prefix: 'grok-2', rate: { input: 2, output: 10 } },
  { prefix: 'grok-beta', rate: { input: 5, output: 15 } },
];

// Mistral — list-price estimates
const MISTRAL: RateTable = [
  { prefix: 'mistral-large', rate: { input: 2, output: 6 } },
  { prefix: 'mistral-small', rate: { input: 0.2, output: 0.6 } },
  { prefix: 'codestral', rate: { input: 0.3, output: 0.9 } },
];

// Provider name (lowercased, as used in the app's `provider` field) → table.
const BY_PROVIDER: Record<string, RateTable> = {
  anthropic: ANTHROPIC,
  openai: OPENAI,
  google: GOOGLE,
  deepseek: DEEPSEEK,
  xai: XAI,
  mistral: MISTRAL,
};

// Cross-provider fallback: when the provider isn't keyed above (OpenRouter,
// OpenAILike, etc.) the model name alone often still identifies the family.
const GLOBAL: RateTable = [...ANTHROPIC, ...OPENAI, ...GOOGLE, ...DEEPSEEK, ...XAI, ...MISTRAL];

// Used only when nothing matches, so cost is never silently $0.
const DEFAULT_RATE: ModelRate = { input: 1, output: 3 };

function longestPrefixMatch(table: RateTable, id: string): ModelRate | undefined {
  let best: { prefix: string; rate: ModelRate } | undefined;

  for (const entry of table) {
    if (id.startsWith(entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }

  return best?.rate;
}

/**
 * Resolve the per-1M-token rate for a selected model.
 * Tries the provider's own table first, then a cross-provider name match.
 *
 * NOTE: OpenRouter and Together return real per-token `pricing` from their
 * model-list APIs — for those providers, prefer wiring that live value in
 * rather than relying on this static fallback.
 */
export function getModelRate(provider: string, model: string): ModelRate {
  const id = (model || '').toLowerCase();
  const providerKey = (provider || '').toLowerCase();

  const table = BY_PROVIDER[providerKey];
  const fromProvider = table && longestPrefixMatch(table, id);

  return fromProvider ?? longestPrefixMatch(GLOBAL, id) ?? DEFAULT_RATE;
}

export interface CostBreakdown {
  promptCost: number;
  completionCost: number;
  totalCost: number;
}

/**
 * Compute USD cost from token counts for the user-selected provider+model.
 * Pass `rateOverride` (e.g. a live rate from live-pricing.server) to use exact
 * provider pricing; otherwise the static table is used.
 */
export function computeCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  rateOverride?: ModelRate,
): CostBreakdown {
  const rate = rateOverride ?? getModelRate(provider, model);
  const promptCost = (promptTokens / 1_000_000) * rate.input;
  const completionCost = (completionTokens / 1_000_000) * rate.output;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
  };
}
