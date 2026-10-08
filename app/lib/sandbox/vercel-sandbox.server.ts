import { createHash } from 'node:crypto';
import { Sandbox } from '@vercel/sandbox';
import { getProviderToken } from '~/lib/config/provider-tokens.server';
import type { ServerEnv } from '~/lib/mongo.server';

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

/** Streams a shell command's output; the generator's return value is the exit code. */
export async function* runShell(sandbox: Sandbox, command: string): AsyncGenerator<string, number> {
  await ensureProjectDir(sandbox);

  const cmd = await sandbox.runCommand({ cmd: 'bash', args: ['-lc', command], cwd: PROJECT_DIR, detached: true });

  for await (const log of cmd.logs()) {
    yield log.data;
  }

  const finished = await cmd.wait();

  return finished.exitCode ?? 1;
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
 * Injected into the preview page so crashes reach the builder. A blank page is usually a
 * module that failed to load (resource error, captured below) or a render that threw.
 */
const ERROR_REPORTER = `(function () {
  var sent = 0;
  function send(d) {
    if (sent++ > 20) return;
    d.url = location.href;
    try { navigator.sendBeacon('/__sitara/error', JSON.stringify(d)); } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      send({ kind: 'runtime', message: 'Failed to load ' + (t.src || t.href), stack: '' });
      return;
    }
    send({ kind: 'runtime', message: String(e.message || (e.error && e.error.message) || 'Error'), stack: (e.error && e.error.stack) || '' });
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    send({ kind: 'runtime', message: 'Unhandled promise rejection: ' + ((r && r.message) || String(r)), stack: (r && r.stack) || '' });
  });
  window.addEventListener('load', function () {
    setTimeout(function () {
      var root = document.getElementById('root') || document.getElementById('app');
      if (root && !root.children.length && !sent) {
        send({ kind: 'runtime', message: 'The page rendered nothing (#' + root.id + ' is empty).', stack: '' });
      }
    }, 5000);
  });
})();`;

/*
 * Wraps the project's own vite.config (whatever its name or language) and opens it to the
 * sandbox's public hostname. Vite rejects unknown Host headers ("Blocked request. This host
 * is not allowed"), and the `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` env var only exists in
 * newer Vite releases — templates pin Vite 5.4.x, which ignores it. It also injects the error
 * reporter above and collects its beacons. Lives under node_modules so it resolves `vite` from
 * the project, stays out of the user's file tree and is never synced.
 */
const VITE_WRAPPER_PATH = 'node_modules/.sitara/vite.config.mjs';
const VITE_WRAPPER = `import { appendFileSync } from 'node:fs';
import { defineConfig, loadConfigFromFile, mergeConfig } from 'vite';

const reporter = ${JSON.stringify(ERROR_REPORTER)};

const sitaraErrors = {
  name: 'sitara-preview-errors',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__sitara/error', (req, res) => {
      let body = '';
      req.on('data', (chunk) => { if (body.length < 20000) body += chunk; });
      req.on('end', () => {
        try { appendFileSync(${JSON.stringify(RUNTIME_ERRORS)}, JSON.stringify(JSON.parse(body)) + '\\n'); } catch {}
        res.statusCode = 204;
        res.end();
      });
    });
  },
  transformIndexHtml() {
    return [{ tag: 'script', injectTo: 'head-prepend', children: reporter }];
  },
};

export default defineConfig(async (env) => {
  const loaded = await loadConfigFromFile(env, undefined, process.cwd());

  return mergeConfig(loaded?.config ?? {}, {
    plugins: [sitaraErrors],
    server: { host: '0.0.0.0', allowedHosts: true },
  });
});
`;

/*
 * Vite binds to localhost by default (unreachable through the sandbox proxy) and checks the
 * Host header, so a Vite dev script is pointed at the wrapper config above.
 */
async function adaptDevCommand(sandbox: Sandbox, command: string): Promise<string> {
  // Restored chats start with `npm install && npm run dev`; only the last step serves.
  const steps = command.split('&&');
  const last = steps[steps.length - 1].trim();
  const match = last.match(/^(npm|pnpm|yarn)\s+(?:run\s+)?([\w:-]+)$/);

  if (!match) {
    return command;
  }

  const pkg = await readPackageJson(sandbox);
  const script = pkg?.scripts?.[match[2]] || '';

  if (/^\s*vite(\s|$)/.test(script) && !/--config\b/.test(script)) {
    await sandbox.runCommand('mkdir', ['-p', `${PROJECT_DIR}/node_modules/.sitara`]);
    await sandbox.writeFiles([{ path: `${PROJECT_DIR}/${VITE_WRAPPER_PATH}`, content: Buffer.from(VITE_WRAPPER) }]);

    const extraArgs = `--config ${VITE_WRAPPER_PATH} --host 0.0.0.0`;
    steps[steps.length - 1] = ` ${last} ${match[1] === 'npm' ? '-- ' : ''}${extraArgs}`;

    return steps.join('&&').trim();
  }

  return command;
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
 * Restarts the dev server: kills the previous one, launches the new command in its own process
 * group, streams its output, and reports the public URL once a preview port accepts connections.
 * Output is also teed to DEV_LOG so build errors after startup can be collected (getPreviewErrors).
 */
export async function* startDevServer(sandbox: Sandbox, command: string): AsyncGenerator<StartEvent> {
  await ensureProjectDir(sandbox);
  await sandbox.runCommand('bash', [
    '-c',
    `[ -f ${DEV_PID_FILE} ] && kill -TERM -- -$(cat ${DEV_PID_FILE}) 2>/dev/null; rm -f ${DEV_PID_FILE} ${DEV_LOG_OFFSET} ${RUNTIME_ERRORS}; : > ${DEV_LOG}; true`,
  ]);

  const devCommand = await adaptDevCommand(sandbox, command);
  const previewHost = new URL(sandbox.domain(PREVIEW_PORTS[0])).hostname;
  const allowedHosts = '.' + previewHost.split('.').slice(1).join('.');

  if (devCommand !== command) {
    yield { type: 'log', data: `[sandbox] running: ${devCommand}\n` };
  }

  const cmd = await sandbox.runCommand({
    cmd: 'setsid',
    args: ['bash', '-lc', `set -o pipefail; echo $$ > ${DEV_PID_FILE}; { ${devCommand} ; } 2>&1 | tee -a ${DEV_LOG}`],
    cwd: PROJECT_DIR,
    env: {
      HOST: '0.0.0.0',
      BROWSER: 'none',
      FORCE_COLOR: '1',

      // Newer Vite (and anything reading it) — older Vite is handled by the wrapper config.
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: allowedHosts,
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
export async function pingChatSandbox(env: ServerEnv, userId: string, chatKey: string): Promise<{ running: boolean }> {
  const sandbox = await findStoredSandbox(env, sandboxName(userId, chatKey));

  if (!sandbox || sandbox.status !== 'running') {
    return { running: false };
  }

  await keepAlive(sandbox);

  return { running: Boolean(await findListeningPort(sandbox).catch(() => undefined)) };
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
