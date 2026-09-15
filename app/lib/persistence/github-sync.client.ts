import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import type { FileMap } from '~/lib/stores/files';

const ENDPOINT = '/api/github-push';

/** Mirrors chat-sync.client.ts's debounce window, per the same "coalesce bursts" rationale. */
const PUSH_DEBOUNCE_MS = 4000;

export interface GithubPushArgs {
  trackingId: string;
  files: FileMap;
  commitMessage?: string;
  clientChatId?: string;
}

export interface GithubPushResult {
  ok: boolean;
  repoUrl?: string;
}

function toPlainFiles(files: FileMap): Record<string, string> {
  const plain: Record<string, string> = {};

  for (const [path, dirent] of Object.entries(files)) {
    if (dirent?.type === 'file' && !dirent.isBinary && dirent.content) {
      plain[path] = dirent.content;
    }
  }

  return plain;
}

/** Uploads one chat's files to its GitHub repo. Never throws — auto-push is a background convenience. */
export async function pushToGithub(args: GithubPushArgs): Promise<GithubPushResult> {
  const files = toPlainFiles(args.files);

  if (Object.keys(files).length === 0) {
    return { ok: false };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: args.trackingId,
        files,
        commitMessage: args.commitMessage,
        clientChatId: args.clientChatId,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const message = body.error || `HTTP ${response.status}`;
      reportPushFailure(args.trackingId, message);

      return { ok: false };
    }

    const data = (await response.json()) as { success: boolean; skipped?: boolean; repoUrl?: string };

    if (data.skipped) {
      return { ok: false };
    }

    warnedTrackingIds.delete(args.trackingId);

    return { ok: true, repoUrl: data.repoUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportPushFailure(args.trackingId, message);

    return { ok: false };
  }
}

const warnedTrackingIds = new Set<string>();

function reportPushFailure(trackingId: string, message: string): void {
  logStore.logWarning(`GitHub auto-push failed: ${message}`, { trackingId });

  if (!warnedTrackingIds.has(trackingId)) {
    warnedTrackingIds.add(trackingId);
    toast.warn(`This chat isn't auto-pushing to GitHub: ${message}`);
  }
}

const pendingPushes = new Map<string, ReturnType<typeof setTimeout>>();

/** Debounced per chat, same rationale as chat-sync.client.ts's schedulePush. */
export function scheduleGithubPush(args: GithubPushArgs, onSuccess?: (repoUrl: string) => void): void {
  const existing = pendingPushes.get(args.trackingId);

  if (existing) {
    clearTimeout(existing);
  }

  pendingPushes.set(
    args.trackingId,
    setTimeout(() => {
      pendingPushes.delete(args.trackingId);
      void pushToGithub(args).then((result) => {
        if (result.ok && result.repoUrl) {
          onSuccess?.(result.repoUrl);
        }
      });
    }, PUSH_DEBOUNCE_MS),
  );
}

export function cancelPendingGithubPush(trackingId: string): void {
  const existing = pendingPushes.get(trackingId);

  if (existing) {
    clearTimeout(existing);
    pendingPushes.delete(trackingId);
  }
}
