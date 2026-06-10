import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import type { ProviderInfo } from '~/types/model';

const VALID_CATEGORIES = [
  'architecture',
  'characters-creatures',
  'furniture-home',
  'vehicles-transportation',
  'nature-plants',
  'science-technology',
  'food-drink',
  'fashion-style',
  'art-abstract',
];

export async function action({ context, request }: ActionFunctionArgs) {
  const { messages, model, provider } = await request.json<{
    messages: Array<{ role: string; content: any }>;
    model: string;
    provider: ProviderInfo;
  }>();

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const chatText = messages
    .filter((m) => m.role === 'user')
    .map((m) => {
      const content = Array.isArray(m.content)
        ? m.content.find((c: any) => c.type === 'text')?.text ?? ''
        : m.content;
      return (content as string).replace(/^\[Model:.*?\]\n\n\[Provider:.*?\]\n\n/s, '').trim();
    })
    .filter(Boolean)
    .slice(0, 6)
    .join('\n---\n');

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\nBased on this website-building conversation, decide the single most relevant 3D model to embed in the website. Output ONLY valid JSON with exactly these two keys:\n- "query": a specific 2-5 word search term for Sketchfab (e.g. "modern office chair", "oak tree", "sports car", "space rocket")\n- "category": one of [${VALID_CATEGORIES.join(', ')}] or "" if none fits\n\nConversation:\n${chatText}\n\nReply with ONLY valid JSON, no extra text. Example: {"query":"modern dining chair","category":"furniture-home"}`,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
    });

    const raw = (await result.text).trim();
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const query = String(parsed.query || 'architecture model').trim();
    const category = VALID_CATEGORIES.includes(parsed.category) ? (parsed.category as string) : '';

    return new Response(JSON.stringify({ query, category }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ query: 'architecture model', category: '' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
