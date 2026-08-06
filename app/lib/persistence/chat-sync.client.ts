import type { Message } from 'ai';
import type { Snapshot } from './types';
import type { IChatMetadata } from './db';

const ENDPOINT = '/api/chat-sync';

/** Snapshots are written on every assistant turn; coalesce bursts into one upload. */
const PUSH_DEBOUNCE_MS = 4000;

export interface RemoteChat {
  trackingId: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  metadata?: IChatMetadata;
  snapshot?: Snapshot;
  updatedAt: string;
}

export interface RemoteChatSummary {
  trackingId: string;
  urlId?: string;
  description?: string;
  messageCount: number;
  hasSnapshot: boolean;
  updatedAt: string;
}

/**
 * The canonical cross-device chat key: the first user message ID. IndexedDB IDs are
 * sequential per browser, so two devices both mint "4" — they cannot be synced on.
 * Must stay identical to the derivation in `api.chat.ts`.
 */
export function deriveTrackingId(messages: Message[]): string | undefined {
  return messages.filter((m) => m.role === 'user')[0]?.id;
}

export function isSyncSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  /*
   * Chunked so a large snapshot does not blow the argument limit of String.fromCharCode,
   * which throws RangeError somewhere around a hundred thousand arguments.
   */
  let binary = '';

  const CHUNK = 0x8000;

  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}

/** Gzip in the browser so the Worker never spends CPU on compression. */
async function gzipToBase64(value: unknown): Promise<{ base64: string; uncompressedBytes: number }> {
  const json = JSON.stringify(value);
  const raw = new TextEncoder().encode(json);

  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));

  return { base64: await streamToBase64(stream), uncompressedBytes: raw.byteLength };
}

async function gunzipFromBase64<T>(base64: string): Promise<T> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));

  return JSON.parse(await new Response(stream).text()) as T;
}

/** Snapshot as it goes over the wire: files gzipped and base64-encoded. */
interface WireSnapshot {
  chatIndex: string;
  summary?: string;
  filesGzip: string;
  uncompressedBytes: number;
}

export interface PushChatArgs {
  trackingId: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  metadata?: IChatMetadata;
  snapshot?: Snapshot;
}

/**
 * Uploads one chat. Resolves to false on any failure — syncing is a background
 * convenience and must never block or break the local-first write path.
 */
export async function pushChat(args: PushChatArgs): Promise<boolean> {
  if (!isSyncSupported()) {
    return false;
  }

  try {
    let snapshot: WireSnapshot | undefined;

    if (args.snapshot) {
      const { base64, uncompressedBytes } = await gzipToBase64(args.snapshot.files);
      snapshot = {
        chatIndex: args.snapshot.chatIndex,
        summary: args.snapshot.summary,
        filesGzip: base64,
        uncompressedBytes,
      };
    }

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: args.trackingId,
        urlId: args.urlId,
        description: args.description,
        messages: args.messages,
        metadata: args.metadata,
        snapshot,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      console.warn('[chat-sync] push rejected:', response.status, body.error ?? '');

      return false;
    }

    return true;
  } catch (error) {
    console.warn('[chat-sync] push failed:', error);
    return false;
  }
}

const pendingPushes = new Map<string, ReturnType<typeof setTimeout>>();

/** Debounced per chat, so a fast back-and-forth uploads once instead of per message. */
export function schedulePush(args: PushChatArgs): void {
  const existing = pendingPushes.get(args.trackingId);

  if (existing) {
    clearTimeout(existing);
  }

  pendingPushes.set(
    args.trackingId,
    setTimeout(() => {
      pendingPushes.delete(args.trackingId);
      void pushChat(args);
    }, PUSH_DEBOUNCE_MS),
  );
}

/** Fetches one chat, decompressing the snapshot. Returns null when absent or on error. */
export async function pullChat(trackingId: string): Promise<RemoteChat | null> {
  if (!isSyncSupported()) {
    return null;
  }

  try {
    const response = await fetch(`${ENDPOINT}?trackingId=${encodeURIComponent(trackingId)}`);

    if (!response.ok) {
      return null;
    }

    const { chat } = (await response.json()) as { chat: any };

    if (!chat) {
      return null;
    }

    return {
      trackingId: chat.trackingId,
      urlId: chat.urlId,
      description: chat.description,
      messages: chat.messages ?? [],
      metadata: chat.metadata,
      snapshot: chat.snapshot
        ? {
            chatIndex: chat.snapshot.chatIndex,
            summary: chat.snapshot.summary,
            files: await gunzipFromBase64(chat.snapshot.filesGzip),
          }
        : undefined,
      updatedAt: chat.updatedAt,
    };
  } catch (error) {
    console.warn('[chat-sync] pull failed:', error);
    return null;
  }
}

export async function listRemoteChats(): Promise<RemoteChatSummary[]> {
  try {
    const response = await fetch(ENDPOINT);

    if (!response.ok) {
      return [];
    }

    const { chats } = (await response.json()) as { chats: RemoteChatSummary[] };

    return chats ?? [];
  } catch (error) {
    console.warn('[chat-sync] list failed:', error);
    return [];
  }
}
