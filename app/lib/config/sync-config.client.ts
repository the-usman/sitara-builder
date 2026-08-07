import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('config-sync');

/**
 * Pushes a credential change to the shared, server-held config.
 *
 * The connection panels keep writing to localStorage for their own UI state,
 * but that copy is no longer authoritative — the server reads credentials only
 * from this store. Without this call an admin's "Connect" would appear to work
 * while deploys kept failing.
 *
 * A 403 is expected and ignored: an operator reaching this path has no rights
 * to change shared config, and their local copy is already inert.
 */
export async function syncProviderConfig(patch: Record<string, unknown>): Promise<boolean> {
  if (typeof fetch === 'undefined') {
    return false;
  }

  try {
    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (response.status === 403) {
      logger.debug('Not a super admin; shared config left unchanged.');
      return false;
    }

    if (!response.ok) {
      logger.error('Failed to sync shared config', response.status);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to sync shared config', error);
    return false;
  }
}
