import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { requireAuth } from '~/lib/auth.server';
import { getSupabaseTarget } from '~/lib/config/provider-tokens.server';

const logger = createScopedLogger('api.supabase.query');

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const env = (context as any)?.cloudflare?.env;
  await requireAuth(request, env);

  /*
   * Previously the caller's `Authorization` header was forwarded straight to
   * Supabase, which let anyone run SQL against any project they held a token
   * for. The token and project now both come from the shared admin config.
   */
  const target = await getSupabaseTarget(env);

  if (!target.token) {
    return new Response('No Supabase credentials are configured. Ask a super admin to set them up.', { status: 409 });
  }

  try {
    const body = (await request.json()) as { projectId?: string; query?: string };
    const projectId = body.projectId || target.projectId;
    const query = body.query;

    if (!projectId) {
      return new Response('No Supabase project has been selected by a super admin.', { status: 409 });
    }

    logger.debug('Executing query:', { projectId, query });

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${target.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.log(e);
        errorData = { message: errorText };
      }

      logger.error(
        'Supabase API error:',
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        }),
      );

      return new Response(
        JSON.stringify({
          error: {
            status: response.status,
            statusText: response.statusText,
            message: errorData.message || errorData.error || errorText,
            details: errorData,
          },
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Query execution error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Query execution failed',
          stack: error instanceof Error ? error.stack : undefined,
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
