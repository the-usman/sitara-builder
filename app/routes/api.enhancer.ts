import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import type { ProviderInfo } from '~/types/model';
import { getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { PROMPT_REFINER_SYSTEM_PROMPT } from '~/lib/common/prompts/prompt-refiner';
import { getAuthToken, verifyJwt } from '~/lib/auth.server';
import { readAppConfig } from '~/lib/config/app-config.server';
import { upsertProject, type ChatClient } from '~/lib/project-tracker.server';
import { computeCost } from '~/lib/.server/llm/model-pricing';
import { getLiveModelRate } from '~/lib/.server/llm/live-pricing.server';
import { resolveImageQueries } from '~/lib/.server/images/resolve-image-query.server';

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

const logger = createScopedLogger('api.enhancher');

// Matches the mandatory `Unsplash query: "..."` form the refiner's system prompt requires
// for every image reference — see prompt-refiner.ts IMAGE STRATEGY.
const IMAGE_QUERY_PATTERN = /Unsplash query:\s*"([^"]{3,200})"/gi;

function extractImageQueries(text: string): string[] {
  return Array.from(text.matchAll(IMAGE_QUERY_PATTERN), (m) => m[1].trim());
}

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message, model, provider, hasExistingSite, trackingId, chatId, selectedClient } = await request.json<{
    message: string;
    model: string;
    provider: ProviderInfo;
    apiKeys?: Record<string, string>;
    // whether a site already exists in this chat — lets the refiner choose BUILD vs EDIT mode
    hasExistingSite?: boolean;
    // first user message ID of the chat this refine belongs to, for cost tracking (see api.chat.ts)
    trackingId?: string;
    chatId?: string;
    selectedClient?: ChatClient;
  }>();

  const { name: providerName } = provider;

  // validate 'model' and 'provider' fields
  if (!model || typeof model !== 'string') {
    throw new Response('Invalid or missing model', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  if (!providerName || typeof providerName !== 'string') {
    throw new Response('Invalid or missing provider', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const cookieHeader = request.headers.get('Cookie');
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const env = (context as any).cloudflare?.env;
  const authUser = await verifyJwt(getAuthToken(request) || '', env);

  // LLM keys come from the super-admin-managed config only — see api.chat.ts for why.
  const { apiKeys } = await readAppConfig(env);

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content:
            `[Model: ${model}]\n\n[Provider: ${providerName}]\n\n` +
            stripIndents`
            ${hasExistingSite ? 'A site already exists in this conversation, so lean EDIT MODE unless the request clearly asks for something brand new.' : 'No site exists yet in this conversation, so this is BUILD MODE.'}

            Refine the raw request wrapped in \`<original_prompt>\` tags into the structured generation prompt described in your system instructions.

            IMPORTANT: Your response must ONLY contain the refined prompt text, formatted exactly per the output format for the mode you determine applies.
            Do not include any explanations, metadata, or wrapper tags outside that format.

            <original_prompt>
              ${message}
            </original_prompt>
          `,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
      options: {
        system: PROMPT_REFINER_SYSTEM_PROMPT,
        onFinish: async ({ usage }) => {
          if (!usage) {
            return;
          }

          const liveRate = await getLiveModelRate(
            providerName,
            model,
            context.cloudflare?.env as unknown as Record<string, string>,
            apiKeys,
          );
          const cost = computeCost(providerName, model, usage.promptTokens || 0, usage.completionTokens || 0, liveRate);

          if (!authUser) {
            logger.debug('[refiner-tracker] SKIP: no authUser');
            return;
          }

          if (!trackingId) {
            // Happens for the very first message of a brand-new chat, before it has an ID yet.
            logger.debug('[refiner-tracker] SKIP: no trackingId (new chat, not yet sent)');
            return;
          }

          if (!selectedClient) {
            logger.debug('[refiner-tracker] SKIP: no selectedClient');
            return;
          }

          const modelKey = `${model}:${providerName}`.replace(/\./g, '_');

          try {
            await upsertProject(
              trackingId,
              trackingId,
              { userId: authUser.userId, email: authUser.email, name: authUser.name, role: authUser.role },
              selectedClient,
              modelKey,
              {
                model,
                provider: providerName,
                promptTokens: usage.promptTokens || 0,
                completionTokens: usage.completionTokens || 0,
                totalTokens: usage.totalTokens || 0,
                promptCost: cost.promptCost,
                completionCost: cost.completionCost,
                cost: cost.totalCost,
              },
              chatId,
              env,
            );
            logger.debug(`[refiner-tracker] upsert SUCCESS for ${trackingId} — cost: $${cost.totalCost.toFixed(4)}`);
          } catch (err) {
            logger.error('[refiner-tracker] upsert FAILED:', String(err));
          }
        },

        /*
         * onError: (event) => {
         *   throw new Response(null, {
         *     status: 500,
         *     statusText: 'Internal Server Error',
         *   });
         * }
         */
      },
    });

    // Handle streaming errors in a non-blocking way
    (async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'error') {
            const error: any = part.error;
            logger.error('Streaming error:', error);
            break;
          }
        }
      } catch (error) {
        logger.error('Error processing stream:', error);
      }
    })();

    /*
     * Pipe the refiner's text straight through live (preserves the streamed "typing"
     * effect), while also buffering it. Once it finishes, extract every `Unsplash
     * query: "..."` the refiner wrote and resolve each to a real, currently-working
     * photo URL (see resolve-image-query.server.ts) instead of letting the generator
     * guess or hallucinate an image link that 404s. The resolved links are appended
     * as one more chunk before the stream closes.
     */
    const encoder = new TextEncoder();
    const bufferedChunks: string[] = [];

    const combinedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = result.textStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            bufferedChunks.push(value);
            controller.enqueue(encoder.encode(value));
          }
        } catch (error) {
          controller.error(error);
          return;
        }

        try {
          const queries = extractImageQueries(bufferedChunks.join(''));

          if (queries.length > 0) {
            const resolved = await resolveImageQueries(
              queries,
              context.cloudflare?.env as unknown as Record<string, string>,
              apiKeys,
            );

            const lines = queries.map((query) => {
              const url = resolved.get(query);
              return url
                ? `- "${query}" → ${url}`
                : `- "${query}" → [no verified photo found — use a solid-color or gradient placeholder here instead of a photo URL, do not invent a link]`;
            });

            controller.enqueue(
              encoder.encode(
                `\n\n---\n\n## VERIFIED IMAGE URLS (real, working links — use these exact URLs, do not substitute your own)\n\n${lines.join('\n')}\n`,
              ),
            );
          }
        } catch (error) {
          logger.error('Image query resolution failed:', String(error));
        }

        controller.close();
      },
    });

    return new Response(combinedStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.log(error);

    if (error instanceof Error && error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
