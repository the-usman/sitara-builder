import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { readAppConfig } from '~/lib/config/app-config.server';
import { generateFalImage, resolveFalKey } from '~/lib/.server/images/fal.server';
import { requireAuth } from '~/lib/auth.server';
import { uploadToCloudinary } from '~/lib/cloudinary.server';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import {
  ASSET_PLAN_SYSTEM_PROMPT,
  ASSET_SIZES,
  parseAssetPlan,
  TEXT_ASSET_PLAN_SYSTEM_PROMPT,
} from '~/utils/reference-assets';

/*
 * AI-generated images for the site (see utils/reference-assets.ts):
 *   GET                  → { enabled }  whether a fal.ai key is configured
 *   POST { op: 'plan' }  → { images }   the AI's proposal, for the user to approve — from the
 *                                       reference image, or from the request alone without one
 *   POST { op: 'generate' } → { imageData } one approved image, base64 PNG
 *                           optional body.image (data URL) → Flux image-to-image from the reference
 */

const logger = createScopedLogger('api.reference-assets');

// Planning only needs a short JSON answer: give up rather than keep the user waiting.
const PLAN_TIMEOUT_MS = 150_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const falKey = await resolveFalKey(request, (context as any).cloudflare?.env);

  return json({ enabled: !!falKey });
}

export async function action({ context, request }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const body = await request.json<any>();

  if (body.op === 'plan') {
    return await plan(body, request, env);
  }

  if (body.op === 'generate') {
    const falKey = await resolveFalKey(request, env);

    if (!falKey) {
      return json({ error: 'No fal.ai key is configured.' }, 401);
    }

    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return json({ error: 'A prompt is required.' }, 400);
    }

    const user = await requireAuth(request, env);

    const referenceImage =
      typeof body.image === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(body.image)
        ? body.image
        : typeof body.image === 'string' && /^https?:\/\//.test(body.image)
          ? body.image
          : undefined;

    try {
      const imageData = await generateFalImage({
        falKey,
        prompt: body.prompt,
        size: body.size in ASSET_SIZES ? body.size : '1792x1024',
        imageUrl: referenceImage,
      });

      /*
       * Host on Cloudinary and record it so the build references a URL instead of a binary
       * written into the project. Null when Cloudinary isn't configured — the client then
       * falls back to saving the image into public/generated/.
       */
      const filename = `${typeof body.name === 'string' && body.name ? body.name : 'image'}.png`;
      const uploaded = await uploadToCloudinary({
        env,
        data: base64ToBytes(imageData),
        filename,
        trackingId: typeof body.trackingId === 'string' ? body.trackingId : undefined,
        uploadedBy: { userId: user.userId, email: user.email },
      }).catch((error) => {
        logger.error('Cloudinary upload failed, returning image without a hosted URL', error);
        return null;
      });

      return json({ imageData, url: uploaded?.url, publicId: uploaded?.publicId });
    } catch (error) {
      logger.error('Image generation failed', error);
      return json({ error: error instanceof Error ? error.message : 'Image generation failed' }, 502);
    }
  }

  return json({ error: 'Unknown op' }, 400);
}

async function plan(
  body: { image?: string; message?: string; model?: string; provider?: ProviderInfo },
  request: Request,
  env: any,
) {
  const { image, message = '', model, provider } = body;

  const hasImage = typeof image === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(image);

  if (!hasImage && !message.trim()) {
    return json({ error: 'A reference image or a description of the site is required.' }, 400);
  }

  if (!model || !provider?.name) {
    return json({ error: 'Model and provider are required.' }, 400);
  }

  const { apiKeys } = await readAppConfig(env);

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n` +
                `The user's request for the site: ${message.slice(0, 4000) || '(none)'}\n\n` +
                (hasImage
                  ? 'Which images should be generated to match this reference?'
                  : 'Which images should be generated for this site?'),
            },
            ...(hasImage ? [{ type: 'image', image }] : []),
          ] as any,
        },
      ],
      env,
      apiKeys,
      providerSettings: getProviderSettingsFromCookie(request.headers.get('Cookie')),
      options: {
        system: hasImage ? ASSET_PLAN_SYSTEM_PROMPT : TEXT_ASSET_PLAN_SYSTEM_PROMPT,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(PLAN_TIMEOUT_MS),
      },
    });

    // Read the stream directly: in this SDK version `result.text` never settles if the stream errors.
    let text = '';

    for await (const part of result.fullStream) {
      if (part.type === 'error') {
        throw part.error;
      }

      if (part.type === 'text-delta') {
        text += part.textDelta;
      }
    }

    logger.info(`Reference image plan: ${text.length} chars`);

    return json({ images: parseAssetPlan(text) });
  } catch (error) {
    logger.error('Planning reference images failed', error);
    const reason = error instanceof Error ? error.message : String(error);

    return json({ error: `The AI could not plan the images (${reason.slice(0, 200)})` }, 502);
  }
}
