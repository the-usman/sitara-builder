import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { z } from 'zod';
import { isSuperAdmin, requireAuth, requireSuperAdmin } from '~/lib/auth.server';
import { readAppConfig, toStatus, writeAppConfig, type AppConfigPatch } from '~/lib/config/app-config.server';
import type { ServerEnv } from '~/lib/mongo.server';

function envOf(context: unknown): ServerEnv {
  return (context as any)?.cloudflare?.env;
}

/**
 * Every authenticated user may read the *status* of the shared config so the
 * settings panel can show what is wired up. Secrets are never included in the
 * response — not even for super admins, who set new values rather than reading
 * back existing ones.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = envOf(context);
  const user = await requireAuth(request, env);
  const canEdit = await isSuperAdmin(user, env);
  const config = await readAppConfig(env);

  return json(toStatus(config, canEdit));
}

const tokenPatch = z.object({
  token: z.string().optional(),
  label: z.string().max(200).optional(),
});

const patchSchema = z.object({
  github: tokenPatch.extend({ tokenType: z.enum(['classic', 'fine-grained']).optional() }).optional(),
  vercel: tokenPatch.optional(),
  netlify: tokenPatch.optional(),
  supabase: z
    .object({
      token: z.string().optional(),
      selectedProjectId: z.string().max(200).optional(),
      projectLabel: z.string().max(200).optional(),
      credentials: z
        .object({
          supabaseUrl: z.string().url(),
          anonKey: z.string(),
        })
        .optional(),
    })
    .optional(),
  apiKeys: z.record(z.string(), z.string()).optional(),
});

/**
 * Writes are restricted to super admins. `requireSuperAdmin` re-reads the role
 * from the database, so revoking someone's admin rights takes effect at once
 * rather than when their week-old session token expires.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const env = envOf(context);
  const user = await requireSuperAdmin(request, env);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: 'Invalid config payload.', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const saved = await writeAppConfig(parsed.data as AppConfigPatch, user.email, env);
    return json(toStatus(saved, true));
  } catch (error) {
    console.error('Failed to save app config:', error);
    return json({ error: 'Failed to save configuration.' }, { status: 500 });
  }
}
