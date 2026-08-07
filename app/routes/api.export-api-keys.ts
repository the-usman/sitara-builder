import type { LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { requireSuperAdmin } from '~/lib/auth.server';
import { readAppConfig } from '~/lib/config/app-config.server';

/**
 * Returns provider API keys in plaintext, so it is restricted to super admins.
 * It previously ran with no authentication at all, which was harmless only
 * while keys lived in the caller's own cookie — now that they are centrally
 * managed, an open endpoint here would hand them to any visitor.
 */
export const loader: LoaderFunction = async ({ context, request }) => {
  const env = context?.cloudflare?.env as any;
  await requireSuperAdmin(request, env);

  const { apiKeys: apiKeysFromConfig } = await readAppConfig(env);

  // Initialize the LLM manager to access environment variables
  const llmManager = LLMManager.getInstance(env);

  // Get all provider instances to find their API token keys
  const providers = llmManager.getAllProviders();

  // Create a comprehensive API keys object
  const apiKeys: Record<string, string> = { ...apiKeysFromConfig };

  // For each provider, check all possible sources for API keys
  for (const provider of providers) {
    if (!provider.config.apiTokenKey) {
      continue;
    }

    const envVarName = provider.config.apiTokenKey;

    // Skip if we already have this provider's key from cookies
    if (apiKeys[provider.name]) {
      continue;
    }

    // Check environment variables in order of precedence
    const envValue =
      (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
      process.env[envVarName] ||
      llmManager.env[envVarName];

    if (envValue) {
      apiKeys[provider.name] = envValue;
    }
  }

  return Response.json(apiKeys);
};
