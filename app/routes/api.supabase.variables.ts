import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { getSupabaseTarget } from '~/lib/config/provider-tokens.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any)?.cloudflare?.env;
  await requireAuth(request, env);

  try {
    // Only the project id is honoured from the client; the token is server-held.
    const body = (await request.json()) as { projectId?: string };
    const target = await getSupabaseTarget(env);
    const projectId = body.projectId || target.projectId;

    if (!target.token) {
      return json(
        { error: 'No Supabase credentials are configured. Ask a super admin to set them up.' },
        { status: 409 },
      );
    }

    if (!projectId) {
      return json({ error: 'No Supabase project has been selected by a super admin.' }, { status: 409 });
    }

    const token = target.token;

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return json({ error: `Failed to fetch API keys: ${response.statusText}` }, { status: response.status });
    }

    const apiKeys = await response.json();

    return json({ apiKeys });
  } catch (error) {
    console.error('Error fetching project API keys:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error occurred' }, { status: 500 });
  }
}
