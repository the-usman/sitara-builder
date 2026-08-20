import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { db, chatId } from './useChatHistory';
import { getSnapshotHistory, getSnapshotHistoryEntry, setSnapshot, type SnapshotHistoryEntry } from './db';
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
