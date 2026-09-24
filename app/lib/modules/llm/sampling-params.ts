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

/*
 * Newer Claude models stream thinking blocks. `@ai-sdk/anthropic` 1.1.x surfaces
 * their signatures as `reasoning-signature` / `redacted-reasoning` chunks, which
 * `ai` 4.1.x does not know about and throws on ("Unhandled chunk type"),
 * killing the response. The signatures are only needed to replay thinking
 * blocks back to the API, which this app doesn't do, so they are dropped.
 */
const UNSUPPORTED_STREAM_CHUNK_TYPES = new Set<string>(['reasoning-signature', 'redacted-reasoning']);

/**
 * Wraps a Claude model so that
 *  - the sampling parameters are dropped for the models that no longer accept them, and
 *  - stream chunks the installed `ai` version can't handle are filtered out.
 */
export function withSupportedSamplingParams(model: LanguageModelV1): LanguageModelV1 {
  const dropSamplingParams = rejectsSamplingParams(model.modelId);

  return wrapLanguageModel({
    model,
    middleware: {
      transformParams: async ({ params }) => {
        if (!dropSamplingParams) {
          return params;
        }

        const { temperature: _temperature, topP: _topP, topK: _topK, ...supportedParams } = params;

        return supportedParams;
      },
      wrapStream: async ({ doStream }) => {
        const { stream, ...rest } = await doStream();

        return {
          stream: stream.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                if (!UNSUPPORTED_STREAM_CHUNK_TYPES.has((chunk as { type: string }).type)) {
                  controller.enqueue(chunk);
                }
              },
            }),
          ),
          ...rest,
        };
      },
    },
  });
}
