import { getEncoding } from 'istextorbinary';
import { map, type MapStore } from 'nanostores';
import { Buffer } from 'node:buffer';
import type { FileMap } from '~/lib/stores/files';
import { WORK_DIR } from '~/utils/constants';
import { path as pathUtils } from '~/utils/path';

/*
 * In-memory project file system. It replaces the StackBlitz WebContainer that used to run the
 * whole project inside the user's browser: commands, installs and the dev server now run in a
 * Vercel Sandbox (app/lib/sandbox), so the browser only needs somewhere to keep the files.
 *
 * It keeps the small slice of WebContainer's `fs` API the app uses (readFile, writeFile, mkdir,
 * readdir, rm) so file actions, snapshots, git clone and deploys work unchanged. Visible files
 * live in `files` — the same store the file tree and editor render, and the one mirrored to the
 * sandbox. Tooling directories (.git, node_modules, build caches) are kept apart so they never
 * show in the tree or get uploaded.
 */

/** Path segments kept out of the file tree and the sandbox sync. */
const HIDDEN_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.vite',
  '.turbo',
  '.cache',
  '.parcel-cache',
  '.vercel',
  'coverage',
]);

type FileData = string | Uint8Array;

export interface VirtualDirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface VirtualFS {
  readFile(filePath: string): Promise<Uint8Array>;
  readFile(filePath: string, encoding: string): Promise<string>;
  readFile(filePath: string, encoding?: string): Promise<FileData>;
  writeFile(filePath: string, data: FileData, encoding?: string | { encoding?: string }): Promise<void>;
  mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(dirPath: string): Promise<string[]>;
  readdir(dirPath: string, options: { withFileTypes: true }): Promise<VirtualDirent[]>;
  readdir(dirPath: string, options?: { withFileTypes?: boolean }): Promise<string[] | VirtualDirent[]>;
  rm(targetPath: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
}

export interface VirtualContainer {
  readonly workdir: string;
  readonly fs: VirtualFS;
}

/** The files the tree/editor show and the sandbox receives. Owned here; FilesStore exposes it. */
export const projectFiles: MapStore<FileMap> = import.meta.hot?.data.projectFiles ?? map<FileMap>({});

const hiddenFiles: Map<string, FileData> = import.meta.hot?.data.hiddenFiles ?? new Map();
const hiddenDirs: Set<string> = import.meta.hot?.data.hiddenDirs ?? new Set();

if (import.meta.hot) {
  import.meta.hot.data.projectFiles = projectFiles;
  import.meta.hot.data.hiddenFiles = hiddenFiles;
  import.meta.hot.data.hiddenDirs = hiddenDirs;
}

function fsError(code: 'ENOENT' | 'EISDIR' | 'ENOTDIR', syscall: string, target: string) {
  const messages = {
    ENOENT: 'no such file or directory',
    EISDIR: 'illegal operation on a directory',
    ENOTDIR: 'not a directory',
  };
  const error = new Error(`${code}: ${messages[code]}, ${syscall} '${target}'`) as NodeJS.ErrnoException;
  error.code = code;
  error.errno = code === 'ENOENT' ? -2 : code === 'EISDIR' ? -21 : -20;
  error.syscall = syscall;
  error.path = target;

  return error;
}

/*
 * Absolute, normalized, no trailing slash. Like WebContainer, "/" is the project root: callers
 * pass full paths (/home/project/src/a.ts), workdir-relative ones (src/a.ts) and root-relative
 * ones (/src/a.ts — e.g. snapshot restore strips the workdir), and all mean the same file.
 */
function resolvePath(target: string): string {
  const absolute = target === WORK_DIR || target.startsWith(WORK_DIR + '/') ? target : pathUtils.join(WORK_DIR, target);
  const normalized = pathUtils.normalize(absolute);

  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function isHidden(absolute: string): boolean {
  const relative = absolute.startsWith(WORK_DIR + '/') ? absolute.slice(WORK_DIR.length + 1) : absolute;
  return relative.split('/').some((segment) => HIDDEN_SEGMENTS.has(segment));
}

function isDirectory(absolute: string): boolean {
  if (absolute === WORK_DIR || absolute === '/' || absolute === '/home') {
    return true;
  }

  return isHidden(absolute) ? hiddenDirs.has(absolute) : projectFiles.get()[absolute]?.type === 'folder';
}

function ensureParents(absolute: string) {
  let current = pathUtils.dirname(absolute);
  const missing: string[] = [];

  while (current.startsWith(WORK_DIR + '/') && !isDirectory(current)) {
    missing.push(current);
    current = pathUtils.dirname(current);
  }

  for (const dir of missing.reverse()) {
    if (isHidden(dir)) {
      hiddenDirs.add(dir);
    } else {
      projectFiles.setKey(dir, { type: 'folder' });
    }
  }
}

export function isBinaryContent(bytes: Uint8Array): boolean {
  return getEncoding(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), { chunkLength: 100 }) === 'binary';
}

const utf8Decoder = new TextDecoder('utf8', { fatal: true });

function toBytes(data: FileData): Uint8Array {
  return typeof data === 'string' ? new TextEncoder().encode(data) : data;
}

const fs: VirtualFS = {
  async readFile(filePath: string, encoding?: string): Promise<any> {
    const absolute = resolvePath(filePath);
    let bytes: Uint8Array | undefined;
    let text: string | undefined;

    if (isHidden(absolute)) {
      const data = hiddenFiles.get(absolute);

      if (data === undefined) {
        throw fsError(hiddenDirs.has(absolute) ? 'EISDIR' : 'ENOENT', 'open', filePath);
      }

      if (typeof data === 'string') {
        text = data;
      } else {
        bytes = data;
      }
    } else {
      const dirent = projectFiles.get()[absolute];

      if (!dirent) {
        throw fsError('ENOENT', 'open', filePath);
      }

      if (dirent.type === 'folder') {
        throw fsError('EISDIR', 'read', filePath);
      }

      if (dirent.isBinary) {
        bytes = Uint8Array.from(Buffer.from(dirent.content, 'base64'));
      } else {
        text = dirent.content;
      }
    }

    if (encoding) {
      return text ?? new TextDecoder().decode(bytes);
    }

    return bytes ?? toBytes(text!);
  },

  async writeFile(filePath, data) {
    const absolute = resolvePath(filePath);

    if (isDirectory(absolute)) {
      throw fsError('EISDIR', 'open', filePath);
    }

    ensureParents(absolute);

    if (isHidden(absolute)) {
      hiddenFiles.set(absolute, data);
      return;
    }

    let content: string;
    let isBinary = false;

    if (typeof data === 'string') {
      content = data;
    } else if (isBinaryContent(data)) {
      content = Buffer.from(data).toString('base64');
      isBinary = true;
    } else {
      try {
        content = utf8Decoder.decode(data);
      } catch {
        content = Buffer.from(data).toString('base64');
        isBinary = true;
      }
    }

    const existing = projectFiles.get()[absolute];

    projectFiles.setKey(absolute, {
      type: 'file',
      content,
      isBinary,
      isLocked: existing?.type === 'file' ? existing.isLocked : false,
      lockedByFolder: existing?.type === 'file' ? existing.lockedByFolder : undefined,
    });
  },

  async mkdir(dirPath) {
    const absolute = resolvePath(dirPath);

    if (isDirectory(absolute)) {
      return;
    }

    ensureParents(absolute);

    if (isHidden(absolute)) {
      hiddenDirs.add(absolute);
    } else {
      projectFiles.setKey(absolute, { type: 'folder' });
    }
  },

  async readdir(dirPath: string, options?: { withFileTypes?: boolean }): Promise<any> {
    const absolute = resolvePath(dirPath);

    if (!isDirectory(absolute)) {
      throw fsError(
        projectFiles.get()[absolute] || hiddenFiles.has(absolute) ? 'ENOTDIR' : 'ENOENT',
        'scandir',
        dirPath,
      );
    }

    const prefix = absolute === '/' ? '/' : absolute + '/';
    const entries = new Map<string, boolean>(); // name -> isDirectory

    const consider = (entryPath: string, directory: boolean) => {
      if (entryPath.startsWith(prefix) && !entryPath.slice(prefix.length).includes('/')) {
        entries.set(entryPath.slice(prefix.length), directory);
      }
    };

    for (const [entryPath, dirent] of Object.entries(projectFiles.get())) {
      if (dirent) {
        consider(entryPath, dirent.type === 'folder');
      }
    }

    hiddenDirs.forEach((dir) => consider(dir, true));
    hiddenFiles.forEach((_, file) => consider(file, false));

    if (!options?.withFileTypes) {
      return [...entries.keys()];
    }

    return [...entries].map(([name, directory]) => ({
      name,
      isFile: () => !directory,
      isDirectory: () => directory,
    }));
  },

  async rm(targetPath, options) {
    const absolute = resolvePath(targetPath);
    const prefix = absolute + '/';
    let removed = false;

    const current = projectFiles.get();
    const updates: FileMap = {};

    for (const entryPath of Object.keys(current)) {
      if (entryPath === absolute || (options?.recursive && entryPath.startsWith(prefix))) {
        updates[entryPath] = undefined;
        removed = true;
      }
    }

    if (Object.keys(updates).length) {
      projectFiles.set(Object.fromEntries(Object.entries({ ...current, ...updates }).filter(([, v]) => v)));
    }

    for (const file of [...hiddenFiles.keys()]) {
      if (file === absolute || (options?.recursive && file.startsWith(prefix))) {
        hiddenFiles.delete(file);
        removed = true;
      }
    }

    for (const dir of [...hiddenDirs]) {
      if (dir === absolute || (options?.recursive && dir.startsWith(prefix))) {
        hiddenDirs.delete(dir);
        removed = true;
      }
    }

    if (!removed && !options?.force) {
      throw fsError('ENOENT', 'rm', targetPath);
    }
  },
};

const container: VirtualContainer = { workdir: WORK_DIR, fs };

/**
 * Kept as a promise (and under the old name) so existing callers — file actions, snapshots,
 * git, deploys — didn't need to change; it resolves immediately.
 */
export const webcontainer: Promise<VirtualContainer> = Promise.resolve(container);
