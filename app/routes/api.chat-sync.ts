import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import {
  ChatSyncValidationError,
  getSyncedChat,
  listSyncedChats,
  parseChatSyncPayload,
  putSyncedChat,
} from '~/lib/chat-sync.server';

/**
 * GET /api/chat-sync              → summaries of every chat this user has synced
 * GET /api/chat-sync?trackingId=x → one full chat, including the gzipped snapshot
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);

  const trackingId = new URL(request.url).searchParams.get('trackingId');

  if (!trackingId) {
    return json({ chats: await listSyncedChats(user.userId, env) });
  }

  /*
   * Scoped to user.userId from the session cookie. A client-supplied trackingId can
   * only ever reach this user's own rows, so guessing another user's ID gains nothing.
   */
  const chat = await getSyncedChat(user.userId, trackingId, env);

  if (!chat) {
    return json({ error: 'Chat not found' }, { status: 404 });
  }

  return json({ chat });
}

/** POST /api/chat-sync — upsert this user's copy of a chat (messages and/or snapshot). */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = parseChatSyncPayload(await request.json());
    await putSyncedChat(user.userId, payload, env);

    return json({ success: true, trackingId: payload.trackingId });
  } catch (error) {
    if (error instanceof ChatSyncValidationError) {
      return json({ error: error.message }, { status: error.status });
    }

    console.error('[chat-sync] upsert failed:', error);

    return json({ error: 'Failed to sync chat' }, { status: 500 });
  }
}
