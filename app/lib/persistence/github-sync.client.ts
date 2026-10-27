import { atom } from 'nanostores';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import type { FileMap } from '~/lib/stores/files';
import type { Message } from 'ai';
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';

const ENDPOINT = '/api/github-push';

/** Mirrors chat-sync.client.ts's debounce window, per the same "coalesce bursts" rationale. */
const PUSH_DEBOUNCE_MS = 4000;

export interface GithubPushArgs {
  trackingId: string;

  /** A getter is read when the push actually runs, so a delayed or queued push uploads the latest files. */
  files: FileMap | (() => FileMap);
  commitMessage?: string;

  /** Latest user prompt — lets the server's AI write a meaningful commit description. */
  userPrompt?: string;
  clientChatId?: string;
}

/** Plain text of the most recent user message, used as context for AI commit messages. */
export function getLastUserPrompt(messages: Message[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    if (message.role !== 'user') {
      continue;
    }

    const content = message.content as unknown;
    const text =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content
              .filter((part: any) => part?.type === 'text')
              .map((part: any) => part.text)
              .join('\n')
          : '';

    // Prompts are prefixed with [Model: ...] / [Provider: ...] markers — keep only what the user typed.
    const cleaned = text.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').trim();

    if (cleaned) {
      return cleaned;
    }
  }

  return undefined;
}

export interface GithubPushResult {
  ok: boolean;
  repoUrl?: string;

  /** Why the push failed, for callers that report it themselves (the Sync Files button). */
  error?: string;
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

/** GitHub pushes waiting or running. The Version History dialog shows a "saving" state and reloads when it drops to 0. */
export const githubPushesPending = atom(0);

function adjustPending(delta: number): void {
  githubPushesPending.set(Math.max(0, githubPushesPending.get() + delta));
}

const inFlightPushes = new Map<string, Promise<GithubPushResult>>();

/**
 * Uploads one chat's files to its GitHub repo. Never throws — auto-push is a background convenience.
 * Pushes for the same chat run one at a time: two overlapping pushes would both build on the same
 * branch head, and the second one's ref update would be rejected, losing that version.
 */
export function pushToGithub(args: GithubPushArgs): Promise<GithubPushResult> {
  const previous = inFlightPushes.get(args.trackingId) ?? Promise.resolve();

  adjustPending(1);

  const run = previous
    .catch(() => undefined)
    .then(() => runGithubPush(args))
    .finally(() => adjustPending(-1));

  inFlightPushes.set(args.trackingId, run);
  void run.finally(() => {
    if (inFlightPushes.get(args.trackingId) === run) {
      inFlightPushes.delete(args.trackingId);
    }
  });

  return run;
}

async function runGithubPush(args: GithubPushArgs): Promise<GithubPushResult> {
  const files = toPlainFiles(typeof args.files === 'function' ? args.files() : args.files);

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
        userPrompt: args.userPrompt,
        clientChatId: args.clientChatId,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const message = body.error || `HTTP ${response.status}`;
      reportPushFailure(args.trackingId, message);

      return { ok: false, error: message };
    }

    const data = (await response.json()) as { success: boolean; skipped?: boolean; repoUrl?: string };

    if (data.skipped) {
      return { ok: false, error: 'GitHub sync is not set up for this chat' };
    }

    warnedTrackingIds.delete(args.trackingId);

    return { ok: true, repoUrl: data.repoUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportPushFailure(args.trackingId, message);

    return { ok: false, error: message };
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
  } else {
    adjustPending(1);
  }

  pendingPushes.set(
    args.trackingId,
    setTimeout(() => {
      pendingPushes.delete(args.trackingId);

      const push = pushToGithub(args);
      adjustPending(-1);

      void push.then((result) => {
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
    adjustPending(-1);
  }
}
