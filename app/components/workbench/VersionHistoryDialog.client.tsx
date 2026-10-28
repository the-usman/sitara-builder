import * as Dialog from '@radix-ui/react-dialog';
import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { githubPushesPending } from '~/lib/persistence/github-sync.client';
import {
  downloadGithubVersion,
  downloadSnapshotVersion,
  getLinkedGithubRepo,
  listGithubVersions,
  listSnapshotHistory,
  newChatFromGithubVersion,
  newChatFromSnapshotVersion,
  restoreGithubVersion,
  restoreSnapshotVersion,
  type GithubVersion,
  type SnapshotHistoryEntry,
} from '~/lib/persistence/versionHistory.client';

interface VersionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistoryDialog({ isOpen, onClose }: VersionHistoryDialogProps) {
  const [entries, setEntries] = useState<SnapshotHistoryEntry[]>([]);
  const [githubVersions, setGithubVersions] = useState<GithubVersion[] | undefined>(undefined);
  const [repoUrl, setRepoUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);
  const pendingPushes = useStore(githubPushesPending);
  const previousPending = useRef(pendingPushes);

  // A push to GitHub just finished: reload so the new version appears without reopening the dialog.
  useEffect(() => {
    if (previousPending.current > 0 && pendingPushes === 0) {
      setReloadKey((key) => key + 1);
    }

    previousPending.current = pendingPushes;
  }, [pendingPushes]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;
    const linkedRepo = getLinkedGithubRepo();
    const isReload = reloadKey > 0;

    // On a background reload keep showing the current list instead of flashing the spinner.
    if (!isReload) {
      setIsLoading(true);
      setGithubVersions(undefined);
    }

    setRepoUrl(linkedRepo);

    (async () => {
      // GitHub is the source of truth for linked chats; fall back to the local snapshots if it can't be reached.
      const github = linkedRepo ? await listGithubVersions(linkedRepo) : undefined;
      const local = github?.versions ? [] : await listSnapshotHistory();

      if (!cancelled) {
        setGithubVersions(github?.versions);
        setEntries(local);
        setGithubError(github?.error);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadKey]);

  useEffect(() => {
    if (!isOpen) {
      setReloadKey(0);
    }
  }, [isOpen]);

  const handleRestore = async (key: string, restore: () => Promise<boolean>) => {
    setRestoringId(key);

    const success = await restore();
    setRestoringId(null);

    if (success) {
      onClose();
    }
  };

  // Unlike restore and new chat, a download leaves you where you are, so the dialog stays open.
  const handleDownload = async (key: string, download: () => Promise<boolean>) => {
    setRestoringId(key);
    await download();
    setRestoringId(null);
  };

  const rows = githubVersions
    ? githubVersions.map((version, index) => ({
        key: version.sha,
        title: version.title,
        subtitle: new Date(version.date).toLocaleString(),
        detail: version.description,
        badge: index === 0 ? 'Latest' : undefined,
        restore: () => restoreGithubVersion(repoUrl as string, version),
        newChat: () => newChatFromGithubVersion(repoUrl as string, version),
        download: () => downloadGithubVersion(repoUrl as string, version),
      }))
    : entries.map((entry, index) => ({
        key: String(entry.id),
        title: index === 0 ? 'Latest' : new Date(entry.timestamp).toLocaleString(),
        subtitle: index === 0 ? new Date(entry.timestamp).toLocaleString() : '',
        detail: entry.snapshot.summary || '',
        badge: undefined,
        restore: () => restoreSnapshotVersion(entry.id),
        newChat: () => newChatFromSnapshotVersion(entry.id),
        download: () => downloadSnapshotVersion(entry.id),
      }));

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[90vw] md:w-[560px]"
          >
            <Dialog.Content
              className="bg-white dark:bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark shadow-xl"
              aria-describedby="version-history-description"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-bolt-elements-background-depth-3 flex items-center justify-center text-purple-500">
                    <div className="i-ph:clock-counter-clockwise w-5 h-5" />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-medium text-bolt-elements-textPrimary">
                      Version History
                    </Dialog.Title>
                    <p id="version-history-description" className="text-sm text-bolt-elements-textSecondary">
                      {githubVersions
                        ? 'Every version synced to GitHub, described by AI. Restoring keeps all history.'
                        : "Restore an earlier saved state of this project's files"}
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      onClick={onClose}
                      className="ml-auto p-2 rounded-lg transition-all duration-200 ease-in-out bg-transparent text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor"
                    >
                      <span className="i-ph:x block w-5 h-5" aria-hidden="true" />
                      <span className="sr-only">Close dialog</span>
                    </button>
                  </Dialog.Close>
                </div>

                <div className="max-h-[360px] overflow-y-auto space-y-2">
                  {pendingPushes > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-bolt-elements-borderColor text-xs text-bolt-elements-textSecondary">
                      <div className="i-ph:spinner animate-spin shrink-0" />
                      Saving your latest changes to GitHub — the new version will appear here in a moment.
                    </div>
                  )}

                  {!isLoading && githubError && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-bolt-elements-borderColor text-xs text-bolt-elements-textSecondary">
                      <div className="i-ph:warning-circle shrink-0 w-4 h-4 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-bolt-elements-textPrimary">Couldn't load the version history from GitHub.</p>
                        <p className="mt-0.5 break-words">{githubError}</p>
                        {entries.length > 0 && (
                          <p className="mt-0.5">Showing versions saved in this browser instead.</p>
                        )}
                      </div>
                      <button
                        onClick={() => setReloadKey((key) => key + 1)}
                        className="shrink-0 font-medium px-2 py-1 rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:opacity-90"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-bolt-elements-textSecondary">
                      <div className="i-ph:spinner animate-spin" />
                      Loading versions…
                    </div>
                  )}

                  {!isLoading && rows.length === 0 && pendingPushes === 0 && !githubError && (
                    <div className="py-8 text-center text-sm text-bolt-elements-textSecondary">
                      No saved versions yet. A version is saved automatically each time the AI edits your files.
                    </div>
                  )}

                  {!isLoading &&
                    rows.map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-bolt-elements-textPrimary truncate" title={row.title}>
                            {row.title}
                            {row.badge && (
                              <span className="ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-bolt-elements-item-backgroundActive text-bolt-elements-item-contentActive">
                                {row.badge}
                              </span>
                            )}
                          </p>
                          {row.subtitle && <p className="text-xs text-bolt-elements-textTertiary">{row.subtitle}</p>}
                          {row.detail && (
                            <p className="text-xs text-bolt-elements-textTertiary whitespace-pre-line line-clamp-3 mt-0.5">
                              {row.detail}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownload(`zip:${row.key}`, row.download)}
                          disabled={restoringId !== null}
                          title="Download this version as a zip (can be opened again with Import Zip)"
                          aria-label="Download this version as a zip"
                          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md border border-bolt-elements-borderColor text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span
                            className={
                              restoringId === `zip:${row.key}`
                                ? 'i-ph:spinner animate-spin w-4 h-4'
                                : 'i-ph:download-simple w-4 h-4'
                            }
                          />
                        </button>
                        <button
                          onClick={() => handleRestore(`new:${row.key}`, row.newChat)}
                          disabled={restoringId !== null}
                          title="Open this version as a new chat. The current chat stays as it is."
                          className="shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md border border-bolt-elements-borderColor text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="i-ph:chat-circle-dots w-3.5 h-3.5" />
                          {restoringId === `new:${row.key}` ? 'Creating…' : 'New chat'}
                        </button>
                        <button
                          onClick={() => handleRestore(row.key, row.restore)}
                          disabled={restoringId !== null}
                          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-bolt-elements-item-backgroundActive text-bolt-elements-item-contentActive hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restoringId === row.key ? 'Restoring…' : 'Restore'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </Dialog.Content>
          </motion.div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
