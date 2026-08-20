import { webcontainer } from '~/lib/webcontainer';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';

/**
 * Writes every file/folder in a snapshot into the live WebContainer filesystem.
 *
 * When `currentFiles` is given, any file that exists now but isn't part of the
 * snapshot being applied is removed first - without this, restoring an older
 * version would leave newer files lying around instead of actually reverting.
 * It's omitted at initial chat load, where the container is still empty.
 */
export async function writeSnapshotToContainer(snapshot?: Snapshot, currentFiles?: FileMap): Promise<void> {
  const container = await webcontainer;
  const files = snapshot?.files;

  if (!files) {
    return;
  }

  const stripWorkdir = (path: string) => (path.startsWith(container.workdir) ? path.replace(container.workdir, '') : path);

  if (currentFiles) {
    for (const [rawPath, value] of Object.entries(currentFiles)) {
      if (value?.type !== 'file' || files[rawPath]) {
        continue;
      }

      try {
        await container.fs.rm(stripWorkdir(rawPath));
      } catch {
        // already gone - fine
      }
    }
  }

  for (const [rawPath, value] of Object.entries(files)) {
    if (value?.type === 'folder') {
      await container.fs.mkdir(stripWorkdir(rawPath), { recursive: true });
    }
  }

  for (const [rawPath, value] of Object.entries(files)) {
    if (value?.type !== 'file') {
      continue;
    }

    const path = stripWorkdir(rawPath);

    /*
     * Binary content is stored base64-encoded (see FilesStore#createFile) - it must be
     * decoded back to raw bytes before writing, or the file on disk ends up containing
     * the base64 text itself instead of the actual image/video/svg.
     */
    if (value.isBinary) {
      const binary = Uint8Array.from(atob(value.content), (char) => char.charCodeAt(0));
      await container.fs.writeFile(path, binary);
    } else {
      await container.fs.writeFile(path, value.content, { encoding: 'utf8' });
    }
  }
}
