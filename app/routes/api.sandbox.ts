import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import {
  getChatPreviewErrors,
  getChatSandbox,
  getManifest,
  getSandboxCredentials,
  pingChatSandbox,
  runShell,
  startDevServer,
  stopChatSandbox,
  syncFiles,
  type SyncFile,
} from '~/lib/sandbox/vercel-sandbox.server';

/*
 * Remote preview API (see vercel-sandbox.server.ts).
 *
 * GET  → { enabled } — whether sandboxes are configured on this install.
 * POST { op: 'sync', chatKey, files, deleted } → { ok }
 * POST { op: 'run' | 'start', chatKey, command } → NDJSON stream of
 *      {t:'log',d} … then {t:'exit',code} (run) or {t:'url',url} (start, once the port answers).
 * POST { op: 'manifest', chatKey } → { files: { [path]: sha1 } } — checked before each command.
 * POST { op: 'errors', chatKey } → { errors } — build/runtime errors since the last poll.
 * POST { op: 'ping', chatKey } → { running } — keep-alive; never wakes a stopped sandbox.
 * POST { op: 'stop', chatKey } → { ok } — also sent via sendBeacon when the chat closes.
 */

type SandboxRequest =
  | { op: 'sync'; chatKey: string; files?: SyncFile[]; deleted?: string[] }
  | { op: 'run' | 'start'; chatKey: string; command: string }
  | { op: 'manifest' | 'errors' | 'ping' | 'stop'; chatKey: string };

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  await requireAuth(request, env);

  return json({ enabled: Boolean(await getSandboxCredentials(env)) });
}

function ndjsonStream(source: AsyncGenerator<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await source.next();

        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(encoder.encode(JSON.stringify({ t: 'error', message }) + '\n'));
        controller.close();
      }
    },
    async cancel() {
      await source.return(undefined);
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);

  const body = (await request.json()) as SandboxRequest;

  if (!body?.chatKey || typeof body.chatKey !== 'string' || body.chatKey.length > 200) {
    return json({ error: 'chatKey is required' }, { status: 400 });
  }

  if (!(await getSandboxCredentials(env))) {
    return json({ error: 'Remote preview is not configured on this server.' }, { status: 409 });
  }

  try {
    switch (body.op) {
      case 'sync': {
        const sandbox = await getChatSandbox(env, user.userId, body.chatKey);
        await syncFiles(sandbox, body.files ?? [], body.deleted ?? []);

        return json({ ok: true });
      }

      case 'run': {
        const sandbox = await getChatSandbox(env, user.userId, body.chatKey);
        const command = body.command;

        return ndjsonStream(
          (async function* () {
            const shell = runShell(sandbox, command);

            while (true) {
              const step = await shell.next();

              if (step.done) {
                yield { t: 'exit', code: step.value };
                return;
              }

              yield { t: 'log', d: step.value };
            }
          })(),
        );
      }

      case 'start': {
        const sandbox = await getChatSandbox(env, user.userId, body.chatKey);
        const command = body.command;

        return ndjsonStream(
          (async function* () {
            for await (const event of startDevServer(sandbox, command)) {
              if (event.type === 'log') {
                yield { t: 'log', d: event.data };
              } else if (event.type === 'url') {
                yield { t: 'url', url: event.url };
              } else {
                yield { t: 'exit', code: event.code };
              }
            }
          })(),
        );
      }

      case 'manifest': {
        const sandbox = await getChatSandbox(env, user.userId, body.chatKey);
        return json({ files: await getManifest(sandbox) });
      }

      case 'errors':
        return json({ errors: await getChatPreviewErrors(env, user.userId, body.chatKey) });

      case 'ping':
        return json(await pingChatSandbox(env, user.userId, body.chatKey));

      case 'stop': {
        await stopChatSandbox(env, user.userId, body.chatKey);
        return json({ ok: true });
      }

      default:
        return json({ error: 'Unknown op' }, { status: 400 });
    }
  } catch (error) {
    console.error('[api.sandbox]', error);
    return json({ error: error instanceof Error ? error.message : 'Sandbox request failed' }, { status: 502 });
  }
}
