/**
 * Model pricing in USD per 1,000,000 tokens, keyed by model name.
 * Used by the cost tracker to turn token usage into a dollar figure.
 *
 * Rates are matched longest-prefix-first so dated/versioned model ids
 * (e.g. `gpt-4o-2024-08-06`) resolve to their base family.
 */
export interface ModelRate {
  /** USD per 1M input (prompt) tokens */
  input: number;
  /** USD per 1M output (completion) tokens */
  output: number;
}

// Ordered most-specific first; lookup picks the longest matching prefix.
const PRICING: Array<{ prefix: string; rate: ModelRate }> = [
  // OpenAI
  { prefix: 'gpt-4o-mini', rate: { input: 0.15, output: 0.6 } },
  { prefix: 'gpt-4o', rate: { input: 2.5, output: 10 } },
  { prefix: 'gpt-4-turbo', rate: { input: 10, output: 30 } },
  { prefix: 'gpt-4.1-mini', rate: { input: 0.4, output: 1.6 } },
  { prefix: 'gpt-4.1-nano', rate: { input: 0.1, output: 0.4 } },
  { prefix: 'gpt-4.1', rate: { input: 2, output: 8 } },
  { prefix: 'gpt-4', rate: { input: 30, output: 60 } },
  { prefix: 'gpt-3.5-turbo', rate: { input: 0.5, output: 1.5 } },
  { prefix: 'o1-mini', rate: { input: 1.1, output: 4.4 } },
  { prefix: 'o1', rate: { input: 15, output: 60 } },
  { prefix: 'o3-mini', rate: { input: 1.1, output: 4.4 } },
  { prefix: 'o3', rate: { input: 2, output: 8 } },
  { prefix: 'chatgpt-4o', rate: { input: 5, output: 15 } },

  // Anthropic
  { prefix: 'claude-3-5-haiku', rate: { input: 0.8, output: 4 } },
  { prefix: 'claude-3-5-sonnet', rate: { input: 3, output: 15 } },
  { prefix: 'claude-3-7-sonnet', rate: { input: 3, output: 15 } },
  { prefix: 'claude-3-opus', rate: { input: 15, output: 75 } },
  { prefix: 'claude-3-sonnet', rate: { input: 3, output: 15 } },
  { prefix: 'claude-3-haiku', rate: { input: 0.25, output: 1.25 } },

  // Google Gemini
  { prefix: 'gemini-1.5-flash-8b', rate: { input: 0.0375, output: 0.15 } },
  { prefix: 'gemini-1.5-flash', rate: { input: 0.075, output: 0.3 } },
  { prefix: 'gemini-1.5-pro', rate: { input: 1.25, output: 5 } },
  { prefix: 'gemini-2.0-flash', rate: { input: 0.1, output: 0.4 } },

  // DeepSeek
  { prefix: 'deepseek-chat', rate: { input: 0.27, output: 1.1 } },
  { prefix: 'deepseek-coder', rate: { input: 0.27, output: 1.1 } },
  { prefix: 'deepseek-reasoner', rate: { input: 0.55, output: 2.19 } },
];

// Used when a model has no entry above, so cost is never silently zero.
const DEFAULT_RATE: ModelRate = { input: 1, output: 3 };

export function getModelRate(model: string): ModelRate {
  const id = (model || '').toLowerCase();

  let best: { prefix: string; rate: ModelRate } | undefined;

  for (const entry of PRICING) {
    if (id.startsWith(entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }

  return best?.rate ?? DEFAULT_RATE;
}

export interface CostBreakdown {
  promptCost: number;
  completionCost: number;
  totalCost: number;
}

/** Compute USD cost from token counts for a given model. */
export function computeCost(model: string, promptTokens: number, completionTokens: number): CostBreakdown {
  const rate = getModelRate(model);
  const promptCost = (promptTokens / 1_000_000) * rate.input;
  const completionCost = (completionTokens / 1_000_000) * rate.output;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
  };
}
