import fileSaver from 'file-saver';
import JSZip from 'jszip';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import type { FileMap } from '~/lib/stores/files';
import { createChatFromFileContents } from '~/utils/folderImport';
import { db, chatId, chatMetadata, description } from './useChatHistory';
import {
  createChatFromMessages,
  getSnapshot,
  getSnapshotHistory,
  getSnapshotHistoryEntry,
  setSnapshot,
  type SnapshotHistoryEntry,
} from './db';
import { writeSnapshotToContainer } from './snapshotFiles.client';

const { saveAs } = fileSaver;

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

/** Lists the project's GitHub versions (its commits), newest first, or why they couldn't be loaded. */
export async function listGithubVersions(
  repoUrl: string,
): Promise<{ versions: GithubVersion[]; error?: undefined } | { versions?: undefined; error: string }> {
  try {
    const response = await fetch(`/api/github-history?repoUrl=${encodeURIComponent(repoUrl)}`, { cache: 'no-store' });

    // requireAuth answers with a redirect to /login, which fetch follows to an HTML page.
    if (response.redirected && new URL(response.url).pathname === '/login') {
      return { error: 'Your session has expired. Log in again to see the version history.' };
    }

    const body = (await response.json().catch(() => ({}))) as { versions?: GithubVersion[]; error?: string };

    if (!response.ok || !body.versions) {
      return { error: body.error || `HTTP ${response.status}` };
    }

    return { versions: body.versions };
  } catch (error) {
    console.error('Failed to load GitHub version history:', error);
    return { error: error instanceof Error ? error.message : String(error) };
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
      await setSnapshot(db, id, snapshot, { recordHistory: false });
    }

    toast.success(`Restored: ${version.title}`);

    return true;
  } catch (error) {
    console.error('Failed to restore GitHub version:', error);
    toast.error(`Failed to restore that version: ${error instanceof Error ? error.message : 'unknown error'}`);

    return false;
  }
}

/** A version's files with project-relative paths (`src/App.tsx`), split into text and binary. */
function collectVersionFiles(files: FileMap): {
  textFiles: { path: string; content: string }[];
  binaryFiles: string[];
} {
  const workdir = WORK_DIR.replace(/^\//, '');
  const textFiles: { path: string; content: string }[] = [];
  const binaryFiles: string[] = [];

  for (const [rawPath, entry] of Object.entries(files)) {
    if (entry?.type !== 'file') {
      continue;
    }

    // Snapshot paths are `/home/project/x`, repo paths are `home/project/x` (auto-push) or `x`.
    const path = rawPath.replace(/^\/+/, '').replace(new RegExp(`^${workdir}/`), '');

    if (entry.isBinary) {
      binaryFiles.push(path);
    } else {
      textFiles.push({ path, content: entry.content });
    }
  }

  return { textFiles, binaryFiles };
}

/** Loads a locally saved version's files and a label for it. */
async function loadSnapshotVersion(historyId: number): Promise<{ files: FileMap; label: string } | undefined> {
  if (!db) {
    return undefined;
  }

  const entry = await getSnapshotHistoryEntry(db, historyId);

  if (!entry) {
    toast.error('That version is no longer available.');
    return undefined;
  }

  return { files: entry.snapshot.files, label: new Date(entry.timestamp).toLocaleString() };
}

/** Downloads a GitHub version's (commit's) files. */
async function loadGithubVersion(repoUrl: string, version: GithubVersion): Promise<{ files: FileMap; label: string }> {
  const response = await fetch(
    `/api/github-pull?repoUrl=${encodeURIComponent(repoUrl)}&ref=${encodeURIComponent(version.sha)}`,
  );

  if (!response.ok) {
    throw new Error('Could not download that version');
  }

  const { files } = (await response.json()) as { files: FileMap };

  return { files, label: version.title || version.sha.slice(0, 7) };
}

/**
 * Opens a version's files as a brand-new chat, leaving the current chat untouched. The new chat gets
 * its own GitHub repo on its first auto-push, like any other new chat.
 */
async function openFilesAsNewChat(files: FileMap, versionLabel: string): Promise<boolean> {
  if (!db) {
    toast.error('Chat storage is not available in this browser.');
    return false;
  }

  const { textFiles, binaryFiles } = collectVersionFiles(files);

  if (textFiles.length === 0) {
    toast.error('That version has no files to open.');
    return false;
  }

  const name = `${description.get() || 'Project'} (${versionLabel})`;
  const messages = await createChatFromFileContents(textFiles, binaryFiles, name, 'version');
  const newUrlId = await createChatFromMessages(db, name, messages);

  window.location.href = `/chat/${newUrlId}`;

  return true;
}

/**
 * Saves a version's files as a zip, laid out like the workbench's Download backup (files at the zip
 * root), so it can be imported again with "Import Zip". Binary files are left out, as in that backup.
 */
async function downloadFilesAsZip(files: FileMap, versionLabel: string): Promise<boolean> {
  const { textFiles } = collectVersionFiles(files);

  if (textFiles.length === 0) {
    toast.error('That version has no files to download.');
    return false;
  }

  const zip = new JSZip();

  for (const file of textFiles) {
    zip.file(file.path, file.content);
  }

  const slug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);

  const fileName = `${slug(description.get() || 'project') || 'project'}_${slug(versionLabel) || 'version'}.zip`;

  saveAs(await zip.generateAsync({ type: 'blob' }), fileName);

  return true;
}

/** Starts a new chat from a locally saved version. */
export async function newChatFromSnapshotVersion(historyId: number): Promise<boolean> {
  try {
    const version = await loadSnapshotVersion(historyId);

    return version ? await openFilesAsNewChat(version.files, version.label) : false;
  } catch (error) {
    console.error('Failed to start a new chat from a saved version:', error);
    toast.error('Failed to create a new chat from that version.');

    return false;
  }
}

/** Starts a new chat from a GitHub version (commit), without touching the current chat or its repo. */
export async function newChatFromGithubVersion(repoUrl: string, version: GithubVersion): Promise<boolean> {
  try {
    const { files, label } = await loadGithubVersion(repoUrl, version);

    return await openFilesAsNewChat(files, label);
  } catch (error) {
    console.error('Failed to start a new chat from a GitHub version:', error);
    toast.error(`Failed to create a new chat: ${error instanceof Error ? error.message : 'unknown error'}`);

    return false;
  }
}

/** Downloads a locally saved version as a zip. */
export async function downloadSnapshotVersion(historyId: number): Promise<boolean> {
  try {
    const version = await loadSnapshotVersion(historyId);

    return version ? await downloadFilesAsZip(version.files, version.label) : false;
  } catch (error) {
    console.error('Failed to download a saved version:', error);
    toast.error('Failed to download that version.');

    return false;
  }
}

/** Downloads a GitHub version (commit) as a zip. */
export async function downloadGithubVersion(repoUrl: string, version: GithubVersion): Promise<boolean> {
  try {
    const { files, label } = await loadGithubVersion(repoUrl, version);

    return await downloadFilesAsZip(files, label);
  } catch (error) {
    console.error('Failed to download a GitHub version:', error);
    toast.error(`Failed to download that version: ${error instanceof Error ? error.message : 'unknown error'}`);

    return false;
  }
}
