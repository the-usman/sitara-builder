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

/** Generates one image and returns it base64-encoded. Throws an Error with fal's message on failure. */
export async function generateFalImage({
  falKey,
  prompt,
  size,
  model = 'fal-ai/flux/dev',
}: {
  falKey: string;
  prompt: string;
  size: string;
  model?: string;
}): Promise<string> {
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
    body: JSON.stringify({
      prompt,
      image_size: FAL_IMAGE_SIZES[size] ?? 'landscape_16_9',
      num_inference_steps: model.includes('schnell') ? 4 : 28,
      num_images: 1,
      enable_safety_checker: true,
    }),
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
