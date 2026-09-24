import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  getLinkedGithubRepo,
  listGithubVersions,
  listSnapshotHistory,
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    const linkedRepo = getLinkedGithubRepo();

    setIsLoading(true);
    setRepoUrl(linkedRepo);
    setGithubVersions(undefined);

    (async () => {
      // GitHub is the source of truth for linked chats; fall back to the local snapshots if it can't be reached.
      const versions = linkedRepo ? await listGithubVersions(linkedRepo) : undefined;
      const local = versions ? [] : await listSnapshotHistory();

      if (!cancelled) {
        setGithubVersions(versions);
        setEntries(local);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleRestore = async (key: string, restore: () => Promise<boolean>) => {
    setRestoringId(key);

    const success = await restore();
    setRestoringId(null);

    if (success) {
      onClose();
    }
  };

  const rows = githubVersions
    ? githubVersions.map((version, index) => ({
        key: version.sha,
        title: version.title,
        subtitle: new Date(version.date).toLocaleString(),
        detail: version.description,
        badge: index === 0 ? 'Latest' : undefined,
        restore: () => restoreGithubVersion(repoUrl as string, version),
      }))
    : entries.map((entry, index) => ({
        key: String(entry.id),
        title: index === 0 ? 'Latest' : new Date(entry.timestamp).toLocaleString(),
        subtitle: index === 0 ? new Date(entry.timestamp).toLocaleString() : '',
        detail: entry.snapshot.summary || '',
        badge: undefined,
        restore: () => restoreSnapshotVersion(entry.id),
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
            className="w-[90vw] md:w-[480px]"
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
                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-bolt-elements-textSecondary">
                      <div className="i-ph:spinner animate-spin" />
                      Loading versions…
                    </div>
                  )}

                  {!isLoading && rows.length === 0 && (
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
