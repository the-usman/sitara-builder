import type { LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { requireAuth } from '~/lib/auth.server';
import { readAppConfig } from '~/lib/config/app-config.server';

export const loader: LoaderFunction = async ({ context, request }) => {
  const env = context?.cloudflare?.env as any;
  await requireAuth(request, env);

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider) {
    return Response.json({ isSet: false });
  }

  const llmManager = LLMManager.getInstance(env);
  const providerInstance = llmManager.getProvider(provider);

  if (!providerInstance || !providerInstance.config.apiTokenKey) {
    return Response.json({ isSet: false });
  }

  const envVarName = providerInstance.config.apiTokenKey;

  const { apiKeys } = await readAppConfig(env);

  /*
   * Check API key in order of precedence:
   * 1. Super-admin-managed config (previously: the caller's own cookie)
   * 2. Server environment variables (from Cloudflare env)
   * 3. Process environment variables (from .env.local)
   * 4. LLMManager environment variables
   */
  const isSet = !!(
    apiKeys?.[provider] ||
    (env as Record<string, any>)?.[envVarName] ||
    process.env[envVarName] ||
    llmManager.env[envVarName]
  );

  return Response.json({ isSet });
};
