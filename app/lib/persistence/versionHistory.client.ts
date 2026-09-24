import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import type { FileMap } from '~/lib/stores/files';
import { db, chatId, chatMetadata } from './useChatHistory';
import {
  getSnapshot,
  getSnapshotHistory,
  getSnapshotHistoryEntry,
  setSnapshot,
  type SnapshotHistoryEntry,
} from './db';
import { writeSnapshotToContainer } from './snapshotFiles.client';

export type { SnapshotHistoryEntry };

/** Lists saved versions of the current chat's files, newest first. */
export async function listSnapshotHistory(): Promise<SnapshotHistoryEntry[]> {
  const id = chatId.get();

  if (!db || !id) {
    return [];
  }

  try {
    return await getSnapshotHistory(db, id);
  } catch (error) {
    console.error('Failed to load snapshot history:', error);
    return [];
  }
}

/** Restores the project's files to a previously saved version, and makes it the new "latest" snapshot. */
export async function restoreSnapshotVersion(historyId: number): Promise<boolean> {
  const id = chatId.get();

  if (!db || !id) {
    return false;
  }

  try {
    const entry = await getSnapshotHistoryEntry(db, historyId);

    if (!entry) {
      toast.error('That version is no longer available.');
      return false;
    }

    await writeSnapshotToContainer(entry.snapshot, workbenchStore.files.get());
    await setSnapshot(db, id, entry.snapshot);
    toast.success(`Restored version from ${new Date(entry.timestamp).toLocaleString()}`);

    return true;
  } catch (error) {
    console.error('Failed to restore snapshot version:', error);
    toast.error('Failed to restore that version.');
    return false;
  }
}

/** One version of the project = one commit on its GitHub repo, described by the AI-written commit message. */
export interface GithubVersion {
  sha: string;
  title: string;
  description: string;
  date: string;
  url: string;
}

/** The current chat's linked GitHub repo, if it is auto-pushing to one. */
export function getLinkedGithubRepo(): string | undefined {
  return chatMetadata.get()?.githubUrl;
}

/** Lists the project's GitHub versions, newest first. Returns undefined when they can't be loaded. */
export async function listGithubVersions(repoUrl: string): Promise<GithubVersion[] | undefined> {
  try {
    const response = await fetch(`/api/github-history?repoUrl=${encodeURIComponent(repoUrl)}`);

    if (!response.ok) {
      return undefined;
    }

    return ((await response.json()) as { versions: GithubVersion[] }).versions;
  } catch (error) {
    console.error('Failed to load GitHub version history:', error);
    return undefined;
  }
}

/** Repo paths are stored either as `home/project/x` (auto-push) or `x`; the workbench wants `/home/project/x`. */
function toWorkbenchPath(repoPath: string): string {
  const workdir = WORK_DIR.replace(/^\//, '');

  return repoPath.startsWith(`${workdir}/`) ? `/${repoPath}` : `${WORK_DIR}/${repoPath}`;
}

/**
 * Restores the project to an earlier GitHub version. The repo gets a new commit with that version's
 * files (history is kept), then the same files are written into the live workbench.
 */
export async function restoreGithubVersion(repoUrl: string, version: GithubVersion): Promise<boolean> {
  const id = chatId.get();

  try {
    const restoreResponse = await fetch('/api/github-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, sha: version.sha }),
    });

    if (!restoreResponse.ok) {
      const body = (await restoreResponse.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `HTTP ${restoreResponse.status}`);
    }

    const pullResponse = await fetch(
      `/api/github-pull?repoUrl=${encodeURIComponent(repoUrl)}&ref=${encodeURIComponent(version.sha)}`,
    );

    if (!pullResponse.ok) {
      throw new Error('Could not download that version');
    }

    const { files: pulled } = (await pullResponse.json()) as { files: FileMap };
    const files: FileMap = {};

    for (const [repoPath, entry] of Object.entries(pulled)) {
      if (entry?.type !== 'file') {
        continue;
      }

      const path = toWorkbenchPath(repoPath);

      // Make sure every parent folder exists before its files are written.
      const segments = path.slice(WORK_DIR.length + 1).split('/');

      for (let i = 1; i < segments.length; i++) {
        files[`${WORK_DIR}/${segments.slice(0, i).join('/')}`] = { type: 'folder' };
      }

      files[path] = entry;
    }

    const previous = db && id ? await getSnapshot(db, id) : undefined;
    const snapshot = { chatIndex: previous?.chatIndex ?? '', summary: previous?.summary, files };

    await writeSnapshotToContainer(snapshot, workbenchStore.files.get());

    if (db && id) {
      await setSnapshot(db, id, snapshot);
    }

    toast.success(`Restored: ${version.title}`);

    return true;
  } catch (error) {
    console.error('Failed to restore GitHub version:', error);
    toast.error(`Failed to restore that version: ${error instanceof Error ? error.message : 'unknown error'}`);

    return false;
  }
}
