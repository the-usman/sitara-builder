import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { readAppConfig } from '~/lib/config/app-config.server';

/*
 * fal.ai key, wherever it was set: the user's API-key settings (cookie), the super-admin config,
 * or the server environment.
 */
const CONFIG_NAMES = ['FAL_KEY', 'fal', 'Fal', 'fal.ai', 'FAL'];

export async function resolveFalKey(request: Request, env: any): Promise<string | undefined> {
  const fromCookie = getApiKeysFromCookie(request.headers.get('Cookie'))?.FAL_KEY;

  if (fromCookie) {
    return fromCookie;
  }

  try {
    const { apiKeys } = await readAppConfig(env);
    const fromConfig = CONFIG_NAMES.map((name) => apiKeys?.[name]).find(Boolean);

    if (fromConfig) {
      return fromConfig;
    }
  } catch {
    // config unavailable (no database) — fall through to the environment
  }

  return env?.FAL_KEY || (typeof process !== 'undefined' ? process.env.FAL_KEY : undefined) || undefined;
}

export const FAL_IMAGE_SIZES: Record<string, string> = {
  '1024x1024': 'square_hd',
  '1792x1024': 'landscape_16_9',
  '1024x1792': 'portrait_16_9',
  '1365x1024': 'landscape_4_3',
};

/** Default FLUX.2 text-to-image / edit endpoints (max = highest quality). */
export const TEXT_TO_IMAGE_MODEL = 'fal-ai/flux-2-max';
export const IMAGE_TO_IMAGE_MODEL = 'fal-ai/flux-2-max/edit';

const FLEX_TEXT_TO_IMAGE = 'fal-ai/flux-2-flex';
const FLEX_IMAGE_TO_IMAGE = 'fal-ai/flux-2-flex/edit';

/** Map a text-to-image model id to its matching /edit endpoint when a reference is present. */
function resolveEndpoint(model: string | undefined, useReference: boolean): string {
  if (!model) {
    return useReference ? IMAGE_TO_IMAGE_MODEL : TEXT_TO_IMAGE_MODEL;
  }

  if (useReference) {
    if (model.endsWith('/edit')) {
      return model;
    }

    if (model === FLEX_TEXT_TO_IMAGE || model.includes('flux-2-flex')) {
      return FLEX_IMAGE_TO_IMAGE;
    }

    if (model === TEXT_TO_IMAGE_MODEL || model.includes('flux-2-max')) {
      return IMAGE_TO_IMAGE_MODEL;
    }

    // Legacy flux/dev → flux-2-max/edit; unknown models get /edit appended when possible
    if (model.includes('flux') && !model.includes('/edit') && !model.includes('image-to-image')) {
      return IMAGE_TO_IMAGE_MODEL;
    }

    return IMAGE_TO_IMAGE_MODEL;
  }

  // Text-to-image: strip /edit if a caller passed an edit id by mistake
  if (model.endsWith('/edit')) {
    return model.replace(/\/edit$/, '');
  }

  return model;
}

function isFlux2Endpoint(endpoint: string): boolean {
  return endpoint.includes('flux-2');
}

/** Generates one image and returns it base64-encoded. Throws an Error with fal's message on failure. */
export async function generateFalImage({
  falKey,
  prompt,
  size,
  imageUrl,
  model,
}: {
  falKey: string;
  prompt: string;
  size: string;
  /** Optional reference (data URL or https) — switches to Flux.2 /edit (image-to-image). */
  imageUrl?: string;
  model?: string;
}): Promise<string> {
  const useReference = typeof imageUrl === 'string' && imageUrl.length > 0;
  const endpoint = resolveEndpoint(model, useReference);
  const flux2 = isFlux2Endpoint(endpoint);

  const body: Record<string, unknown> = {
    prompt,
    image_size: FAL_IMAGE_SIZES[size] ?? 'landscape_16_9',
    enable_safety_checker: true,
    output_format: 'png',
  };

  if (useReference) {
    // FLUX.2 edit API: image_urls[]; legacy flux/dev/image-to-image used image_url + strength
    if (flux2 || endpoint.includes('/edit')) {
      body.image_urls = [imageUrl];
    } else {
      body.image_url = imageUrl;
      body.strength = 0.55;
      body.num_inference_steps = 40;
      body.num_images = 1;
    }
  } else if (!flux2) {
    // Legacy text-to-image models (flux/dev, schnell, …)
    body.num_inference_steps = endpoint.includes('schnell') ? 4 : 28;
    body.num_images = 1;
  }

  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    const detail = typeof err?.detail === 'string' ? err.detail : JSON.stringify(err?.detail ?? err);
    throw new Error(`fal.ai ${res.status}: ${detail || res.statusText}`);
  }

  const url: string | undefined = ((await res.json()) as any).images?.[0]?.url;

  if (!url) {
    throw new Error('fal.ai returned no image');
  }

  const image = await fetch(url);

  return Buffer.from(await image.arrayBuffer()).toString('base64');
}
