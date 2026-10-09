import { createHash } from 'node:crypto';
import { Sandbox } from '@vercel/sandbox';
import { getProviderToken } from '~/lib/config/provider-tokens.server';
import type { ServerEnv } from '~/lib/mongo.server';
import { PREVIEW_BRIDGE_SCRIPT } from './preview-bridge';
import { DEV_PORT, PREVIEW_PROXY_SCRIPT, PROXY_PORT } from './preview-proxy';

/*
 * Remote preview: each chat's project runs in a Vercel Sandbox (a Linux microVM) instead of
 * the in-browser WebContainer, so npm install, the dev server and esbuild never load the
 * user's machine. The browser only keeps the file tree and opens the preview URL.
 */

/** Ports a dev server may listen on — they must be declared when the sandbox is created. */
export const PREVIEW_PORTS = [5173, 3000, 4321, 8080];

/** WebContainer's project root; the client sends paths under it. */
const CLIENT_WORKDIR = '/home/project/';

/*
 * Credit control: a sandbox stops on its own 10 minutes after the last keep-alive. An open,
 * active builder tab pings every 2 minutes; closing the chat stops it immediately (see
 * stopChatSandbox). Stopped sandboxes are deleted, not snapshotted (see getChatSandbox).
 */
const SESSION_TIMEOUT_MS = 10 * 60_000;
const EXTEND_WHEN_BELOW_MS = 6 * 60_000;
const DEV_PID_FILE = '/tmp/sitara-dev.pgid';

interface SandboxCredentials {
  token: string;
  teamId: string;
  projectId: string;
}

function envVar(name: string, env?: ServerEnv): string | undefined {
  return env?.[name] || (typeof process !== 'undefined' ? process.env?.[name] : undefined);
}

/** Reuses the shared Vercel token; sandboxes additionally need a team and project to bill to. */
export async function getSandboxCredentials(env?: ServerEnv): Promise<SandboxCredentials | undefined> {
  const token = await getProviderToken('vercel', env);
  const teamId = envVar('VERCEL_TEAM_ID', env);
  const projectId = envVar('VERCEL_PROJECT_ID', env);

  if (!token || !teamId || !projectId) {
    return undefined;
  }

  return { token, teamId, projectId };
}

/** Scoped to the user so one account can't reach another's sandbox by guessing a chat id. */
function sandboxName(userId: string, chatKey: string): string {
  return 'sitara-' + createHash('sha256').update(`${userId}:${chatKey}`).digest('hex').slice(0, 32);
}

/*
 * Non-persistent: a persistent sandbox snapshots its whole disk (node_modules included) on
 * every stop, and the Hobby plan's 15 GB snapshot quota ran out within a day of testing —
 * after which no sandbox can be created at all. A stopped sandbox is deleted instead; the next
 * request builds a fresh one and the client re-sends files and reinstalls (~15s).
 */
const LIVE_STATUSES = new Set(['running', 'pending']);

/** Collapses concurrent requests (sync + manifest + command) into one create per process. */
const inflight = new Map<string, Promise<Sandbox>>();

export async function getChatSandbox(env: ServerEnv, userId: string, chatKey: string): Promise<Sandbox> {
  const credentials = await getSandboxCredentials(env);

  if (!credentials) {
    throw new Error('Remote preview is not configured (VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID).');
  }

  const name = sandboxName(userId, chatKey);
  let sandboxPromise = inflight.get(name);

  if (!sandboxPromise) {
    const params = {
      ...credentials,
      name,
      ports: PREVIEW_PORTS,
      timeout: SESSION_TIMEOUT_MS,
      resources: { vcpus: 2 },
      region: (envVar('VERCEL_SANDBOX_REGION', env) || 'syd1') as any,
      persistent: false,
    };

    sandboxPromise = (async () => {
      const existing = await Sandbox.getOrCreate(params);

      if (LIVE_STATUSES.has(existing.status)) {
        return existing;
      }

      // Timed out or stopped: it can't resume without a snapshot, so replace it.
      await existing.delete({ deleteOrphanSnapshots: true }).catch(() => undefined);

      return Sandbox.create(params);
    })();

    inflight.set(name, sandboxPromise);
    sandboxPromise.finally(() => inflight.delete(name)).catch(() => undefined);
  }

  const sandbox = await sandboxPromise;
  await keepAlive(sandbox);

  return sandbox;
}

/** Every request from an open builder tab pushes the stop deadline out. */
async function keepAlive(sandbox: Sandbox) {
  try {
    const remaining = sandbox.expiresAt ? sandbox.expiresAt.getTime() - Date.now() : 0;

    if (remaining < EXTEND_WHEN_BELOW_MS) {
      await sandbox.extendTimeout(SESSION_TIMEOUT_MS);
    }
  } catch {
    // A stopped persistent sandbox resumes on the next command anyway.
  }
}

/*
 * The project gets its own directory. The sandbox user's home (/vercel, the default cwd) is
 * full of tool dotfiles, which made "what's in the project" impossible to compare.
 */
const PROJECT_DIR = '/vercel/project';
const DEV_LOG = '/tmp/sitara-dev.log';
const DEV_LOG_OFFSET = '/tmp/sitara-dev.log.offset';
const RUNTIME_ERRORS = '/tmp/sitara-preview-errors.jsonl';

function run(sandbox: Sandbox, script: string) {
  return sandbox.runCommand({ cmd: 'bash', args: ['-c', script], cwd: PROJECT_DIR });
}

// Keyed by name + creation time: a sandbox replaced under the same name starts empty again.
const projectDirReady = new Set<string>();

async function ensureProjectDir(sandbox: Sandbox) {
  const key = `${sandbox.name}:${sandbox.createdAt.getTime()}`;

  if (!projectDirReady.has(key)) {
    await sandbox.runCommand('mkdir', ['-p', PROJECT_DIR]);
    projectDirReady.add(key);
  }
}

function toSandboxPath(clientPath: string): string {
  const relative = clientPath.startsWith(CLIENT_WORKDIR) ? clientPath.slice(CLIENT_WORKDIR.length) : clientPath;
  const clean = relative.replace(/^\/+/, '');

  if (!clean || clean.split('/').includes('..')) {
    throw new Error(`Invalid file path: ${clientPath}`);
  }

  return clean;
}

export interface SyncFile {
  path: string;
  content: string;
  binary?: boolean;
}

export async function syncFiles(sandbox: Sandbox, files: SyncFile[], deleted: string[]) {
  await ensureProjectDir(sandbox);

  if (deleted.length) {
    await sandbox.runCommand({ cmd: 'rm', args: ['-rf', '--', ...deleted.map(toSandboxPath)], cwd: PROJECT_DIR });
  }

  if (!files.length) {
    return;
  }

  const entries = files.map((file) => ({
    path: `${PROJECT_DIR}/${toSandboxPath(file.path)}`,
    content: Buffer.from(file.content, file.binary ? 'base64' : 'utf8'),
  }));

  const dirs = [...new Set(entries.map((e) => e.path.split('/').slice(0, -1).join('/')))];
  await sandbox.runCommand('mkdir', ['-p', '--', ...dirs]);
  await sandbox.writeFiles(entries);
}

/**
 * sha1 of every project file (excluding node_modules/.git), keyed by client path. The client
 * compares it with its own files before each command and re-sends anything missing or stale,
 * so an earlier sync that went wrong can't leave the preview without files.
 */
export async function getManifest(sandbox: Sandbox): Promise<Record<string, string>> {
  await ensureProjectDir(sandbox);

  const result = await run(
    sandbox,
    `find . \\( -name node_modules -o -name .git \\) -prune -o -type f -print0 | xargs -0 -r sha1sum`,
  );
  const manifest: Record<string, string> = {};

  for (const line of (await result.stdout()).split('\n')) {
    const match = line.match(/^([0-9a-f]{40})\s+\.\/(.+)$/);

    if (match) {
      manifest[CLIENT_WORKDIR + match[2]] = match[1];
    }
  }

  return manifest;
}

const EXIT_MARKER = '__SITARA_EXIT_';
const EXIT_MARKER_RE = /\n?__SITARA_EXIT_(\d+)__\n?/;

/** Streams a shell command's output; the generator's return value is the exit code. */
export async function* runShell(sandbox: Sandbox, command: string): AsyncGenerator<string, number> {
  await ensureProjectDir(sandbox);

  /*
   * Exit is signalled by a marker the wrapper prints, not by the command's output stream
   * closing: a background child (npm's update check, a spawned server) inherits stdout and can
   * hold it — and Vercel's own wait() — open long after the command exited, which left the
   * builder stuck on "npm install". The subshell keeps `exit N` in the command from skipping
   * the marker.
   */
  const script = `(\n${command}\n)\nprintf '\\n${EXIT_MARKER}%s__\\n' "$?"`;
  const cmd = await sandbox.runCommand({ cmd: 'bash', args: ['-lc', script], cwd: PROJECT_DIR, detached: true });

  let carry = '';

  for await (const log of cmd.logs()) {
    carry += log.data;

    const match = carry.match(EXIT_MARKER_RE);

    if (match) {
      const before = carry.slice(0, match.index);

      if (before) {
        yield before;
      }

      return parseInt(match[1], 10);
    }

    // Hold back a possible partial marker at the end; flush the rest.
    const markerStart = carry.lastIndexOf('\n__SITARA');
    const keep = markerStart !== -1 && carry.length - markerStart < 40 ? carry.slice(markerStart) : '';
    const flush = carry.slice(0, carry.length - keep.length);

    if (flush) {
      yield flush;
    }

    carry = keep;
  }

  if (carry) {
    yield carry;
  }

  return (await cmd.wait()).exitCode ?? 1;
}

async function readPackageJson(sandbox: Sandbox): Promise<{ scripts?: Record<string, string> } | undefined> {
  try {
    const result = await run(sandbox, 'cat package.json');
    return JSON.parse(await result.stdout());
  } catch {
    return undefined;
  }
}

/*
 * Wraps the project's own vite.config (whatever its name or language): binds the dev server to
 * the internal DEV_PORT behind the preview proxy and accepts any Host header — Vite otherwise
 * rejects the sandbox hostname ("Blocked request. This host is not allowed"); templates pin
 * Vite 5.4.x, which predates the env-var override. Lives under node_modules so it resolves `vite`
 * from the project, stays out of the user's file tree and is never synced.
 */
const VITE_WRAPPER_PATH = 'node_modules/.sitara/vite.config.mjs';
const VITE_WRAPPER = `import { defineConfig, loadConfigFromFile, mergeConfig } from 'vite';

export default defineConfig(async (env) => {
  const loaded = await loadConfigFromFile(env, undefined, process.cwd());

  return mergeConfig(loaded?.config ?? {}, {
    server: { host: '0.0.0.0', port: ${DEV_PORT}, strictPort: true, allowedHosts: true },
  });
});
`;

const BRIDGE_FILE = '/tmp/sitara-bridge.js';
const PROXY_FILE = '/tmp/sitara-proxy.mjs';
const PROXY_LOG = '/tmp/sitara-proxy.log';

interface DevServerPlan {
  command: string;

  /** Dev server moved to DEV_PORT behind the preview proxy (bridge injection, visual editing). */
  proxied: boolean;
}

/*
 * Known frameworks run behind the preview proxy: Vite via the wrapper config, Next.js via
 * `-p DEV_PORT`. Anything else starts as written and is found by probing the usual ports.
 */
async function planDevServer(sandbox: Sandbox, command: string): Promise<DevServerPlan> {
  // Restored chats start with `npm install && npm run dev`; only the last step serves.
  const steps = command.split('&&');
  const last = steps[steps.length - 1].trim();
  const match = last.match(/^(npm|pnpm|yarn)\s+(?:run\s+)?([\w:-]+)$/);

  if (!match) {
    return { command, proxied: false };
  }

  const pkg = await readPackageJson(sandbox);
  const script = pkg?.scripts?.[match[2]] || '';
  const argSeparator = match[1] === 'npm' ? '-- ' : '';
  let extraArgs: string | undefined;

  if (/^\s*vite(\s|$)/.test(script) && !/--config\b/.test(script)) {
    await sandbox.runCommand('mkdir', ['-p', `${PROJECT_DIR}/node_modules/.sitara`]);
    await sandbox.writeFiles([{ path: `${PROJECT_DIR}/${VITE_WRAPPER_PATH}`, content: Buffer.from(VITE_WRAPPER) }]);
    extraArgs = `--config ${VITE_WRAPPER_PATH}`;
  } else if (/^\s*next\s+dev\b/.test(script) && !/(\s-p\s|--port)/.test(script)) {
    extraArgs = `-p ${DEV_PORT}`;
  }

  if (!extraArgs) {
    return { command, proxied: false };
  }

  steps[steps.length - 1] = ` ${last} ${argSeparator}${extraArgs}`;

  return { command: steps.join('&&').trim(), proxied: true };
}

async function isPortOpen(sandbox: Sandbox, port: number): Promise<boolean> {
  const result = await sandbox.runCommand('bash', ['-c', `(echo > /dev/tcp/127.0.0.1/${port}) 2>/dev/null`]);
  return result.exitCode === 0;
}

async function findListeningPort(sandbox: Sandbox): Promise<number | undefined> {
  const probe = `for p in ${PREVIEW_PORTS.join(' ')}; do (echo > /dev/tcp/127.0.0.1/$p) 2>/dev/null && { echo $p; exit 0; }; done; exit 1`;
  const result = await sandbox.runCommand('bash', ['-c', probe]);

  if (result.exitCode !== 0) {
    return undefined;
  }

  const port = parseInt((await result.stdout()).trim(), 10);

  return PREVIEW_PORTS.includes(port) ? port : undefined;
}

export type StartEvent = { type: 'log'; data: string } | { type: 'url'; url: string } | { type: 'exit'; code: number };

/**
 * Restarts the dev server: kills the previous one (and its proxy — same process group), launches
 * the new command, streams its output, and reports the public URL once it accepts connections.
 * Output is also teed to DEV_LOG so build errors after startup can be collected (getPreviewErrors).
 */
export async function* startDevServer(sandbox: Sandbox, command: string): AsyncGenerator<StartEvent> {
  await ensureProjectDir(sandbox);

  /*
   * Stop the previous dev server (and its proxy) and wait until the preview ports are really
   * free — a new server started while the old one still holds them dies with EADDRINUSE.
   * Escalates to SIGKILL, and finally frees the ports by force, if they don't free up.
   */
  const ports = [...new Set([...PREVIEW_PORTS, DEV_PORT])];
  const anyPortBusy = ports.map((p) => `(echo > /dev/tcp/127.0.0.1/${p}) 2>/dev/null`).join(' || ');
  await sandbox.runCommand('bash', [
    '-c',
    `pg=$(cat ${DEV_PID_FILE} 2>/dev/null)
[ -n "$pg" ] && kill -TERM -- -$pg 2>/dev/null
for i in $(seq 1 30); do ${anyPortBusy} || break; sleep 0.1; done
if ${anyPortBusy}; then
  [ -n "$pg" ] && kill -KILL -- -$pg 2>/dev/null
  sleep 0.3
  for p in ${ports.join(' ')}; do fuser -k -n tcp $p 2>/dev/null; done
  for i in $(seq 1 20); do ${anyPortBusy} || break; sleep 0.1; done
fi
rm -f ${DEV_PID_FILE} ${DEV_LOG_OFFSET} ${RUNTIME_ERRORS}; : > ${DEV_LOG}; true`,
  ]);

  const plan = await planDevServer(sandbox, command);
  const previewHost = new URL(sandbox.domain(PREVIEW_PORTS[0])).hostname;
  const allowedHosts = '.' + previewHost.split('.').slice(1).join('.');

  if (plan.command !== command) {
    yield { type: 'log', data: `[sandbox] running: ${plan.command}\n` };
  }

  if (plan.proxied) {
    await sandbox.writeFiles([
      { path: BRIDGE_FILE, content: Buffer.from(PREVIEW_BRIDGE_SCRIPT) },
      { path: PROXY_FILE, content: Buffer.from(PREVIEW_PROXY_SCRIPT) },
    ]);
  }

  const proxyStart = plan.proxied ? `node ${PROXY_FILE} > ${PROXY_LOG} 2>&1 & ` : '';

  const cmd = await sandbox.runCommand({
    cmd: 'setsid',
    args: [
      'bash',
      '-lc',
      `set -o pipefail; echo $$ > ${DEV_PID_FILE}; ${proxyStart}{ ${plan.command} ; } 2>&1 | tee -a ${DEV_LOG}`,
    ],
    cwd: PROJECT_DIR,
    env: {
      HOST: '0.0.0.0',
      BROWSER: 'none',
      FORCE_COLOR: '1',

      // Newer Vite (and anything reading it) — older Vite is handled by the wrapper config.
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: allowedHosts,

      ...(plan.proxied
        ? {
            PORT: String(DEV_PORT),
            SITARA_PROXY_PORT: String(PROXY_PORT),
            SITARA_DEV_PORT: String(DEV_PORT),
            SITARA_BRIDGE_FILE: BRIDGE_FILE,
            SITARA_ERRORS_FILE: RUNTIME_ERRORS,
          }
        : {}),
    },
    detached: true,
  });

  const events: StartEvent[] = [];
  let wake: (() => void) | undefined;
  let done = false;

  const push = (event: StartEvent) => {
    events.push(event);
    wake?.();
  };

  (async () => {
    try {
      for await (const log of cmd.logs()) {
        push({ type: 'log', data: log.data });
      }

      const finished = await cmd.wait();
      push({ type: 'exit', code: finished.exitCode ?? 1 });
    } catch (error) {
      push({ type: 'log', data: `\n[sandbox] log stream ended: ${error instanceof Error ? error.message : error}\n` });
      push({ type: 'exit', code: 1 });
    }
  })();

  (async () => {
    const deadline = Date.now() + 6 * 60_000;

    while (!done && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (plan.proxied) {
        // Ready once the dev server answers behind the proxy; the proxy port is the preview.
        if ((await isPortOpen(sandbox, DEV_PORT).catch(() => false)) && (await isPortOpen(sandbox, PROXY_PORT))) {
          push({ type: 'url', url: sandbox.domain(PROXY_PORT) });
          return;
        }

        continue;
      }

      const port = await findListeningPort(sandbox).catch(() => undefined);

      if (port) {
        push({ type: 'url', url: sandbox.domain(port) });
        return;
      }
    }

    if (!done) {
      push({ type: 'log', data: `\n[sandbox] No dev server found on ports ${PREVIEW_PORTS.join(', ')}.\n` });
      push({ type: 'exit', code: 1 });
    }
  })();

  while (true) {
    while (events.length) {
      const event = events.shift()!;
      yield event;

      // The dev server keeps running after this; the response only covers its startup.
      if (event.type === 'url' || event.type === 'exit') {
        done = true;
        return;
      }
    }

    await new Promise<void>((resolve) => (wake = resolve));
    wake = undefined;
  }
}

export interface PreviewError {
  kind: 'build' | 'runtime';
  message: string;
  detail: string;
}

// Lines a dev server prints when compiling or serving fails (Vite, Next.js, generic Node).
const BUILD_ERROR_LINE =
  /(Internal server error|Pre-transform error|Failed to resolve import|\[plugin:|⨯|Failed to compile|Module not found|SyntaxError|TypeError|ReferenceError|Error:)/;

function stripAnsi(text: string) {
  return text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

/**
 * Errors since the last call: build errors from new dev-server output, and runtime errors
 * the injected reporter beaconed from the preview page. Each call consumes what it returns.
 */
export async function getPreviewErrors(sandbox: Sandbox): Promise<PreviewError[]> {
  const result = await run(
    sandbox,
    `off=$(cat ${DEV_LOG_OFFSET} 2>/dev/null || echo 0); size=$(stat -c %s ${DEV_LOG} 2>/dev/null || echo 0)
[ "$size" -lt "$off" ] && off=0
echo "$size" > ${DEV_LOG_OFFSET}
tail -c +$((off + 1)) ${DEV_LOG} 2>/dev/null | head -c 100000
echo; echo '@@SITARA_RUNTIME@@'
if [ -f ${RUNTIME_ERRORS} ]; then mv ${RUNTIME_ERRORS} ${RUNTIME_ERRORS}.read; cat ${RUNTIME_ERRORS}.read; fi`,
  );

  const [logPart = '', runtimePart = ''] = (await result.stdout()).split('@@SITARA_RUNTIME@@');
  const errors: PreviewError[] = [];
  const lines = stripAnsi(logPart).split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (BUILD_ERROR_LINE.test(lines[i])) {
      const block = lines
        .slice(i, i + 12)
        .join('\n')
        .trim();
      errors.push({ kind: 'build', message: lines[i].trim().slice(0, 300), detail: block });
      i += 11;
    }
  }

  for (const line of runtimePart.split('\n')) {
    try {
      const entry = JSON.parse(line) as { message?: string; stack?: string; url?: string };
      errors.push({
        kind: 'runtime',
        message: String(entry.message || 'Error').slice(0, 300),
        detail: `${entry.message || ''}\nPage: ${entry.url || ''}\n\n${entry.stack || ''}`.trim(),
      });
    } catch {
      // blank or partial line
    }
  }

  return errors.slice(0, 10);
}

/** Looks the sandbox up by name without resuming or creating it. */
async function findStoredSandbox(env: ServerEnv, name: string): Promise<Sandbox | undefined> {
  const credentials = await getSandboxCredentials(env);

  if (!credentials) {
    return undefined;
  }

  try {
    return await Sandbox.get({ ...credentials, name });
  } catch {
    return undefined; // never created
  }
}

/**
 * Keep-alive from an open builder tab. Never resumes a stopped sandbox — the client shows
 * "Restart preview" instead — and reports whether the dev server is still answering.
 */
export async function pingChatSandbox(
  env: ServerEnv,
  userId: string,
  chatKey: string,
): Promise<{ running: boolean; url?: string }> {
  const sandbox = await findStoredSandbox(env, sandboxName(userId, chatKey));

  if (!sandbox || sandbox.status !== 'running') {
    return { running: false };
  }

  await keepAlive(sandbox);

  // The URL lets a builder that lost track (page reload, status mix-up) reconnect to the server.
  if ((await isPortOpen(sandbox, DEV_PORT).catch(() => false)) && (await isPortOpen(sandbox, PROXY_PORT))) {
    return { running: true, url: sandbox.domain(PROXY_PORT) };
  }

  const port = await findListeningPort(sandbox).catch(() => undefined);

  return port ? { running: true, url: sandbox.domain(port) } : { running: false };
}

/*
 * Deletes rather than stops, so nothing (snapshots, the name) is left behind. Looked up by name:
 * the stop beacon from a closing tab can land on any replica behind the load balancer.
 */
export async function stopChatSandbox(env: ServerEnv, userId: string, chatKey: string) {
  const sandbox = await findStoredSandbox(env, sandboxName(userId, chatKey));

  if (sandbox) {
    await sandbox.delete({ deleteOrphanSnapshots: true });
  }
}

/** Polled by the builder while a preview is live; never resumes a stopped sandbox. */
export async function getChatPreviewErrors(env: ServerEnv, userId: string, chatKey: string): Promise<PreviewError[]> {
  const sandbox = await findStoredSandbox(env, sandboxName(userId, chatKey));

  if (!sandbox || sandbox.status !== 'running') {
    return [];
  }

  return getPreviewErrors(sandbox);
}

const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024;

/**
 * Returns the first of `candidates` that exists in the project, with every file under it
 * (base64). Used after `npm run build` so deploys can read the build output.
 */
export async function downloadDirectory(
  sandbox: Sandbox,
  candidates: string[],
): Promise<{ dir: string; files: Array<{ path: string; content: string }> } | undefined> {
  const safe = candidates.filter((dir) => /^[\w.-]+$/.test(dir));

  if (!safe.length) {
    return undefined;
  }

  const script = `for d in ${safe.join(' ')}; do [ -d "$d" ] && { echo "@@DIR@@$d"; find "$d" -path "$d/cache" -prune -o -type f -print0 | while IFS= read -r -d '' f; do printf '%s\t' "$f"; base64 -w0 "$f"; echo; done; exit 0; }; done; exit 1`;
  const result = await run(sandbox, script);

  if (result.exitCode !== 0) {
    return undefined;
  }

  const stdout = await result.stdout();

  if (stdout.length > MAX_DOWNLOAD_BYTES * 1.4) {
    throw new Error('Build output is too large to download (over 40 MB).');
  }

  const [header, ...lines] = stdout.split('\n');
  const dir = header.replace('@@DIR@@', '').trim();
  const files: Array<{ path: string; content: string }> = [];

  for (const line of lines) {
    const tab = line.indexOf('\t');

    if (tab > 0) {
      files.push({ path: CLIENT_WORKDIR + line.slice(0, tab), content: line.slice(tab + 1) });
    }
  }

  return { dir, files };
}
