import { experimental_wrapLanguageModel as wrapLanguageModel, type LanguageModelV1 } from 'ai';

/*
 * The Vercel AI SDK injects `temperature: 0` into every request when the caller
 * omits it (see `prepareCallSettings`), so requests that never set a temperature
 * still send one on the wire. Anthropic removed the sampling parameters on the
 * newer Claude models and rejects them with:
 *
 *   400 invalid_request_error: `temperature` is deprecated for this model.
 *
 * These models reject `temperature`, `top_p`, and `top_k`:
 *   - the Claude 5 families (Opus 5, Sonnet 5, Fable 5, Mythos 5)
 *   - Opus 4.7 and later 4.x Opus releases (4.8, ...)
 *
 * Opus 4.6, Sonnet 4.6, Haiku 4.5 and everything older still accept them.
 */
const MODELS_REJECTING_SAMPLING_PARAMS: RegExp[] = [
  /^claude-(?:opus|sonnet|haiku)-(?:[5-9]|\d{2,})\b/,
  /^claude-opus-4-(?:[7-9]|\d{2,})\b/,
  /^claude-(?:fable|mythos)-/,
];

/**
 * Whether the given Claude model rejects `temperature` / `top_p` / `top_k`.
 * Accepts both plain (`claude-opus-4-7`) and Bedrock-prefixed
 * (`anthropic.claude-opus-4-7`) model ids.
 */
export function rejectsSamplingParams(modelId: string): boolean {
  const normalizedId = modelId.toLowerCase().replace(/^anthropic\./, '');
  return MODELS_REJECTING_SAMPLING_PARAMS.some((pattern) => pattern.test(normalizedId));
}

/**
 * Wraps a Claude model so the sampling parameters are dropped before the request
 * leaves the SDK, for the models that no longer accept them. Models that still
 * support sampling parameters are returned untouched.
 */
export function withSupportedSamplingParams(model: LanguageModelV1): LanguageModelV1 {
  if (!rejectsSamplingParams(model.modelId)) {
    return model;
  }

  return wrapLanguageModel({
    model,
    middleware: {
      transformParams: async ({ params }) => {
        const { temperature: _temperature, topP: _topP, topK: _topK, ...supportedParams } = params;
        return supportedParams;
      },
    },
  });
}
