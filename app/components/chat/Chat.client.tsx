/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import { generateId, type Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts } from '~/lib/hooks';
import { description as descriptionAtom, useChatHistory, chatId } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import { DecodeWebsiteDialog } from './DecodeWebsiteDialog';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { supabaseConnection } from '~/lib/stores/supabase';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const {
    ready,
    initialMessages,
    storeMessageHistory,
    importChat,
    exportChat,
    justPulledFromServer,
    dismissDecodePrompt,
  } = useChatHistory();
  const title = useStore(descriptionAtom);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
          justPulledFromServer={justPulledFromServer}
          dismissDecodePrompt={dismissDecodePrompt}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[], options?: { immediate?: boolean }) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[], options?: { immediate?: boolean }) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
  justPulledFromServer: boolean;
  dismissDecodePrompt: () => void;
}

export const ChatImpl = memo(
  ({
    description,
    initialMessages,
    storeMessageHistory,
    importChat,
    exportChat,
    justPulledFromServer,
    dismissDecodePrompt,
  }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const currentChatId = useStore(chatId); // reactive — updates when IndexedDB ID is assigned
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [fakeLoading, setFakeLoading] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [chatNameInput, setChatNameInput] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);
    const [clients, setClients] = useState<{ _id: string; clientName: string; productName: string }[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientsLoading, setClientsLoading] = useState(false);
    // Ref stores the confirmed client synchronously — React state batching makes useChat body stale
    const selectedClientRef = useRef<{ _id: string; clientName: string; productName: string } | null>(null);
    // Pre-generated ID for a brand-new chat's first user message — created the moment it's first
    // needed (e.g. an enhance click before any message exists) and reused as that message's real
    // `id` when it's actually sent, so cost tracking (trackingId) is consistent from the start.
    const pendingMessageIdRef = useRef<string | null>(null);
    // Guard: prevents modal re-triggering when description prop hasn't re-rendered yet
    const chatConfiguredRef = useRef(false);
    const files = useStore(workbenchStore.files);
    const actionAlert = useStore(workbenchStore.alert);
    const deployAlert = useStore(workbenchStore.deployAlert);
    const supabaseConn = useStore(supabaseConnection); // Add this line to get Supabase connection
    const selectedProject = supabaseConn.stats?.projects?.find(
      (project) => project.id === supabaseConn.selectedProjectId,
    );
    const supabaseAlert = useStore(workbenchStore.supabaseAlert);
    const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled } = useSettings();

    const [model, setModel] = useState(() => {
      const savedModel = Cookies.get('selectedModel');
      return savedModel || DEFAULT_MODEL;
    });
    const [provider, setProvider] = useState(() => {
      const savedProvider = Cookies.get('selectedProvider');
      return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
    });

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
      error,
      data: chatData,
      setData,
    } = useChat({
      api: '/api/chat',
      body: {
        apiKeys,
        files,
        promptId,
        contextOptimization: contextOptimizationEnabled,
        chatId: currentChatId,
        chatDescription: description,
        selectedClient: clients.find((c) => c._id === selectedClientId) ?? null,
        supabase: {
          isConnected: supabaseConn.isConnected,
          hasSelectedProject: !!selectedProject,
          credentials: {
            supabaseUrl: supabaseConn?.credentials?.supabaseUrl,
            anonKey: supabaseConn?.credentials?.anonKey,
          },
        },
      },
      sendExtraMessageFields: true,
      onError: (e) => {
        logger.error('Request failed\n\n', e, error);
        logStore.logError('Chat request failed', e, {
          component: 'Chat',
          action: 'request',
          error: e.message,
        });

        const msg = e.message ?? '';
        const status = (e as any).status ?? 0;

        if (status === 402 || msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('quota')) {
          toast.error('You have run out of API credits. Please top up your account and try again.', {
            autoClose: false,
          });
        } else if (status === 401 || msg.toLowerCase().includes('api key')) {
          toast.error('Invalid or missing API key. Please check your settings.', { autoClose: false });
        } else if (status === 429 || msg.toLowerCase().includes('rate limit')) {
          toast.warning('Rate limit reached. Please wait a moment and try again.');
        } else if (status === 529 || status === 503 || msg.toLowerCase().includes('overloaded')) {
          toast.warning('The AI provider is currently overloaded. Please try again shortly.');
        } else {
          toast.error('There was an error processing your request: ' + (msg || 'No details were returned'));
        }
      },
      onFinish: (message, response) => {
        const usage = response.usage;
        setData(undefined);

        if (usage) {
          console.log('Token usage:', usage);
          logStore.logProvider('Chat response completed', {
            component: 'Chat',
            action: 'response',
            model,
            provider: provider.name,
            usage,
            messageLength: message.content.length,
          });
        }

        logger.debug('Finished streaming');
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });
    useEffect(() => {
      if (!chatData) return;

      for (const item of chatData as any[]) {
        if (item?.type === 'error' && item?.error) {
          const { code, message } = item.error as { code: string; message: string };

          if (code === 'credits_exhausted') {
            toast.error(message, { autoClose: false, toastId: 'credits_exhausted' });
          } else if (code === 'invalid_api_key') {
            toast.error(message, { autoClose: false, toastId: 'invalid_api_key' });
          } else if (code === 'rate_limited') {
            toast.warning(message, { toastId: 'rate_limited' });
          } else if (code === 'overloaded') {
            toast.warning(message, { toastId: 'overloaded' });
          } else {
            toast.error(message || 'An unexpected error occurred.');
          }
        }
      }
    }, [chatData]);

    useEffect(() => {
      const prompt = searchParams.get('prompt');

      // console.log(prompt, searchParams, model, provider);

      if (prompt) {
        setSearchParams({});
        runAnimation();
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}`,
            },
          ] as any, // Type assertion to bypass compiler check
        });
      }
    }, [model, provider, searchParams]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    const wasLoadingRef = useRef(false);

    useEffect(() => {
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });

      /*
       * Response just finished streaming: push the file snapshot now rather than
       * leaving it to the sampler's debounce, so the server copy is never stale.
       */
      if (wasLoadingRef.current && !isLoading && messages.length > initialMessages.length) {
        storeMessageHistory(messages, { immediate: true }).catch((error) => toast.error(error.message));
      }

      wasLoadingRef.current = isLoading;
    }, [messages, isLoading, parseMessages]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();

      logStore.logProvider('Chat response aborted', {
        component: 'Chat',
        action: 'abort',
        model,
        provider: provider.name,
      });
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      await Promise.all([
        animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
        animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
      ]);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      const messageContent = messageInput || input;

      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      // On a brand-new chat, require client selection + name before proceeding
      if (!chatStarted && !description && !chatConfiguredRef.current) {
        setPendingMessage(messageContent);
        setChatNameInput('');
        setSelectedClientId('');
        setShowNameModal(true);
        setClientsLoading(true);
        fetch('/api/clients')
          .then((r) => r.json())
          .then((data: any) => setClients(data.clients || []))
          .catch(() => setClients([]))
          .finally(() => setClientsLoading(false));
        return;
      }

      // If no locked items, proceed normally with the original message
      const finalMessageContent = messageContent;

      const imageFilesNote =
        uploadedFiles.length > 0
          ? `\n\n[Uploaded files have been automatically saved to the project's public/ folder: ${uploadedFiles.map((f) => `public/${f.name}`).join(', ')}. Reference them in your code using these paths — images via <img>, videos via <video>.]`
          : '';

      runAnimation();

      if (!chatStarted) {
        setFakeLoading(true);

        if (autoSelectTemplate) {
          const { template, title } = await selectStarterTemplate({
            message: finalMessageContent,
            model,
            provider,
          });

          if (template !== 'blank') {
            const temResp = await getTemplates(template, title).catch((e) => {
              if (e.message.includes('rate limit')) {
                toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
              } else {
                toast.warning('Failed to import starter template\n Continuing with blank template');
              }

              return null;
            });

            if (temResp) {
              const { assistantMessage, userMessage } = temResp;
              setMessages([
                {
                  // Reuse the pending ID if the enhancer already generated one, so tracked cost
                  // (see project-tracker.server.ts) lands on the same record as this message.
                  id: pendingMessageIdRef.current ?? generateId(),
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}${imageFilesNote}`,
                    },
                    ...imageDataList.filter(Boolean).map((imageData) => ({
                      type: 'image',
                      image: imageData,
                    })),
                  ] as any,
                },
                {
                  id: `2-${new Date().getTime()}`,
                  role: 'assistant',
                  content: assistantMessage,
                },
                {
                  id: `3-${new Date().getTime()}`,
                  role: 'user',
                  content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userMessage}`,
                  annotations: ['hidden'],
                },
              ]);
              reload({ body: { selectedClient: selectedClientRef.current } });
              pendingMessageIdRef.current = null;
              setInput('');
              Cookies.remove(PROMPT_COOKIE_KEY);

              setUploadedFiles([]);
              setImageDataList([]);

              resetEnhancer();

              textareaRef.current?.blur();
              setFakeLoading(false);

              return;
            }
          }
        }

        // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
        append(
          {
            // Reuse the pending ID if the enhancer already generated one, so tracked cost
            // (see project-tracker.server.ts) lands on the same record as this message.
            id: pendingMessageIdRef.current ?? generateId(),
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}${imageFilesNote}`,
              },
              ...imageDataList.filter(Boolean).map((imageData) => ({
                type: 'image',
                image: imageData,
              })),
            ] as any,
          },
          { body: { selectedClient: selectedClientRef.current } },
        );
        pendingMessageIdRef.current = null;
        setFakeLoading(false);
        setInput('');
        Cookies.remove(PROMPT_COOKIE_KEY);

        setUploadedFiles([]);
        setImageDataList([]);

        resetEnhancer();

        textareaRef.current?.blur();

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        append(
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userUpdateArtifact}${finalMessageContent}${imageFilesNote}`,
              },
              ...imageDataList.filter(Boolean).map((imageData) => ({
                type: 'image',
                image: imageData,
              })),
            ] as any,
          },
          { body: { selectedClient: selectedClientRef.current } },
        );

        workbenchStore.resetAllFileModifications();
      } else {
        append(
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}${imageFilesNote}`,
              },
              ...imageDataList.filter(Boolean).map((imageData) => ({
                type: 'image',
                image: imageData,
              })),
            ] as any,
          },
          { body: { selectedClient: selectedClientRef.current } },
        );
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();
    };

    /**
     * Handles the change event for the textarea and updates the input state.
     * @param event - The change event from the textarea.
     */
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(event);
    };

    /**
     * Debounced function to cache the prompt in cookies.
     * Caches the trimmed value of the textarea input after a delay to optimize performance.
     */
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');

      if (storedApiKeys) {
        setApiKeys(JSON.parse(storedApiKeys));
      }
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    const confirmChatName = () => {
      const name = chatNameInput.trim();

      if (!name || !selectedClientId) {
        return;
      }

      // Set refs synchronously — useChat body ref is stale until next render
      selectedClientRef.current = clients.find((c) => c._id === selectedClientId) ?? null;
      chatConfiguredRef.current = true;

      descriptionAtom.set(name);
      setShowNameModal(false);

      if (pendingMessage !== null) {
        const msg = pendingMessage;
        setPendingMessage(null);
        sendMessage({ nativeEvent: {} } as any, msg);
      }
    };

    return (
      <>
        {/* New chat modal — client selection + name, required before first message */}
        {showNameModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#111118] border border-white/[0.1] rounded-2xl p-7 w-full max-w-md shadow-2xl mx-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
                  <div className="i-ph:chat-circle-text text-white text-lg" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white leading-tight">New Chat</h2>
                  <p className="text-xs text-gray-500">Select a client and name this chat to continue</p>
                </div>
              </div>

              {/* Client dropdown */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Client</label>
                {clientsLoading ? (
                  <div className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-gray-500 text-sm">
                    Loading clients…
                  </div>
                ) : (
                  <select
                    autoFocus
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors appearance-none cursor-pointer"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="" disabled className="bg-[#111118] text-gray-400">
                      — Select a client —
                    </option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id} className="bg-[#111118] text-white">
                        {c.clientName} — {c.productName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Chat name */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Chat name</label>
                <input
                  type="text"
                  value={chatNameInput}
                  onChange={(e) => setChatNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmChatName();
                    if (e.key === 'Escape') setShowNameModal(false);
                  }}
                  placeholder="e.g. Landing page redesign"
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNameModal(false);
                    setPendingMessage(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmChatName}
                  disabled={!selectedClientId || !chatNameInput.trim()}
                  className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all"
                >
                  Start Building
                </button>
              </div>
            </div>
          </div>
        )}
        <DecodeWebsiteDialog
          open={justPulledFromServer}
          onDecode={dismissDecodePrompt}
          onDismiss={dismissDecodePrompt}
        />
        <BaseChat
          ref={animationScope}
          textareaRef={textareaRef}
          input={input}
          showChat={showChat}
          chatStarted={chatStarted}
          isStreaming={isLoading || fakeLoading}
          onStreamingChange={(streaming) => {
            streamingState.set(streaming);
          }}
          enhancingPrompt={enhancingPrompt}
          promptEnhanced={promptEnhanced}
          sendMessage={sendMessage}
          model={model}
          setModel={handleModelChange}
          provider={provider}
          setProvider={handleProviderChange}
          providerList={activeProviders}
          handleInputChange={(e) => {
            onTextareaChange(e);
            debouncedCachePrompt(e);
          }}
          handleStop={abort}
          description={description}
          importChat={importChat}
          exportChat={exportChat}
          messages={messages.map((message, i) => {
            if (message.role === 'user') {
              return message;
            }

            return {
              ...message,
              content: parsedMessages[i] || '',
            };
          })}
          enhancePrompt={() => {
            const existingTrackingId = messages.find((m) => m.role === 'user')?.id;

            // No message sent yet in this chat — reuse (or create) the pending ID so the
            // refine's cost lands on the same trackingId the first message will get.
            if (!existingTrackingId && !pendingMessageIdRef.current) {
              pendingMessageIdRef.current = generateId();
            }

            enhancePrompt(
              input,
              (input) => {
                setInput(input);
                scrollTextArea();
              },
              model,
              provider,
              apiKeys,
              {
                trackingId: existingTrackingId ?? pendingMessageIdRef.current ?? undefined,
                hasExistingSite: messages.length > 0,
                chatId: currentChatId,
                selectedClient: selectedClientRef.current,
              },
            );
          }}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          imageDataList={imageDataList}
          setImageDataList={setImageDataList}
          actionAlert={actionAlert}
          clearAlert={() => workbenchStore.clearAlert()}
          supabaseAlert={supabaseAlert}
          clearSupabaseAlert={() => workbenchStore.clearSupabaseAlert()}
          deployAlert={deployAlert}
          clearDeployAlert={() => workbenchStore.clearDeployAlert()}
          data={chatData}
        />
      </>
    );
  },
);
