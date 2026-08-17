import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
  setMessages,
  duplicateChat,
  createChatFromMessages,
  getSnapshot,
  setSnapshot,
  getMessagesByTrackingId,
  type IChatMetadata,
} from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { cancelPendingPush, deriveTrackingId, pullChat, pushChat, schedulePush } from './chat-sync.client';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;

  /**
   * Set for chats listed from the server (`listRemoteChats`) that don't have a local
   * IndexedDB row yet — e.g. a chat created on another PC. Per-item actions that touch
   * the local DB (export/duplicate/rename/delete) can't operate on these until the chat
   * has actually been opened once, which pulls it into IndexedDB.
   */
  isRemote?: boolean;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);
export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  /*
   * True for the rest of this load when the chat was pulled from the server rather than
   * found in this browser's own IndexedDB (e.g. opened on a different device). Restore
   * itself is NOT deferred on this — the file snapshot still gets applied immediately
   * and automatically, same as a normal reopen, because deferring the injection of the
   * "Restored Project & Setup" message into a later setMessages() call broke the
   * streaming/artifact parser (it hung on "Creating initial files" with an empty file
   * tree). This flag is purely a display cue so Chat.client.tsx can show a "Decode to
   * see this website" confirmation before revealing the already-restored workbench.
   */
  const [justPulledFromServer, setJustPulledFromServer] = useState(false);

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        const error = new Error('Chat persistence is unavailable');
        logStore.logError('Chat persistence initialization failed', error);
        toast.error('Chat persistence is unavailable');
      }

      return;
    }

    if (mixedId) {
      Promise.all([
        getMessages(db, mixedId),
        getSnapshot(db, mixedId), // Fetch snapshot from DB
      ])
        .then(async ([localMessages, localSnapshot]) => {
          let storedMessages = localMessages;
          let snapshot = localSnapshot;

          /*
           * `getMessages` only matches on id and urlId. The projects list links by tracking
           * ID (the first user message ID), so resolve that against local chats before
           * assuming the chat is missing — otherwise a chat sitting in this very browser
           * looks unopenable.
           */
          if (!storedMessages || storedMessages.messages.length === 0) {
            const localByTracking = await getMessagesByTrackingId(db, mixedId);

            if (localByTracking) {
              storedMessages = localByTracking;
              snapshot = await getSnapshot(db, localByTracking.id);
            }
          }

          /*
           * Still nothing local: this is most likely a different device than the one the chat
           * was built on. Pull the server copy and write it into IndexedDB so every later load
           * — and the rest of this function — can treat it as an ordinary local chat.
           */
          let isRemotePull = false;

          if (!storedMessages || storedMessages.messages.length === 0) {
            const remote = await pullChat(mixedId);

            if (remote) {
              isRemotePull = true;
              /*
               * Always key the local cache by trackingId, never urlId. urlId is a
               * display/routing convenience minted independently per browser (e.g. the
               * "imported-files-N" fallback name), so it is NOT unique across accounts —
               * two different chats pulled from different devices can share one, which
               * previously either overwrote the wrong local chat or threw "Unable to add
               * key to index 'urlId'" against the unique index. trackingId (the first
               * user message's id) is the value actually guaranteed unique.
               */
              const localId = remote.trackingId;

              await setMessages(
                db,
                localId,
                remote.messages,
                remote.urlId,
                remote.description,
                undefined,
                remote.metadata,
              );

              if (remote.snapshot) {
                await setSnapshot(db, localId, remote.snapshot);
              }

              storedMessages = {
                id: localId,
                urlId: remote.urlId,
                description: remote.description,
                messages: remote.messages,
                timestamp: remote.updatedAt,
                metadata: remote.metadata,
              };
              snapshot = remote.snapshot;
            }
          }

          if (storedMessages && storedMessages.messages.length > 0) {
            /*
             * const snapshotStr = localStorage.getItem(`snapshot:${mixedId}`); // Remove localStorage usage
             * const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} }; // Use snapshot from DB
             */
            const validSnapshot = snapshot || { chatIndex: '', files: {} }; // Ensure snapshot is not undefined
            const summary = validSnapshot.summary;

            const rewindId = searchParams.get('rewindTo');
            let startingIdx = -1;
            const endingIdx = rewindId
              ? storedMessages.messages.findIndex((m) => m.id === rewindId) + 1
              : storedMessages.messages.length;
            const snapshotIndex = storedMessages.messages.findIndex((m) => m.id === validSnapshot.chatIndex);

            if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
              startingIdx = snapshotIndex;
            }

            if (snapshotIndex > 0 && storedMessages.messages[snapshotIndex].id == rewindId) {
              startingIdx = -1;
            }

            let filteredMessages = storedMessages.messages.slice(startingIdx + 1, endingIdx);
            let archivedMessages: Message[] = [];

            if (startingIdx >= 0) {
              archivedMessages = storedMessages.messages.slice(0, startingIdx + 1);
            }

            setArchivedMessages(archivedMessages);

            if (startingIdx > 0) {
              const files = Object.entries(validSnapshot?.files || {})
                .map(([key, value]) => {
                  if (value?.type !== 'file') {
                    return null;
                  }

                  return {
                    content: value.content,
                    path: key,
                  };
                })
                .filter((x): x is { content: string; path: string } => !!x); // Type assertion
              const projectCommands = await detectProjectCommands(files);

              // Call the modified function to get only the command actions string
              const commandActionsString = createCommandActionsString(projectCommands);

              const restoreMessages: Message[] = [
                {
                  id: generateId(),
                  role: 'user',
                  content: `Restore project from snapshot`, // Removed newline
                  annotations: ['no-store', 'hidden'],
                },
                {
                  id: storedMessages.messages[snapshotIndex].id,
                  role: 'assistant',

                  // Combine followup message and the artifact with files and command actions
                  content: `Bolt Restored your chat from a snapshot. You can revert this message to load the full chat history.
                  <boltArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
                  ${Object.entries(snapshot?.files || {})
                    .map(([key, value]) => {
                      if (value?.type === 'file') {
                        return `
                      <boltAction type="file" filePath="${key}">
${value.content}
                      </boltAction>
                      `;
                      } else {
                        return ``;
                      }
                    })
                    .join('\n')}
                  ${commandActionsString}
                  </boltArtifact>
                  `, // Added commandActionsString, followupMessage, updated id and title
                  annotations: [
                    'no-store',
                    ...(summary
                      ? [
                          {
                            chatId: storedMessages.messages[snapshotIndex].id,
                            type: 'chatSummary',
                            summary,
                          } satisfies ContextAnnotation,
                        ]
                      : []),
                  ],
                },
              ];

              filteredMessages = [...restoreMessages, ...filteredMessages];
              restoreSnapshot(mixedId);

              if (isRemotePull) {
                setJustPulledFromServer(true);
              }
            }

            setInitialMessages(filteredMessages);

            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
            chatMetadata.set(storedMessages.metadata);
          } else {
            /*
             * No chat matched this id — surface it instead of silently bouncing to "/",
             * which reads as the app randomly navigating away on its own.
             */
            logStore.logError('Chat not found', new Error(`No chat stored for id "${mixedId}"`));
            toast.error(`Chat "${mixedId}" was not found on this device or in your synced history`);
            navigate('/', { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          console.error(error);

          logStore.logError('Failed to load chat messages or snapshot', error); // Updated error message
          toast.error('Failed to load chat: ' + error.message); // More specific error
        });
    } else {
      // Handle case where there is no mixedId (e.g., new chat)
      setReady(true);
    }
  }, [mixedId, db, navigate, searchParams]); // Added db, navigate, searchParams dependencies

  const takeSnapshot = useCallback(
    async (
      chatIdx: string,
      files: FileMap,
      _chatId?: string | undefined,
      chatSummary?: string,
    ): Promise<Snapshot | undefined> => {
      const id = _chatId || chatId.get();

      if (!id || !db) {
        return undefined;
      }

      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };

      // localStorage.setItem(`snapshot:${id}`, JSON.stringify(snapshot)); // Remove localStorage usage
      try {
        await setSnapshot(db, id, snapshot);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');

        return undefined;
      }

      // Handed back so the caller can ship it to the server alongside the messages.
      return snapshot;
    },
    [db],
  );

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    // const snapshotStr = localStorage.getItem(`snapshot:${id}`); // Remove localStorage usage
    const container = await webcontainer;

    const validSnapshot = snapshot || { chatIndex: '', files: {} };

    if (!validSnapshot?.files) {
      return;
    }

    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      } else {
      }
    });

    // workbenchStore.files.setKey(snapshot?.files)
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    justPulledFromServer,
    dismissDecodePrompt: () => setJustPulledFromServer(false),
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!db || !id) {
        return;
      }

      try {
        await setMessages(db, id, initialMessages, urlId, description.get(), undefined, metadata);
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[], options?: { immediate?: boolean }) => {
      if (!db || messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      let _urlId = urlId;

      if (!urlId && firstArtifact?.id) {
        const urlId = await getUrlId(db, firstArtifact.id);
        _urlId = urlId;
        navigateChat(urlId);
        setUrlId(urlId);
      }

      let chatSummary: string | undefined = undefined;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
          chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
        }
      }

      const snapshot = await takeSnapshot(
        messages[messages.length - 1].id,
        workbenchStore.files.get(),
        _urlId,
        chatSummary,
      );

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      // Ensure chatId.get() is used here as well
      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId(db);

        chatId.set(nextId);

        if (!urlId) {
          navigateChat(nextId);
        }
      }

      // Ensure chatId.get() is used for the final setMessages call
      const finalChatId = chatId.get();

      if (!finalChatId) {
        console.error('Cannot save messages, chat ID is not set.');
        toast.error('Failed to save chat messages: Chat ID missing.');

        return;
      }

      const allMessages = [...archivedMessages, ...messages];

      await setMessages(
        db,
        finalChatId, // Use the potentially updated chatId
        allMessages,
        urlId,
        description.get(),
        undefined,
        chatMetadata.get(),
      );

      /*
       * Mirror to the server so this chat is reachable from other devices. Keyed on the
       * first user message ID, which is stable across devices — unlike finalChatId, which
       * is an IndexedDB sequence and collides between browsers. Debounced and fire-and-
       * forget: the local write above already succeeded and must not depend on the network.
       */
      const trackingId = deriveTrackingId(allMessages);

      if (trackingId) {
        const pushArgs = {
          trackingId,
          urlId: _urlId ?? urlId,
          description: description.get(),
          messages: allMessages,
          metadata: chatMetadata.get(),
          snapshot,
        };

        if (options?.immediate) {
          /*
           * A response just finished — push the file snapshot now instead of waiting
           * out the debounce, so the server copy never trails a completed turn.
           */
          cancelPendingPush(trackingId);
          void pushChat(pushArgs);
        } else {
          schedulePush(pushArgs);
        }
      }
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!db || (!mixedId && !listItemId)) {
        return;
      }

      try {
        const newId = await duplicateChat(db, mixedId || listItemId);
        navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      if (!db) {
        return;
      }

      try {
        const newId = await createChatFromMessages(db, description, messages, metadata);
        window.location.href = `/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!db || !id) {
        return;
      }

      const chat = await getMessages(db, id);
      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
