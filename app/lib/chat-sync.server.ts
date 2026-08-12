import { Binary } from 'mongodb';
import { withMongo, type ServerEnv } from '~/lib/mongo.server';

const COLLECTION = 'chat_history';

/**
 * MongoDB caps a single document at 16MB. Snapshots arrive already gzipped by the
 * browser; this leaves headroom for the messages array and metadata in the same doc.
 */
export const MAX_SNAPSHOT_BYTES = 12 * 1024 * 1024;

interface StoredSnapshot {
  chatIndex: string;
  summary?: string;
  filesGzip: Binary;
  uncompressedBytes: number;
}

export interface SyncedChatDoc {
  /**
   * Original creator. Always taken from the session — never from the request body.
   * Set once on insert and never overwritten, so authorship survives a super_admin
   * later editing the same chat.
   */
  userId: string;

  /** First user message ID: stable across devices, unlike the IndexedDB sequential ID. */
  trackingId: string;
  urlId?: string;
  description?: string;
  messages: unknown[];
  metadata?: unknown;
  snapshot?: StoredSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

/** Wire format. `filesGzip` is base64 so the payload survives JSON transport. */
export interface ChatSyncPayload {
  trackingId: string;
  urlId?: string;
  description?: string;
  messages: unknown[];
  metadata?: unknown;
  snapshot?: {
    chatIndex: string;
    summary?: string;
    filesGzip: string;
    uncompressedBytes: number;
  };
}

export type ChatSyncRecord = ChatSyncPayload & { updatedAt: string };

export interface ChatSyncSummary {
  trackingId: string;
  urlId?: string;
  description?: string;
  messageCount: number;
  hasSnapshot: boolean;
  updatedAt: string;
}

export class ChatSyncValidationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ChatSyncValidationError';
  }
}

/**
 * Validates an untrusted request body. Throws `ChatSyncValidationError` rather than
 * letting a malformed payload reach MongoDB as a partial write.
 */
export function parseChatSyncPayload(body: unknown): ChatSyncPayload {
  if (!body || typeof body !== 'object') {
    throw new ChatSyncValidationError('Request body must be an object', 400);
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.trackingId !== 'string' || raw.trackingId.trim() === '') {
    throw new ChatSyncValidationError('trackingId is required', 400);
  }

  if (!Array.isArray(raw.messages)) {
    throw new ChatSyncValidationError('messages must be an array', 400);
  }

  const payload: ChatSyncPayload = {
    trackingId: raw.trackingId,
    urlId: typeof raw.urlId === 'string' ? raw.urlId : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    messages: raw.messages,
    metadata: raw.metadata,
  };

  if (raw.snapshot) {
    const snap = raw.snapshot as Record<string, unknown>;

    if (typeof snap.filesGzip !== 'string' || typeof snap.chatIndex !== 'string') {
      throw new ChatSyncValidationError('snapshot requires chatIndex and filesGzip', 400);
    }

    // base64 carries 3 bytes per 4 characters — check decoded size against the document budget.
    const approxBytes = Math.floor((snap.filesGzip.length * 3) / 4);

    if (approxBytes > MAX_SNAPSHOT_BYTES) {
      throw new ChatSyncValidationError(
        `Snapshot is too large to sync (${Math.round(approxBytes / 1024 / 1024)}MB compressed, limit ${
          MAX_SNAPSHOT_BYTES / 1024 / 1024
        }MB)`,
        413,
      );
    }

    payload.snapshot = {
      chatIndex: snap.chatIndex,
      summary: typeof snap.summary === 'string' ? snap.summary : undefined,
      filesGzip: snap.filesGzip,
      uncompressedBytes: typeof snap.uncompressedBytes === 'number' ? snap.uncompressedBytes : 0,
    };
  }

  return payload;
}

export interface RequestingUser {
  userId: string;
  role: string;
}

function canAccessChat(requestingUser: RequestingUser, ownerUserId: string): boolean {
  return requestingUser.role === 'super_admin' || requestingUser.userId === ownerUserId;
}

/**
 * Upserts one chat, keyed on `trackingId` alone (not `userId` + `trackingId`) so the
 * same chat resolves to a single shared document that a super_admin can edit without
 * forking a private copy. `trackingId` is the first user message ID minted by the `ai`
 * SDK's `generateId()`, which is unique enough across users to serve as the sole key.
 * A non-owner, non-super_admin caller is rejected before any write happens.
 */
export async function putSyncedChat(
  requestingUser: RequestingUser,
  payload: ChatSyncPayload,
  env?: ServerEnv,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  return withMongo(env, async (db) => {
    const collection = db.collection<SyncedChatDoc>(COLLECTION);
    const existing = await collection.findOne({ trackingId: payload.trackingId }, { projection: { userId: 1 } });

    if (existing && !canAccessChat(requestingUser, existing.userId)) {
      return { ok: false, status: 403, error: 'You do not have access to this chat' };
    }

    const now = new Date();
    const snapshot: StoredSnapshot | undefined = payload.snapshot
      ? {
          chatIndex: payload.snapshot.chatIndex,
          summary: payload.snapshot.summary,
          filesGzip: new Binary(Buffer.from(payload.snapshot.filesGzip, 'base64')),
          uncompressedBytes: payload.snapshot.uncompressedBytes,
        }
      : undefined;

    await collection.updateOne(
      { trackingId: payload.trackingId },
      {
        $set: {
          urlId: payload.urlId,
          description: payload.description,
          messages: payload.messages,
          metadata: payload.metadata,
          updatedAt: now,

          /*
           * Only overwrite the stored snapshot when this push actually carries one, so a
           * messages-only sync never wipes the files needed to restore the project.
           */
          ...(snapshot ? { snapshot } : {}),
        },
        // userId (creator) is set once on insert and never reassigned on later edits.
        $setOnInsert: { userId: requestingUser.userId, trackingId: payload.trackingId, createdAt: now },
      },
      { upsert: true },
    );

    return { ok: true };
  });
}

/**
 * Looks a chat up by `trackingId` OR `urlId`. Chat URLs are `/chat/<urlId>`, so a link
 * opened on a second device arrives with the urlId — matching only on trackingId would
 * make every shared link miss.
 *
 * Access is enforced in application code rather than the Mongo filter: super_admin may
 * read any chat, everyone else only their own (`canAccessChat`).
 */
export async function getSyncedChat(
  requestingUser: RequestingUser,
  trackingIdOrUrlId: string,
  env?: ServerEnv,
): Promise<ChatSyncRecord | null> {
  return withMongo(env, async (db) => {
    const doc = await db
      .collection<SyncedChatDoc>(COLLECTION)
      .findOne({ $or: [{ trackingId: trackingIdOrUrlId }, { urlId: trackingIdOrUrlId }] });

    if (!doc || !canAccessChat(requestingUser, doc.userId)) {
      return null;
    }

    return {
      trackingId: doc.trackingId,
      urlId: doc.urlId,
      description: doc.description,
      messages: doc.messages,
      metadata: doc.metadata,
      snapshot: doc.snapshot
        ? {
            chatIndex: doc.snapshot.chatIndex,
            summary: doc.snapshot.summary,
            filesGzip: Buffer.from(doc.snapshot.filesGzip.buffer).toString('base64'),
            uncompressedBytes: doc.snapshot.uncompressedBytes,
          }
        : undefined,
      updatedAt: doc.updatedAt.toISOString(),
    };
  });
}

/**
 * Lightweight listing — deliberately excludes messages and file blobs. super_admin sees
 * every synced chat; everyone else sees only chats they created (mirrors `getChats` in
 * project-tracker.server.ts).
 */
export async function listSyncedChats(requestingUser: RequestingUser, env?: ServerEnv): Promise<ChatSyncSummary[]> {
  return withMongo(env, async (db) => {
    const filter = requestingUser.role === 'super_admin' ? {} : { userId: requestingUser.userId };
    const docs = await db
      .collection<SyncedChatDoc>(COLLECTION)
      .aggregate([
        { $match: filter },
        {
          $project: {
            trackingId: 1,
            urlId: 1,
            description: 1,
            updatedAt: 1,
            messageCount: { $size: { $ifNull: ['$messages', []] } },
            hasSnapshot: { $cond: [{ $ifNull: ['$snapshot', false] }, true, false] },
          },
        },
        { $sort: { updatedAt: -1 } },
      ])
      .toArray();

    return docs.map((d) => ({
      trackingId: d.trackingId,
      urlId: d.urlId,
      description: d.description,
      messageCount: d.messageCount ?? 0,
      hasSnapshot: Boolean(d.hasSnapshot),
      updatedAt: new Date(d.updatedAt).toISOString(),
    }));
  });
}
