import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { getChats } from '~/lib/project-tracker.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);
  const chats = await getChats(user.userId, user.role, env);

  return json({ chats });
}
