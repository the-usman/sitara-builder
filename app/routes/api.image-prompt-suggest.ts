import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import type { ProviderInfo } from '~/types/model';

const VALID_SIZES = ['1024x1024', '1792x1024', '1024x1792'];

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
        ? (m.content.find((c: any) => c.type === 'text')?.text ?? '')
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
          content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\nBased on this website-building conversation, generate the perfect professional image for this website. Output ONLY valid JSON with exactly these two keys:\n- "prompt": a highly detailed, cinematic image generation prompt (50-80 words). Be specific about lighting, style, mood, colors, composition. Make it suitable for a professional website.\n- "size": one of ["1792x1024", "1024x1024", "1024x1792"] — use "1792x1024" for hero banners/wide shots, "1024x1792" for portrait/product shots, "1024x1024" for icons/logos/square images\n\nConversation:\n${chatText}\n\nReply with ONLY valid JSON, no extra text. Example: {"prompt":"A cinematic wide-angle shot of...","size":"1792x1024"}`,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
    });

    const raw = (await result.text).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const prompt = String(parsed.prompt || '').trim();
    const size = VALID_SIZES.includes(parsed.size) ? (parsed.size as string) : '1792x1024';

    return new Response(JSON.stringify({ prompt, size }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ prompt: '', size: '1792x1024' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
