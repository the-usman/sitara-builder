import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import type { ProviderInfo } from '~/types/model';

export async function action({ context, request }: ActionFunctionArgs) {
  const { imageData, model, provider } = await request.json<{
    imageData: string;
    model: string;
    provider: ProviderInfo;
  }>();

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\nLook at this image and suggest a short descriptive filename for it.\n\nRules:\n- lowercase letters and hyphens only\n- no file extension\n- 2 to 4 words maximum\n- describe the main subject or purpose\n- suitable for a web project asset\n\nReply with ONLY the filename slug, nothing else.\nExamples: pizza-hero-banner, team-photo, product-showcase`,
            },
            {
              type: 'image',
              image: `data:image/png;base64,${imageData}`,
            },
          ] as any,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
    });

    const raw = await result.text;
    const filename =
      raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) || 'uploaded-image';

    return new Response(JSON.stringify({ filename }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_err) {
    // Non-vision models or quota errors — return a safe fallback
    return new Response(JSON.stringify({ filename: 'uploaded-image' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
