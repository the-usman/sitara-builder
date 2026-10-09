import { atom, type MapStore } from 'nanostores';
import type { FileMap } from '~/lib/stores/files';
import { webcontainer } from '~/lib/webcontainer';
import { createScopedLogger } from '~/utils/logger';

/*
 * Browser half of remote preview (server: app/lib/sandbox/vercel-sandbox.server.ts).
 *
 * Every command (installs, the dev server, builds, terminal input) runs in the chat's Vercel
 * Sandbox, and every file in the workbench's in-memory file system (app/lib/webcontainer) is
 * mirrored to it. Nothing executes in the user's browser; without Vercel Sandbox configured on
 * the server, the builder can still edit code but cannot run or preview it.
 */

const logger = createScopedLogger('RemoteSandbox');

export type RemotePreviewState =
  | { status: 'idle' }
  | { status: 'syncing' | 'installing' | 'starting'; url?: string }
  | { status: 'running'; url: string }
  | { status: 'stopped'; url?: string }
  | { status: 'error'; error: string; url?: string };

export const remotePreview = atom<RemotePreviewState>({ status: 'idle' });

/** Whether the server has Vercel Sandbox configured; `undefined` until the check returns. */
export const remoteSandboxAvailable = atom<boolean | undefined>(undefined);

/*
 * Bumped after a dependency install while the preview is live: the dev server may have compiled
 * the page mid-install ("Module not found") and keeps showing that until the page reloads.
 */
export const previewReloadSignal = atom(0);

let enabledPromise: Promise<boolean> | undefined;

export function isRemoteSandboxEnabled(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  enabledPromise ??= fetch('/api/sandbox')
    .then((res) => (res.ok ? (res.json() as Promise<{ enabled?: boolean }>) : { enabled: false }))
    .then((data) => Boolean(data.enabled))
    .catch(() => false)
    .then((enabled) => {
      remoteSandboxAvailable.set(enabled);
      return enabled;
    });

  return enabledPromise;
}

/*
 * The sandbox key is bound on first use. A brand-new chat has no id yet when its first
 * actions run, so a random key is used and kept when the id arrives — switching keys mid-chat
 * would strand the files already synced to the first sandbox.
 */
let binding: { key: string; chat?: string; used: boolean } | undefined;

async function sandboxKey(): Promise<string> {
  // Lazy: useChatHistory imports the workbench store, which imports this module.
  const { chatId } = await import('~/lib/persistence/useChatHistory');
  const current = chatId.get();

  if (binding && current && binding.chat && current !== binding.chat) {
    releaseSandbox();
  }

  if (!binding) {
    binding = { key: current ?? `tmp-${crypto.randomUUID()}`, chat: current, used: false };
  } else if (current && !binding.chat) {
    binding.chat = current;
  }

  binding.used = true;

  return binding.key;
}

// ---------------------------------------------------------------- lifecycle (credit control)

const PING_INTERVAL_MS = 2 * 60_000;

/** No keep-alive after this long without input, so an abandoned tab lets the sandbox time out. */
const ACTIVE_WINDOW_MS = 15 * 60_000;

let lastActivityAt = Date.now();
let lastStartCommand: string | undefined;

/** Stops the bound chat's sandbox. sendBeacon survives the page unloading; fetch is the fallback. */
function stopSandbox(key: string) {
  const body = JSON.stringify({ op: 'stop', chatKey: key });

  try {
    if (navigator.sendBeacon?.('/api/sandbox', new Blob([body], { type: 'application/json' }))) {
      return;
    }
  } catch {}

  fetch('/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/** The chat is closing or changing: stop its sandbox and forget everything synced to it. */
function releaseSandbox() {
  if (binding?.used) {
    stopSandbox(binding.key);
  }

  binding = undefined;
  lastStartCommand = undefined;
  reportedErrors.clear();
  resetSyncState();
}

async function ping() {
  const state = remotePreview.get();

  if (!binding?.used || Date.now() - lastActivityAt > ACTIVE_WINDOW_MS) {
    return;
  }

  // Idle/stopped: only check whether a server is (still) up to reconnect to — see reconnectRemotePreview.
  if (state.status === 'idle' || state.status === 'stopped') {
    await reconnectRemotePreview();
    return;
  }

  try {
    const res = await fetch('/api/sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'ping', chatKey: binding.key }),
    });
    const data = (await res.json()) as { running?: boolean; url?: string };
    const current = remotePreview.get();

    // Busy states mean a command is mid-flight; only a finished preview can go stale.
    if (!data.running && (current.status === 'running' || current.status === 'error')) {
      remotePreview.set({ status: 'stopped', url: 'url' in current ? current.url : undefined });
    } else if (data.running && data.url && current.status === 'error') {
      remotePreview.set({ status: 'running', url: data.url });
    }
  } catch {}
}

/**
 * When the builder shows no preview but this chat's sandbox already serves one (page reload, a
 * status mix-up), adopt it instead of asking the user to run it again. Never creates a sandbox.
 */
export async function reconnectRemotePreview(): Promise<boolean> {
  const state = remotePreview.get();

  if (state.status !== 'idle' && state.status !== 'stopped' && state.status !== 'error') {
    return state.status === 'running';
  }

  if (!(await isRemoteSandboxEnabled())) {
    return false;
  }

  try {
    const res = await fetch('/api/sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'ping', chatKey: await sandboxKey() }),
    });
    const data = (await res.json()) as { running?: boolean; url?: string };
    const current = remotePreview.get();

    if (
      data.running &&
      data.url &&
      (current.status === 'idle' || current.status === 'stopped' || current.status === 'error')
    ) {
      remotePreview.set({ status: 'running', url: data.url });
      return true;
    }
  } catch {}

  return false;
}

function installLifecycleHandlers() {
  const markActive = () => (lastActivityAt = Date.now());

  for (const event of ['pointerdown', 'keydown', 'wheel']) {
    window.addEventListener(event, markActive, { passive: true, capture: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      markActive();
      void ping();
    }
  });

  // Tab closed, reloaded or navigated away.
  window.addEventListener('pagehide', () => {
    if (binding?.used) {
      stopSandbox(binding.key);
    }
  });

  setInterval(() => void ping(), PING_INTERVAL_MS);
  setInterval(() => void pollPreviewErrors(), ERROR_POLL_MS);

  // Switching chats inside the app (no page unload).
  void import('~/lib/persistence/useChatHistory').then(({ chatId }) => {
    let previous = chatId.get();

    chatId.subscribe((next) => {
      if (previous && next !== previous && binding?.chat === previous) {
        releaseSandbox();
      }

      previous = next;
    });
  });
}

const BUSY_STATUSES = new Set(['syncing', 'installing', 'starting']);

/** `npm run dev|start|preview` from the project's root package.json, like a restored chat would run. */
function detectStartCommand(): string | undefined {
  const pkgFile = filesStore?.get()['/home/project/package.json'];

  if (pkgFile?.type !== 'file') {
    return undefined;
  }

  try {
    const scripts = (JSON.parse(pkgFile.content) as { scripts?: Record<string, string> }).scripts ?? {};
    const script = ['dev', 'start', 'preview'].find((name) => scripts[name]);

    return script ? `npm run ${script}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * "Run preview" / "Restart preview": (re)starts the dev server on demand. Uses the last start
 * command from the chat, or the project's package.json scripts when nothing has run yet.
 * Stopped sandboxes are deleted, so this may land on a fresh one: streamCommand's file check
 * re-sends the project, and dependencies are installed first.
 */
export async function runRemotePreview(terminal?: RemoteTerminal) {
  if (BUSY_STATUSES.has(remotePreview.get().status)) {
    return;
  }

  // "Run preview" while a server is in fact already up just reconnects to it.
  if (remotePreview.get().status === 'idle' && (await reconnectRemotePreview())) {
    return;
  }

  const command = lastStartCommand ?? detectStartCommand();

  if (!command) {
    remotePreview.set({
      status: 'error',
      error: 'No package.json with a "dev", "start" or "preview" script yet. Ask the AI to create the project first.',
    });

    return;
  }

  const hasInstall = /\b(npm|pnpm|yarn|bun)\s+(i|install|ci)\b/.test(command);
  lastFilesChangeAt = 0;
  await startRemoteDevServer(hasInstall ? command : `npm install && ${command}`, terminal, { force: true });
}

export const restartRemotePreview = runRemotePreview;

// ---------------------------------------------------------------- file mirroring

// Build output (dist/, out/) is produced in the sandbox and downloaded for deploys; never upload it back.
const SKIP_PATH = /\/(node_modules|\.history|\.git|dist|out)\//;
let filesStore: MapStore<FileMap> | undefined;
let lastSent = new Map<string, string>();
let syncChain: Promise<void> = Promise.resolve();
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let lastFilesChangeAt = 0;

function resetSyncState() {
  lastSent = new Map();
  remotePreview.set({ status: 'idle' });
}

/** Called once by the workbench store; mirrors file changes to the sandbox, debounced. */
export function startRemoteFileSync(files: MapStore<FileMap>) {
  filesStore = files;
  installLifecycleHandlers();
  void isRemoteSandboxEnabled();
  files.subscribe(() => {
    lastFilesChangeAt = Date.now();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => void flushRemoteFiles(), 400);
  });
}

/** Sends every file changed since the last sync. Serialized, so callers can await it before running a command. */
export function flushRemoteFiles(): Promise<void> {
  syncChain = syncChain.then(syncOnce, syncOnce);
  return syncChain;
}

async function syncOnce() {
  if (!filesStore || !(await isRemoteSandboxEnabled())) {
    return;
  }

  /*
   * Resolve the key before diffing: if it rebinds (chat id changed), lastSent is reset, and a
   * diff taken against the old sandbox's lastSent would send the new one only recent changes.
   */
  const chatKey = await sandboxKey();
  const current = filesStore.get();
  const files: Array<{ path: string; content: string; binary: boolean }> = [];
  const seen = new Set<string>();

  for (const [path, dirent] of Object.entries(current)) {
    if (dirent?.type !== 'file' || SKIP_PATH.test(path)) {
      continue;
    }

    seen.add(path);

    if (lastSent.get(path) !== dirent.content) {
      files.push({ path, content: dirent.content, binary: dirent.isBinary });
    }
  }

  const deleted = [...lastSent.keys()].filter((path) => !seen.has(path));

  if (!files.length && !deleted.length) {
    return;
  }

  const res = await fetch('/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'sync', chatKey, files, deleted }),
  });

  if (!res.ok) {
    const message = ((await res.json().catch(() => ({}))) as { error?: string }).error || `HTTP ${res.status}`;
    logger.error('File sync failed:', message);
    remotePreview.set({ status: 'error', error: `File sync failed: ${message}` });

    return;
  }

  for (const file of files) {
    lastSent.set(file.path, file.content);
  }

  for (const path of deleted) {
    lastSent.delete(path);
  }
}

async function sha1Hex(content: string, binary: boolean): Promise<string> {
  const bytes = binary ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0)) : new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-1', bytes);

  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/*
 * Safety net run before every command: compares the sandbox's file hashes with the workbench
 * and re-sends whatever is missing or different. Incremental sync relies on bookkeeping that a
 * failed request, a rebind or a resumed snapshot can invalidate — a preview that silently
 * lacks src/main.tsx renders as a blank page.
 */
async function verifyRemoteFiles(chatKey: string) {
  if (!filesStore) {
    return;
  }

  const res = await fetch('/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'manifest', chatKey }),
  });

  if (!res.ok) {
    return;
  }

  const { files: remote = {} } = (await res.json()) as { files?: Record<string, string> };
  const missing: Array<{ path: string; content: string; binary: boolean }> = [];

  for (const [path, dirent] of Object.entries(filesStore.get())) {
    if (dirent?.type !== 'file' || SKIP_PATH.test(path)) {
      continue;
    }

    if (remote[path] !== (await sha1Hex(dirent.content, dirent.isBinary))) {
      missing.push({ path, content: dirent.content, binary: dirent.isBinary });
    }
  }

  if (!missing.length) {
    return;
  }

  logger.warn(`Re-sending ${missing.length} file(s) missing or stale in the sandbox`);

  const sync = await fetch('/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'sync', chatKey, files: missing, deleted: [] }),
  });

  if (sync.ok) {
    for (const file of missing) {
      lastSent.set(file.path, file.content);
    }
  }
}

// ---------------------------------------------------------------- preview errors

const ERROR_POLL_MS = 6000;
const reportedErrors = new Set<string>();

/*
 * The preview runs in its own tab on another origin, so its errors can't reach the builder
 * directly: the sandbox collects them (dev-server output + an injected page reporter) and the
 * builder polls, showing them in the same alert the in-browser preview used.
 */
async function pollPreviewErrors() {
  const state = remotePreview.get();

  if (!binding?.used || state.status !== 'running' || Date.now() - lastActivityAt > ACTIVE_WINDOW_MS) {
    return;
  }

  try {
    const res = await fetch('/api/sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'errors', chatKey: binding.key }),
    });

    if (!res.ok) {
      return;
    }

    const { errors = [] } = (await res.json()) as {
      errors?: Array<{ kind: 'build' | 'runtime'; message: string; detail: string }>;
    };
    const fresh = errors.filter((error) => !reportedErrors.has(error.message));

    if (!fresh.length) {
      return;
    }

    fresh.forEach((error) => reportedErrors.add(error.message));

    const first = fresh[0];
    const { workbenchStore } = await import('~/lib/stores/workbench');

    workbenchStore.actionAlert.set({
      type: 'preview',
      title: first.kind === 'build' ? 'Preview Build Error' : 'Preview Error',
      description: first.message,
      content: fresh.map((error) => error.detail).join('\n\n---\n\n'),
      source: 'preview',
    });
  } catch {
    // transient; next poll retries
  }
}

// ---------------------------------------------------------------- commands

export interface RemoteTerminal {
  write(data: string): void;
}

/** xterm needs CRLF; sandbox output is plain LF. */
function toTerminal(text: string) {
  return text.replace(/\r?\n/g, '\r\n');
}

/*
 * File actions land in the WebContainer first and reach the files store through a buffered
 * watcher, so a command queued right behind them (npm install after package.json) waits for
 * the store to go quiet before the last sync.
 */
async function waitForFilesToSettle() {
  const startedAt = Date.now();

  do {
    await new Promise((resolve) => setTimeout(resolve, 150));
  } while (Date.now() - Math.max(lastFilesChangeAt, startedAt) < 350 && Date.now() - startedAt < 5000);
}

async function streamCommand(
  op: 'run' | 'start',
  command: string,
  terminal: RemoteTerminal | undefined,
  options: RemoteShellOptions = {},
): Promise<{ exitCode: number; output: string; url?: string }> {
  await waitForFilesToSettle();
  await flushRemoteFiles();

  const chatKey = await sandboxKey();
  await verifyRemoteFiles(chatKey).catch((error) => logger.error('File check failed:', error));

  if (options.echo !== false) {
    terminal?.write(toTerminal(`\n\x1b[36m[vercel sandbox]\x1b[0m $ ${command}\n`));
  }

  let res: Response;

  try {
    res = await fetch('/api/sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, chatKey, command }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) {
      return { exitCode: 130, output: '' };
    }

    throw error;
  }

  if (!res.ok || !res.body) {
    const message = ((await res.json().catch(() => ({}))) as { error?: string }).error || `HTTP ${res.status}`;
    terminal?.write(toTerminal(`\x1b[31m${message}\x1b[0m\n`));

    return { exitCode: 1, output: message };
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let output = '';

  while (true) {
    let chunk: ReadableStreamReadResult<string>;

    try {
      chunk = await reader.read();
    } catch (error) {
      if (options.signal?.aborted) {
        return { exitCode: 130, output };
      }

      throw error;
    }

    const { value, done } = chunk;

    if (done) {
      break;
    }

    buffer += value;

    let newline: number;

    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);

      if (!line) {
        continue;
      }

      const event = JSON.parse(line) as
        | { t: 'log'; d: string }
        | { t: 'exit'; code: number }
        | { t: 'url'; url: string }
        | { t: 'error'; message: string };

      if (event.t === 'log') {
        output += event.d;
        terminal?.write(toTerminal(event.d));
      } else if (event.t === 'exit') {
        return { exitCode: event.code, output };
      } else if (event.t === 'url') {
        return { exitCode: 0, output, url: event.url };
      } else {
        terminal?.write(toTerminal(`\x1b[31m${event.message}\x1b[0m\n`));
        return { exitCode: 1, output: output + event.message };
      }
    }
  }

  return { exitCode: 1, output: output || 'Connection to the sandbox closed unexpectedly.' };
}

export interface RemoteShellOptions {
  /** Abort waiting for the command (Ctrl+C in a user terminal). */
  signal?: AbortSignal;

  /** Print the "[vercel sandbox] $ cmd" header (the user terminal already echoed the line). */
  echo?: boolean;

  /** AI shell actions drive the preview status; commands typed by the user don't. */
  affectsPreview?: boolean;
}

export async function runRemoteShell(command: string, terminal?: RemoteTerminal, options: RemoteShellOptions = {}) {
  const affectsPreview = options.affectsPreview ?? options.echo !== false;
  const isInstall = /\b(npm|pnpm|yarn|bun)\s+(i|install|add|ci)\b/.test(command);
  const previous = remotePreview.get();

  if (affectsPreview && isInstall) {
    remotePreview.set({ status: 'installing', url: 'url' in previous ? previous.url : undefined });
  }

  const result = await streamCommand('run', command, terminal, options);

  if (!affectsPreview || !isInstall) {
    return result;
  }

  /*
   * Only undo our own "installing" status. Restoring the status captured before the command
   * clobbered newer states: a start action doesn't block the next action, so an install that
   * began while the preview was idle/starting would finish and flip a now-running preview back
   * to "not running". A failed command is reported in the terminal and alert, not by hiding
   * a working preview.
   */
  const current = remotePreview.get();

  if (current.status === 'installing') {
    remotePreview.set(previous.status === 'installing' ? { status: 'idle' } : previous);
  }

  if (result.exitCode === 0 && remotePreview.get().status === 'running') {
    previewReloadSignal.set(previewReloadSignal.get() + 1);
  }

  return result;
}

type StartResult = Awaited<ReturnType<typeof streamCommand>>;

/** "npm install && npm run dev" → "npm run dev": the step that actually serves. */
function serveStep(command: string): string {
  const steps = command.split('&&');
  return steps[steps.length - 1].trim().replace(/\s+/g, ' ');
}

/** "npm install && npm run dev" → "npm install"; undefined when there's nothing before the serve step. */
function setupSteps(command: string): string | undefined {
  const steps = command.split('&&');
  return steps.length > 1 ? steps.slice(0, -1).join('&&').trim() : undefined;
}

let startQueue: Promise<unknown> = Promise.resolve();
let inflightStart: { command: string; promise: Promise<StartResult> } | undefined;

/*
 * Starts must never overlap: each one kills the previous dev server, so two at once fight over
 * the ports ("Port 3001 is already in use") and fail in a loop. Start actions don't wait for
 * each other (and a reopened chat replays several), so starts are queued here; a duplicate of
 * the start in flight joins it, and re-starting the server that's already running is skipped
 * unless `force` (the Restart button).
 */
export function startRemoteDevServer(
  command: string,
  terminal?: RemoteTerminal,
  { force = false }: { force?: boolean } = {},
): Promise<StartResult> {
  const state = remotePreview.get();

  /*
   * The AI routinely ends a reply with "npm run dev" (often after an install) although the
   * server is already up; restarting it just takes the preview away. Same serve step → keep the
   * server, run only the setup steps in front of it (installs), and let the dev server pick
   * the changes up (Vite/Next reload new deps and config changes on their own).
   */
  if (!force && state.status === 'running' && lastStartCommand && serveStep(command) === serveStep(lastStartCommand)) {
    const setup = setupSteps(command);

    if (!setup) {
      return Promise.resolve({ exitCode: 0, output: '', url: state.url });
    }

    // The preview stays visible during the install, then reloads to pick up the new packages.
    return runRemoteShell(setup, terminal, { affectsPreview: false }).then((result) => {
      if (result.exitCode === 0) {
        previewReloadSignal.set(previewReloadSignal.get() + 1);
      }

      return { ...result, url: result.exitCode === 0 ? state.url : undefined };
    });
  }

  if (!force && inflightStart?.command === command) {
    return inflightStart.promise;
  }

  const promise = startQueue.then(() => runStart(command, terminal));
  startQueue = promise.catch(() => undefined);
  inflightStart = { command, promise };
  promise
    .finally(() => {
      if (inflightStart?.promise === promise) {
        inflightStart = undefined;
      }
    })
    .catch(() => undefined);

  return promise;
}

async function runStart(command: string, terminal?: RemoteTerminal): Promise<StartResult> {
  lastStartCommand = command;
  reportedErrors.clear();
  remotePreview.set({ status: 'starting' });

  const result = await streamCommand('start', command, terminal);

  if (result.url) {
    terminal?.write(toTerminal(`\n\x1b[32mPreview ready:\x1b[0m ${result.url}\n`));
    remotePreview.set({ status: 'running', url: result.url });
  } else {
    remotePreview.set({ status: 'error', error: 'The dev server did not start. See the terminal for details.' });
  }

  return result;
}

const BUILD_OUTPUT_DIRS = ['dist', 'out', 'build', '.next', 'public'];

/**
 * Deploy build: runs `npm run build` in the sandbox, then downloads the output directory into
 * the in-memory file system so the Netlify/Vercel deploy code can read it as before.
 */
export async function buildRemoteProject(
  terminal?: RemoteTerminal,
): Promise<{ exitCode: number; output: string; dir?: string }> {
  const build = await runRemoteShell('npm run build', terminal, { affectsPreview: false });

  if (build.exitCode !== 0) {
    return build;
  }

  const res = await fetch('/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'download', chatKey: await sandboxKey(), dirs: BUILD_OUTPUT_DIRS }),
  });

  if (!res.ok) {
    const message = ((await res.json().catch(() => ({}))) as { error?: string }).error || `HTTP ${res.status}`;
    return { exitCode: 1, output: `${build.output}\n${message}` };
  }

  const { dir, files } = (await res.json()) as { dir: string; files: Array<{ path: string; content: string }> };
  const container = await webcontainer;

  await container.fs.rm(dir, { recursive: true, force: true });

  for (const file of files) {
    await container.fs.writeFile(
      file.path,
      Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0)),
    );
  }

  terminal?.write(toTerminal(`\nDownloaded ${files.length} build file(s) from ${dir}/\n`));

  return { exitCode: 0, output: build.output, dir };
}
