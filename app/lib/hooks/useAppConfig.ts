import { useCallback, useEffect, useState } from 'react';
import { useRouteLoaderData } from '@remix-run/react';
import type { AppConfigStatus } from '~/lib/config/types';

export interface AuthUserSummary {
  email: string;
  name?: string;
  role: string;
}

interface RootLoaderData {
  user: AuthUserSummary | null;
}

/**
 * The signed-in user, published by the root loader.
 *
 * The role here comes from the session token and is only used to choose what to
 * render. Never treat it as an authorization decision — the server re-reads the
 * role from the database on every privileged request.
 */
export function useAuthUser(): AuthUserSummary | null {
  const data = useRouteLoaderData('root') as RootLoaderData | undefined;
  return data?.user ?? null;
}

export function useIsSuperAdmin(): boolean {
  return useAuthUser()?.role === 'super_admin';
}

interface AppConfigState {
  status: AppConfigStatus | null;
  isLoading: boolean;
  error: string | null;
}

const CONFIG_ENDPOINT = '/api/admin/config';

/**
 * Reads the shared integration config status. Safe for every signed-in user:
 * the endpoint returns which providers are configured, never their credentials.
 */
export function useAppConfigStatus() {
  const [state, setState] = useState<AppConfigState>({ status: null, isLoading: true, error: null });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(CONFIG_ENDPOINT);

      if (!response.ok) {
        throw new Error(`Failed to load configuration (${response.status})`);
      }

      const status = (await response.json()) as AppConfigStatus;
      setState({ status, isLoading: false, error: null });
    } catch (error) {
      setState({
        status: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load configuration',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Sends a partial update. Omitted fields keep their stored value, so the
   * caller only needs to send what changed. Rejects for non-admins with the
   * server's 403 message.
   */
  const save = useCallback(async (patch: Record<string, unknown>) => {
    const response = await fetch(CONFIG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    const body = (await response.json()) as AppConfigStatus & { error?: string };

    if (!response.ok) {
      throw new Error(body.error || 'Failed to save configuration');
    }

    setState({ status: body, isLoading: false, error: null });

    return body;
  }, []);

  return { ...state, refresh, save };
}
