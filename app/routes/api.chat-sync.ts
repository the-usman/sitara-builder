import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireFreshAuth } from '~/lib/auth.server';
import {
  ChatSyncValidationError,
  getSyncedChat,
  listSyncedChats,
  parseChatSyncPayload,
  putSyncedChat,
} from '~/lib/chat-sync.server';

/**
 * GET /api/chat-sync              → summaries of chats this user can see (all of them
 *                                    for super_admin, own chats otherwise)
 * GET /api/chat-sync?trackingId=x → one full chat, including the gzipped snapshot
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireFreshAuth(request, env);

  const trackingId = new URL(request.url).searchParams.get('trackingId');
  const requestingUser = { userId: user.userId, role: user.role };

  if (!trackingId) {
    return json({ chats: await listSyncedChats(requestingUser, env) });
  }

  /*
   * Access is enforced server-side against the session's role/userId — super_admin can
   * read any chat, everyone else only their own. A client-supplied trackingId can never
   * be used to read another user's chat by guessing its ID.
   */
  const chat = await getSyncedChat(requestingUser, trackingId, env);

  if (!chat) {
    return json({ error: 'Chat not found' }, { status: 404 });
  }

  return json({ chat });
}

/**
 * POST /api/chat-sync — upsert a chat's messages and/or snapshot. Rejected with 403 if
 * the chat already exists and belongs to a different, non-super_admin user.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireFreshAuth(request, env);

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = parseChatSyncPayload(await request.json());
    const result = await putSyncedChat({ userId: user.userId, role: user.role }, payload, env);

    if (!result.ok) {
      return json({ error: result.error }, { status: result.status });
    }

    return json({ success: true, trackingId: payload.trackingId });
  } catch (error) {
    if (error instanceof ChatSyncValidationError) {
      return json({ error: error.message }, { status: error.status });
    }

    console.error('[chat-sync] upsert failed:', error);

    return json({ error: 'Failed to sync chat' }, { status: 500 });
  }
}
