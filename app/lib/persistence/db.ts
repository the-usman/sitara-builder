import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';
import type { Snapshot } from './types'; // Import Snapshot type

export interface IChatMetadata {
  gitUrl: string;
  gitBranch?: string;
  netlifySiteId?: string;

  /**
   * The GitHub repo this chat auto-pushes to (repo name = the chat's trackingId), set by
   * the auto-sync in chat-sync.client.ts / api.github-push.ts. Deliberately separate from
   * `gitUrl`, which instead records the repo a chat was *imported from* — conflating the
   * two would overwrite import provenance the first time auto-push runs.
   */
  githubUrl?: string;
}

const logger = createScopedLogger('ChatHistory');

export const CHAT_INDEX_STORE = 'chatIndex';

/** The few fields the sidebar needs for a chat — kept in their own store so listing chats stays cheap. */
export interface ChatIndexEntry {
  id: string;
  urlId?: string;
  description?: string;
  timestamp: string;
  metadata?: IChatMetadata;

  /** First user message id — stable across devices, used to match local chats with synced ones. */
  trackingId?: string;
}

export function toChatIndexEntry(chat: {
  id: string;
  urlId?: string;
  description?: string;
  timestamp: string;
  metadata?: IChatMetadata;
  messages?: Message[];
}): ChatIndexEntry {
  return {
    id: chat.id,
    urlId: chat.urlId,
    description: chat.description,
    timestamp: chat.timestamp,
    metadata: chat.metadata,
    trackingId: chat.messages?.find((message) => message.role === 'user')?.id,
  };
}

// this is used at the top level and never rejects
export async function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === 'undefined') {
    console.error('indexedDB is not available in this environment.');
    return undefined;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open('boltHistory', 5);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('chats')) {
          const store = db.createObjectStore('chats', { keyPath: 'id' });
          store.createIndex('id', 'id', { unique: true });
          store.createIndex('urlId', 'urlId', { unique: true });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'chatId' });
        }
      }

      if (oldVersion < 3 && upgradeTransaction) {
        /*
         * urlId is a display/routing convenience minted independently per browser (e.g.
         * the "imported-files-N" fallback name) — it is NOT unique once chats sync across
         * devices/accounts (see chat-sync.client.ts), so enforcing uniqueness here throws
         * "Unable to add key to index 'urlId'" the moment two synced chats collide.
         */
        const store = upgradeTransaction.objectStore('chats');

        if (store.indexNames.contains('urlId')) {
          store.deleteIndex('urlId');
        }

        store.createIndex('urlId', 'urlId', { unique: false });
      }

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('snapshotHistory')) {
          const store = db.createObjectStore('snapshotHistory', { keyPath: 'id', autoIncrement: true });
          store.createIndex('chatId', 'chatId', { unique: false });
        }
      }

      if (oldVersion < 5 && upgradeTransaction) {
        // Small per-chat rows for the sidebar, so listing chats never has to read whole message histories.
        if (!db.objectStoreNames.contains(CHAT_INDEX_STORE)) {
          db.createObjectStore(CHAT_INDEX_STORE, { keyPath: 'id' });
        }

        const indexStore = upgradeTransaction.objectStore(CHAT_INDEX_STORE);
        const cursorRequest = upgradeTransaction.objectStore('chats').openCursor();

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;

          if (cursor) {
            indexStore.put(toChatIndexEntry(cursor.value));
            cursor.continue();
          }
        };
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      resolve(undefined);
      logger.error((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getAll(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as ChatHistoryItem[]);
    request.onerror = () => reject(request.error);
  });
}

function countStore(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Rebuilds the sidebar index from the chats store. Only needed when something wrote chats without going
 * through `setMessages` (bulk import/undo) — a one-off full read, after which listing is cheap again.
 */
export async function rebuildChatIndex(db: IDBDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['chats', CHAT_INDEX_STORE], 'readwrite');
    const indexStore = transaction.objectStore(CHAT_INDEX_STORE);
    indexStore.clear();

    const cursorRequest = transaction.objectStore('chats').openCursor();

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;

      if (cursor) {
        indexStore.put(toChatIndexEntry(cursor.value));
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Listing for the sidebar. Reads only the small `chatIndex` rows (title, ids, timestamp), never the message
 * histories, so it stays fast however many chats there are. If the index has drifted from the chats store
 * (e.g. rows written by an older build), it is rebuilt once.
 */
export async function getAllChatSummaries(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  const [chatCount, indexCount] = await Promise.all([countStore(db, 'chats'), countStore(db, CHAT_INDEX_STORE)]);

  if (chatCount !== indexCount) {
    logger.warn(`Chat index out of date (${indexCount} vs ${chatCount} chats), rebuilding`);
    await rebuildChatIndex(db);
  }

  const entries = await new Promise<ChatIndexEntry[]>((resolve, reject) => {
    const request = db.transaction(CHAT_INDEX_STORE, 'readonly').objectStore(CHAT_INDEX_STORE).getAll();

    request.onsuccess = () => resolve(request.result as ChatIndexEntry[]);
    request.onerror = () => reject(request.error);
  });

  return entries.map(({ trackingId, ...entry }) => ({
    ...entry,

    // Callers only use the messages to derive the tracking id, so a stub with the first user message is enough.
    messages: trackingId ? [{ id: trackingId, role: 'user' as const, content: '' }] : [],
  }));
}

/**
 * Finds a locally stored chat by its tracking ID (the first user message ID).
 *
 * The projects list links by tracking ID because `clientChatId` is frequently never
 * recorded — on a new chat the IndexedDB row does not exist until after the first
 * response, so the first upsert has no ID to send. Tracking ID is always present.
 */
export async function getMessagesByTrackingId(
  db: IDBDatabase,
  trackingId: string,
): Promise<ChatHistoryItem | undefined> {
  const chats = await getAll(db);

  return chats.find((chat) => chat.messages?.filter((m) => m.role === 'user')[0]?.id === trackingId);
}

export async function setMessages(
  db: IDBDatabase,
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
  timestamp?: string,
  metadata?: IChatMetadata,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats', CHAT_INDEX_STORE], 'readwrite');
    const store = transaction.objectStore('chats');

    if (timestamp && isNaN(Date.parse(timestamp))) {
      reject(new Error('Invalid timestamp'));
      return;
    }

    const chat = {
      id,
      messages,
      urlId,
      description,
      timestamp: timestamp ?? new Date().toISOString(),
      metadata,
    };

    store.put(chat);
    transaction.objectStore(CHAT_INDEX_STORE).put(toChatIndexEntry(chat));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function getMessages(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return (await getMessagesById(db, id)) || (await getMessagesByUrlId(db, id));
}

export async function getMessagesByUrlId(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const index = store.index('urlId');
    const request = index.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function getMessagesById(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteById(db: IDBDatabase, id: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['chats', 'snapshots', CHAT_INDEX_STORE], 'readwrite');
    transaction.objectStore(CHAT_INDEX_STORE).delete(id);
    const chatStore = transaction.objectStore('chats');
    const snapshotStore = transaction.objectStore('snapshots');

    const deleteChatRequest = chatStore.delete(id);
    const deleteSnapshotRequest = snapshotStore.delete(id); // Also delete snapshot

    let chatDeleted = false;
    let snapshotDeleted = false;

    const checkCompletion = () => {
      if (chatDeleted && snapshotDeleted) {
        resolve(undefined);
      }
    };

    deleteChatRequest.onsuccess = () => {
      chatDeleted = true;
      checkCompletion();
    };
    deleteChatRequest.onerror = () => reject(deleteChatRequest.error);

    deleteSnapshotRequest.onsuccess = () => {
      snapshotDeleted = true;
      checkCompletion();
    };

    deleteSnapshotRequest.onerror = (event) => {
      if ((event.target as IDBRequest).error?.name === 'NotFoundError') {
        snapshotDeleted = true;
        checkCompletion();
      } else {
        reject(deleteSnapshotRequest.error);
      }
    };

    transaction.oncomplete = () => {
      // This might resolve before checkCompletion if one operation finishes much faster
    };
    transaction.onerror = () => reject(transaction.error);
  });

  try {
    await deleteSnapshotHistoryForChat(db, id);
  } catch (error) {
    logger.error('Failed to delete snapshot history', error);
  }
}

export async function getNextId(db: IDBDatabase): Promise<string> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAllKeys();

    request.onsuccess = () => {
      /*
       * Keys are usually sequential numbers, but chats pulled from the server sync
       * (see chat-sync.client.ts) are stored keyed by urlId/trackingId, which are
       * non-numeric strings. `+"some-id"` is NaN, and Math.max poisons to NaN forever
       * once any single key is non-numeric — that's what produced the "/chat/NaN" bug.
       * Skip non-numeric keys instead of feeding them into the max.
       */
      const highestId = request.result.reduce((highest: number, key) => {
        const numericKey = Number(key);
        return Number.isFinite(numericKey) ? Math.max(highest, numericKey) : highest;
      }, 0);
      resolve(String(highestId + 1));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getUrlId(db: IDBDatabase, id: string): Promise<string> {
  const idList = await getUrlIds(db);

  if (!idList.includes(id)) {
    return id;
  } else {
    let i = 2;

    while (idList.includes(`${id}-${i}`)) {
      i++;
    }

    return `${id}-${i}`;
  }
}

async function getUrlIds(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const idList: string[] = [];

    const request = store.openCursor();

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        idList.push(cursor.value.urlId);
        cursor.continue();
      } else {
        resolve(idList);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function forkChat(db: IDBDatabase, chatId: string, messageId: string): Promise<string> {
  const chat = await getMessages(db, chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Find the index of the message to fork at
  const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);

  if (messageIndex === -1) {
    throw new Error('Message not found');
  }

  // Get messages up to and including the selected message
  const messages = chat.messages.slice(0, messageIndex + 1);

  return createChatFromMessages(db, chat.description ? `${chat.description} (fork)` : 'Forked chat', messages);
}

export async function duplicateChat(db: IDBDatabase, id: string): Promise<string> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  return createChatFromMessages(db, `${chat.description || 'Chat'} (copy)`, chat.messages);
}

export async function createChatFromMessages(
  db: IDBDatabase,
  description: string,
  messages: Message[],
  metadata?: IChatMetadata,
): Promise<string> {
  const newId = await getNextId(db);
  const newUrlId = await getUrlId(db, newId); // Get a new urlId for the duplicated chat

  await setMessages(
    db,
    newId,
    messages,
    newUrlId, // Use the new urlId
    description,
    undefined, // Use the current timestamp
    metadata,
  );

  return newUrlId; // Return the urlId instead of id for navigation
}

export async function updateChatDescription(db: IDBDatabase, id: string, description: string): Promise<void> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  if (!description.trim()) {
    throw new Error('Description cannot be empty');
  }

  await setMessages(db, id, chat.messages, chat.urlId, description, chat.timestamp, chat.metadata);
}

export async function updateChatMetadata(
  db: IDBDatabase,
  id: string,
  metadata: IChatMetadata | undefined,
): Promise<void> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  await setMessages(db, id, chat.messages, chat.urlId, chat.description, chat.timestamp, metadata);
}

export async function getSnapshot(db: IDBDatabase, chatId: string): Promise<Snapshot | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readonly');
    const store = transaction.objectStore('snapshots');
    const request = store.get(chatId);

    request.onsuccess = () => resolve(request.result?.snapshot as Snapshot | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function setSnapshot(
  db: IDBDatabase,
  chatId: string,
  snapshot: Snapshot,
  options: { recordHistory?: boolean } = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readwrite');
    const store = transaction.objectStore('snapshots');
    const request = store.put({ chatId, snapshot });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  /*
   * Mid-stream saves overwrite the "latest" snapshot only. Recording a full history copy (plus pruning)
   * on every save made streaming lag badly; history gets one entry per finished turn instead.
   */
  if (options.recordHistory === false) {
    return;
  }

  try {
    await appendSnapshotHistory(db, chatId, snapshot);
  } catch (error) {
    // History is a nice-to-have on top of the "latest" snapshot above - never let it block a save
    logger.error('Failed to append snapshot history', error);
  }
}

export interface SnapshotHistoryEntry {
  id: number;
  chatId: string;
  snapshot: Snapshot;
  timestamp: string;
}

// Each entry is a full copy of the project's files (media included), so keep this small.
const MAX_SNAPSHOT_HISTORY_PER_CHAT = 5;

async function pruneSnapshotHistory(store: IDBObjectStore, chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const index = store.index('chatId');
    const request = index.getAllKeys(IDBKeyRange.only(chatId));

    request.onsuccess = () => {
      // Keys are auto-incrementing, so the lowest keys are the oldest entries
      const keys = (request.result as number[]).sort((a, b) => a - b);
      const excess = keys.slice(0, Math.max(0, keys.length - MAX_SNAPSHOT_HISTORY_PER_CHAT));

      if (excess.length === 0) {
        resolve();
        return;
      }

      let remaining = excess.length;
      excess.forEach((key) => {
        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => {
          remaining -= 1;

          if (remaining === 0) {
            resolve();
          }
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    };

    request.onerror = () => reject(request.error);
  });
}

/** Appends a version of the given snapshot, keeping only the most recent `MAX_SNAPSHOT_HISTORY_PER_CHAT` per chat. */
export async function appendSnapshotHistory(db: IDBDatabase, chatId: string, snapshot: Snapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshotHistory', 'readwrite');
    const store = transaction.objectStore('snapshotHistory');
    const request = store.add({ chatId, snapshot, timestamp: new Date().toISOString() });

    request.onsuccess = () => {
      pruneSnapshotHistory(store, chatId).then(resolve).catch(reject);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Lists saved versions for a chat, newest first. */
export async function getSnapshotHistory(db: IDBDatabase, chatId: string): Promise<SnapshotHistoryEntry[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshotHistory', 'readonly');
    const store = transaction.objectStore('snapshotHistory');
    const index = store.index('chatId');
    const request = index.getAll(IDBKeyRange.only(chatId));

    request.onsuccess = () => {
      const entries = (request.result as SnapshotHistoryEntry[]) || [];
      entries.sort((a, b) => b.id - a.id);
      resolve(entries);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSnapshotHistoryEntry(
  db: IDBDatabase,
  id: number,
): Promise<SnapshotHistoryEntry | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshotHistory', 'readonly');
    const store = transaction.objectStore('snapshotHistory');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as SnapshotHistoryEntry | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSnapshotHistoryForChat(db: IDBDatabase, chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshotHistory', 'readwrite');
    const store = transaction.objectStore('snapshotHistory');
    const index = store.index('chatId');
    const request = index.getAllKeys(IDBKeyRange.only(chatId));

    request.onsuccess = () => {
      const keys = request.result as number[];

      if (keys.length === 0) {
        resolve();
        return;
      }

      let remaining = keys.length;
      keys.forEach((key) => {
        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => {
          remaining -= 1;

          if (remaining === 0) {
            resolve();
          }
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSnapshot(db: IDBDatabase, chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readwrite');
    const store = transaction.objectStore('snapshots');
    const request = store.delete(chatId);

    request.onsuccess = () => resolve();

    request.onerror = (event) => {
      if ((event.target as IDBRequest).error?.name === 'NotFoundError') {
        resolve();
      } else {
        reject(request.error);
      }
    };
  });
}
