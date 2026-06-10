import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import type { ProviderInfo } from '~/types/model';

export async function action({ context, request }: ActionFunctionArgs) {
  const { messages, model, provider } = await request.json<{
    messages: Array<{ role: string; content: any }>;
    model: string;
    provider: ProviderInfo;
  }>();

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  // Extract plain text from user messages, strip [Model:] / [Provider:] prefixes
  const chatText = messages
    .filter((m) => m.role === 'user')
    .map((m) => {
      const content = Array.isArray(m.content) ? m.content.find((c: any) => c.type === 'text')?.text ?? '' : m.content;
      return (content as string).replace(/^\[Model:.*?\]\n\n\[Provider:.*?\]\n\n/s, '').trim();
    })
    .filter(Boolean)
    .slice(0, 6) // use first 6 user turns — enough context, not too much
    .join('\n---\n');

  const result = await streamText({
    messages: [
      {
        role: 'user',
        content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\nYou are analyzing a website that was built through the following chat conversation. Create a REUSABLE TEMPLATE PROMPT that captures its structure and features, while keeping it fully customizable.

The template prompt MUST naturally include ALL four of these exact placeholders:
- {THEME} — light or dark theme
- {INDUSTRY} — type of business/website (e.g., pizza restaurant, automation agency, portfolio)
- {BRAND_NAME} — the company or product name
- {PRIMARY_COLOR} — the primary color scheme (e.g., warm orange, deep purple, electric blue)

Chat history that built this website:
${chatText}

Write a single cohesive template prompt (4–8 sentences) that:
1. Describes the website layout and sections
2. Mentions key UI patterns and features used
3. Embeds all 4 placeholders naturally in context
4. Is detailed enough to recreate a similar site but flexible for any industry

Reply with ONLY the template prompt — no explanations, no labels, no quotes.`,
      },
    ],
    env: context.cloudflare?.env as any,
    apiKeys,
    providerSettings,
  });

  const raw = await result.text;

  return new Response(JSON.stringify({ templatePrompt: raw.trim() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
