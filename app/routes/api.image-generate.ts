import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { requireAuth } from '~/lib/auth.server';
import { generateFalImage, resolveFalKey } from '~/lib/.server/images/fal.server';
import { uploadToCloudinary } from '~/lib/cloudinary.server';

type Provider = 'openai' | 'fal' | 'gemini';

const SIZE_TO_GEMINI: Record<string, string> = {
  '1024x1024': '1:1',
  '1792x1024': '16:9',
  '1024x1792': '9:16',
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function action({ context, request }: ActionFunctionArgs) {
  const {
    prompt,
    size = '1024x1024',
    provider = 'fal',
    model,
    trackingId,
  } = await request.json<{
    prompt: string;
    size?: string;
    provider?: Provider;
    model?: string;
    trackingId?: string;
  }>();

  if (!prompt?.trim()) {
    throw new Response('Prompt is required', { status: 400 });
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const env = context.cloudflare?.env as any;
  const user = await requireAuth(request, env);

  const slug =
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) + '.png';

  let imageData: string;

  if (provider === 'fal') {
    // Same key lookup / FLUX.2 models as the reference-image flow.
    const falKey = await resolveFalKey(request, env);

    if (!falKey) {
      throw new Response('FAL_KEY not configured. Add it in Settings → API Keys.', { status: 401 });
    }

    try {
      imageData = await generateFalImage({
        falKey,
        prompt,
        size,
        model: model || 'fal-ai/flux-2-max',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'fal.ai generation failed';
      throw new Response(message, { status: 502 });
    }
  } else if (provider === 'gemini') {
    imageData = await generateWithGemini({ prompt, size, apiKeys, env });
  } else {
    imageData = await generateWithOpenAI({ prompt, size, model: model || 'dall-e-3', apiKeys, env });
  }

  /*
   * Host the image on Cloudinary and record it, so the site can reference a URL instead of
   * a binary written into the project (which slows the builder down). Null when Cloudinary
   * isn't configured — the client then falls back to saving it into public/.
   */
  const uploaded = await uploadToCloudinary({
    env,
    data: base64ToBytes(imageData),
    filename: slug,
    trackingId,
    uploadedBy: { userId: user.userId, email: user.email },
  }).catch((error) => {
    console.error('Cloudinary upload failed, returning image without a hosted URL:', error);
    return null;
  });

  return json({ imageData, filename: slug, url: uploaded?.url, publicId: uploaded?.publicId });
}

// ── Google Gemini Imagen 3 ───────────────────────────────────────────────────

async function generateWithGemini({
  prompt,
  size,
  apiKeys,
  env,
}: {
  prompt: string;
  size: string;
  apiKeys: Record<string, string>;
  env: any;
}): Promise<string> {
  const geminiKey =
    apiKeys?.GOOGLE_GENERATIVE_AI_API_KEY ||
    env?.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!geminiKey) {
    throw new Response('GOOGLE_GENERATIVE_AI_API_KEY not configured. Add it in Settings → API Keys.', { status: 401 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: SIZE_TO_GEMINI[size] ?? '1:1',
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Response((err as any)?.error?.message || 'Gemini Imagen generation failed', { status: res.status });
  }

  const data = await res.json();
  const imageData: string = (data as any).predictions?.[0]?.bytesBase64Encoded;

  if (!imageData) {
    throw new Response('No image returned from Gemini', { status: 502 });
  }

  return imageData;
}

// ── OpenAI DALL-E ────────────────────────────────────────────────────────────

async function generateWithOpenAI({
  prompt,
  size,
  model,
  apiKeys,
  env,
}: {
  prompt: string;
  size: string;
  model: string;
  apiKeys: Record<string, string>;
  env: any;
}): Promise<string> {
  const openaiKey = apiKeys?.OPENAI_API_KEY || env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Response('OPENAI_API_KEY not configured. Add it in Settings → API Keys.', { status: 401 });
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model, prompt, n: 1, size, response_format: 'b64_json' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Response((err as any)?.error?.message || 'OpenAI generation failed', { status: res.status });
  }

  const data = await res.json();

  return (data as any).data[0].b64_json;
}
