import type { FileMap } from '~/lib/stores/files';

/*
 * The cloud snapshot only has to be enough to rebuild the project on another device, so it skips what can
 * be regenerated (build output, lockfiles) and caps uploaded media. Without this, one uploaded video
 * (base64 inflates it by a third) pushed a chat past the server's snapshot limit and made every sync slow.
 */
const REGENERABLE_PATH = /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|\.svelte-kit|\.cache|\.vercel|coverage)\//;
const LOCKFILE = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
export const MAX_SNAPSHOT_BINARY_CHARS = 6 * 1024 * 1024;

/** Returns the files worth syncing: no build output/lockfiles, and binaries only while they fit the budget (smallest first). */
export function slimSnapshotFiles(files: FileMap): FileMap {
  const slim: FileMap = {};
  const binaries: Array<[string, NonNullable<FileMap[string]>]> = [];

  for (const [path, entry] of Object.entries(files)) {
    if (!entry || REGENERABLE_PATH.test(path) || LOCKFILE.test(path)) {
      continue;
    }

    if (entry.type === 'file' && entry.isBinary) {
      binaries.push([path, entry]);
    } else {
      slim[path] = entry;
    }
  }

  let used = 0;

  for (const [path, entry] of binaries.sort((a, b) => contentLength(a[1]) - contentLength(b[1]))) {
    used += contentLength(entry);

    if (used > MAX_SNAPSHOT_BINARY_CHARS) {
      break;
    }

    slim[path] = entry;
  }

  return slim;
}

function contentLength(entry: NonNullable<FileMap[string]>): number {
  return entry.type === 'file' ? entry.content.length : 0;
}
