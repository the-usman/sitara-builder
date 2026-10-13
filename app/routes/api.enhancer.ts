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
import { resolveFalKey } from '~/lib/.server/images/fal.server';
import { asksForGeneratedImages, ENHANCER_IMAGE_INSTRUCTIONS } from '~/utils/reference-assets';

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

const logger = createScopedLogger('api.enhancher');

/*
 * Matches the mandatory `Unsplash query: "..."` form the refiner's system prompt requires
 * for every image reference — see prompt-refiner.ts IMAGE STRATEGY.
 */
const IMAGE_QUERY_PATTERN = /Unsplash query:\s*"([^"]{3,200})"/gi;

// Overview + slices of one tall screenshot is up to 7 images (see reference-image.ts).
const MAX_REFERENCE_IMAGES = 8;

/*
 * The images also go to the generator with the final message, so the refined prompt doesn't
 * have to replace them — it has to read them: turn what's visible into concrete, checkable
 * instructions, and keep the generator pointed at the images as the source of truth.
 */
const REFERENCE_IMAGE_INSTRUCTIONS = stripIndents`
  REFERENCE IMAGES ARE ATTACHED (screenshots or designs the user wants this site to follow). They outrank your own aesthetic direction:
  - Study them before writing anything. Base the layout, section order, color palette, typography, spacing density, corner radii, shadows, and imagery style on what you SEE, not on the industry defaults in your instructions. Do not invent a different "brand reference" when the images already define the look.
  - Describe every visible section top to bottom: its layout (columns, alignment, image placement), its content (headings, copy, buttons, cards, counts), and its notable styling. Copy visible text verbatim where readable.
  - Give concrete values: hex colors (prefer the sampled colors listed below), font character (serif/sans, weight, approximate sizes), spacing (tight/airy, approximate px), border radius, button styles.
  - If the user asks for changes relative to the reference, apply them and say exactly what differs from the reference.
  - For photos/artwork visible in the reference: do NOT write Unsplash/Pexels queries for them when AI image generation is available — list them in the <generated_images> block so they are recreated with fal.ai (the reference screenshot is also passed to the image model as an image-to-image guide). Describe subject, framing, lighting, palette and mood in each generation prompt.
  - Include a line telling the generator: "Match the attached reference images closely — they are the source of truth for layout and styling."
`;

/** Overrides the refiner's stock Unsplash IMAGE STRATEGY when fal.ai can generate assets instead. */
const GENERATED_IMAGE_STRATEGY_OVERRIDE = stripIndents`
  IMAGE STRATEGY OVERRIDE (AI generation is configured for this project):
  - Prefer AI-generated images over Unsplash/Pexels/stock for hero backgrounds, section backgrounds, banners and large feature photos.
  - Do NOT write \`Unsplash query: "..."\` for those primary images — put them in the <generated_images> block at the end instead.
  - In IMAGE REQUIREMENTS, describe purpose, aspect ratio, treatment and mood in prose (the build will use /generated/… paths after the user approves generation).
  - Stock Unsplash queries are only for minor leftover slots (tiny avatars, optional fillers) that are not worth a dedicated generation.
`;

function extractImageQueries(text: string): string[] {
  return Array.from(text.matchAll(IMAGE_QUERY_PATTERN), (m) => m[1].trim());
}

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message, model, provider, hasExistingSite, trackingId, chatId, selectedClient, images, referenceNote } =
    await request.json<{
      message: string;

      // reference images attached to the prompt (data URLs, already sliced/resized by the client)
      images?: string[];

      // the client's description of those images (sizes, slices, sampled colors) — see reference-image.ts
      referenceNote?: string;
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

  const referenceImages = (Array.isArray(images) ? images : [])
    .filter((image) => typeof image === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(image))
    .slice(0, MAX_REFERENCE_IMAGES);

  // With a fal.ai key the refiner also proposes background/photo images (approved in the client first).
  const canGenerateImages = !!(await resolveFalKey(request, env));

  const promptText =
    `[Model: ${model}]\n\n[Provider: ${providerName}]\n\n` +
    stripIndents`
    ${hasExistingSite ? 'A site already exists in this conversation, so lean EDIT MODE unless the request clearly asks for something brand new.' : 'No site exists yet in this conversation, so this is BUILD MODE.'}

    Refine the raw request wrapped in \`<original_prompt>\` tags into the structured generation prompt described in your system instructions.

    IMPORTANT: Your response must ONLY contain the refined prompt text, formatted exactly per the output format for the mode you determine applies.
    Do not include any explanations, metadata, or wrapper tags outside that format.

    <original_prompt>
      ${message}
    </original_prompt>
  ` +
    (referenceImages.length
      ? `\n\n${REFERENCE_IMAGE_INSTRUCTIONS}${referenceNote ? `\n\n${referenceNote}` : ''}`
      : '') +
    (canGenerateImages ? `\n\n${GENERATED_IMAGE_STRATEGY_OVERRIDE}\n\n${ENHANCER_IMAGE_INSTRUCTIONS}` : '') +
    (canGenerateImages && (asksForGeneratedImages(message) || referenceImages.length > 0)
      ? '\n\nThe block must list at least one image (the hero background at minimum)' +
        (asksForGeneratedImages(message) ? ', plus every image the user named' : '') +
        (referenceImages.length
          ? ', plus every photographic/illustrated background or feature image visible in the attached reference'
          : '') +
        '.'
      : '');

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content: (referenceImages.length
            ? [{ type: 'text', text: promptText }, ...referenceImages.map((image) => ({ type: 'image', image }))]
            : promptText) as any,
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

        /*
         * When fal.ai is available, primary imagery is AI-generated (approved in the client) —
         * skip Unsplash/Pexels lookup. Only resolve leftover stock queries when generation is off.
         */
        if (!canGenerateImages) {
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
