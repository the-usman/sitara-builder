import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getApiKeysFromCookie } from '~/lib/api/cookies';

type Provider = 'openai' | 'fal' | 'gemini';

const SIZE_TO_FAL: Record<string, string> = {
  '1024x1024': 'square',
  '1792x1024': 'landscape_16_9',
  '1024x1792': 'portrait_16_9',
};

const SIZE_TO_GEMINI: Record<string, string> = {
  '1024x1024': '1:1',
  '1792x1024': '16:9',
  '1024x1792': '9:16',
};

export async function action({ context, request }: ActionFunctionArgs) {
  const {
    prompt,
    size = '1024x1024',
    provider = 'fal',
    model,
  } = await request.json<{
    prompt: string;
    size?: string;
    provider?: Provider;
    model?: string;
  }>();

  if (!prompt?.trim()) {
    throw new Response('Prompt is required', { status: 400 });
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const env = context.cloudflare?.env as any;

  const slug =
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) + '.png';

  if (provider === 'fal') {
    return await generateWithFal({ prompt, size, model: model || 'fal-ai/flux/schnell', apiKeys, env, slug });
  }

  if (provider === 'gemini') {
    return await generateWithGemini({ prompt, size, apiKeys, env, slug });
  }

  return await generateWithOpenAI({ prompt, size, model: model || 'dall-e-3', apiKeys, env, slug });
}

// ── fal.ai ──────────────────────────────────────────────────────────────────

async function generateWithFal({
  prompt,
  size,
  model,
  apiKeys,
  env,
  slug,
}: {
  prompt: string;
  size: string;
  model: string;
  apiKeys: Record<string, string>;
  env: any;
  slug: string;
}) {
  const falKey = apiKeys?.FAL_KEY || env?.FAL_KEY || process.env.FAL_KEY;

  if (!falKey) {
    throw new Response('FAL_KEY not configured. Add it in Settings → API Keys.', { status: 401 });
  }

  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: SIZE_TO_FAL[size] ?? 'square',
      num_inference_steps: model.includes('schnell') ? 4 : 28,
      num_images: 1,
      enable_safety_checker: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Response((err as any)?.detail || 'fal.ai generation failed', { status: res.status });
  }

  const data = await res.json();
  const imageUrl: string = (data as any).images?.[0]?.url;

  if (!imageUrl) {
    throw new Response('No image returned from fal.ai', { status: 502 });
  }

  // Download and convert to base64 so the client has a uniform response format
  const imgRes = await fetch(imageUrl);
  const buffer = await imgRes.arrayBuffer();
  const imageData = Buffer.from(buffer).toString('base64');

  return new Response(JSON.stringify({ imageData, filename: slug }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Google Gemini Imagen 3 ───────────────────────────────────────────────────

async function generateWithGemini({
  prompt,
  size,
  apiKeys,
  env,
  slug,
}: {
  prompt: string;
  size: string;
  apiKeys: Record<string, string>;
  env: any;
  slug: string;
}) {
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

  return new Response(JSON.stringify({ imageData, filename: slug }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── OpenAI DALL-E ────────────────────────────────────────────────────────────

async function generateWithOpenAI({
  prompt,
  size,
  model,
  apiKeys,
  env,
  slug,
}: {
  prompt: string;
  size: string;
  model: string;
  apiKeys: Record<string, string>;
  env: any;
  slug: string;
}) {
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
  const imageData: string = (data as any).data[0].b64_json;

  return new Response(JSON.stringify({ imageData, filename: slug }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
