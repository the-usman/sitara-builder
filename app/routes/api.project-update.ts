import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { updateProjectUrl } from '~/lib/project-tracker.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  await requireAuth(request, env);

  const { chatId, field, url } = (await request.json()) as {
    chatId: string;
    field: 'githubUrl' | 'netlifyUrl' | 'vercelUrl';
    url: string;
  };

  if (!chatId || !field || !url) {
    return json({ error: 'chatId, field, and url are required' }, { status: 400 });
  }

  await updateProjectUrl(chatId, field, url, env);
  return json({ success: true });
}
