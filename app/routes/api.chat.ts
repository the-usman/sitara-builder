import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream, formatDataStreamPart, generateId } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS, type FileMap } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { WORK_DIR } from '~/utils/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';
import { extractPropertiesFromMessage } from '~/lib/.server/llm/utils';
import { getAuthToken, verifyJwt } from '~/lib/auth.server';
import { readAppConfig } from '~/lib/config/app-config.server';
import { upsertProject, type ChatClient } from '~/lib/project-tracker.server';
import { computeCost } from '~/lib/.server/llm/model-pricing';
import { getLiveModelRate } from '~/lib/.server/llm/live-pricing.server';
import { hasLeakedToolCall, stripLeakedToolCall, TOOL_CALL_RETRY_PROMPT } from '~/utils/leaked-tool-call';
import { planStallRetry, STALL_LIMITS, STALL_MARKER } from '~/lib/.server/llm/stall-watchdog';

const MAX_TOOL_CALL_RETRIES = 2;

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

const logger = createScopedLogger('api.chat');

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, files, promptId, contextOptimization, supabase, chatId, chatDescription, selectedClient } =
    await request.json<{
      messages: Messages;
      files: any;
      promptId?: string;
      contextOptimization: boolean;
      chatId?: string;
      chatDescription?: string;
      selectedClient?: ChatClient;
      supabase?: {
        isConnected: boolean;
        hasSelectedProject: boolean;
        credentials?: {
          anonKey?: string;
          supabaseUrl?: string;
        };
      };
    }>();

  const cookieHeader = request.headers.get('Cookie');

  const env = (context as any).cloudflare?.env;
  const authUser = await verifyJwt(getAuthToken(request) || '', env);

  /*
   * LLM keys come from the super-admin-managed config only. The `apiKeys`
   * cookie is deliberately no longer read: it is client-writable, so honouring
   * it would let any operator swap in their own key and bypass the shared
   * configuration. Providers with no stored key still fall back to the server
   * environment variables resolved inside LLMManager.
   */
  const { apiKeys } = await readAppConfig(env);

  /*
   * Stable tracking ID: first user message ID is always present and consistent across all
   * messages in a conversation — safe fallback when clientChatId hasn't been set yet.
   */
  const firstUserMsgId = messages.filter((m) => m.role === 'user')[0]?.id;
  const trackingId = firstUserMsgId;
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(
    parseCookies(cookieHeader || '').providers || '{}',
  );

  const stream = new SwitchableStream();

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  let loadedSkills: string[] = [];
  let stallRetries = 0;

  // Everything the model has sent in this reply, across segments — see planStallRetry.
  let replyText = '';

  // True from aborting a stalled stream until the next stream sends something (see onError).
  let stallAbortPending = false;
  const encoder: TextEncoder = new TextEncoder();
  let progressCounter: number = 1;

  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length}, words`);

    let lastChunk: string | undefined = undefined;

    const dataStream = createDataStream({
      async execute(dataStream) {
        const filePaths = getFilePaths(files || {});
        let filteredFiles: FileMap | undefined = undefined;
        let summary: string | undefined = undefined;
        let messageSliceId = 0;

        if (messages.length > 3) {
          messageSliceId = messages.length - 3;
        }

        if (filePaths.length > 0 && contextOptimization) {
          logger.debug('Generating Chat Summary');
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Analysing Request',
          } satisfies ProgressAnnotation);

          // Create a summary of the chat
          console.log(`Messages count: ${messages.length}`);

          summary = await createSummary({
            messages: [...messages],
            env: context.cloudflare?.env,
            apiKeys,
            providerSettings,
            promptId,
            contextOptimization,
            onFinish(resp) {
              if (resp.usage) {
                logger.debug('createSummary token usage', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'complete',
            order: progressCounter++,
            message: 'Analysis Complete',
          } satisfies ProgressAnnotation);

          dataStream.writeMessageAnnotation({
            type: 'chatSummary',
            summary,
            chatId: messages.slice(-1)?.[0]?.id,
          } as ContextAnnotation);

          // Update context buffer
          logger.debug('Updating Context Buffer');
          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Determining Files to Read',
          } satisfies ProgressAnnotation);

          // Select context files
          console.log(`Messages count: ${messages.length}`);
          filteredFiles = await selectContext({
            messages: [...messages],
            env: context.cloudflare?.env,
            apiKeys,
            files,
            providerSettings,
            promptId,
            contextOptimization,
            summary,
            onFinish(resp) {
              if (resp.usage) {
                logger.debug('selectContext token usage', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });

          if (filteredFiles) {
            logger.debug(`files in context : ${JSON.stringify(Object.keys(filteredFiles))}`);
          }

          dataStream.writeMessageAnnotation({
            type: 'codeContext',
            files: Object.keys(filteredFiles).map((key) => {
              let path = key;

              if (path.startsWith(WORK_DIR)) {
                path = path.replace(WORK_DIR, '');
              }

              return path;
            }),
          } as ContextAnnotation);

          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'complete',
            order: progressCounter++,
            message: 'Code Files Selected',
          } satisfies ProgressAnnotation);

          // logger.debug('Code Files Selected');
        }

        let toolCallRetries = 0;

        const options: StreamingOptions = {
          supabaseConnection: supabase,
          toolChoice: 'none',
          onFinish: async ({ text: content, finishReason, usage }) => {
            logger.debug('usage', JSON.stringify(usage));

            if (usage) {
              cumulativeUsage.completionTokens += usage.completionTokens || 0;
              cumulativeUsage.promptTokens += usage.promptTokens || 0;
              cumulativeUsage.totalTokens += usage.totalTokens || 0;
            }

            /*
             * A tool-trained model sometimes writes its native tool-call tokens instead of the
             * <boltArtifact> XML (see utils/leaked-tool-call.ts) and the reply ends with nothing
             * built. Treat that like a cut-off reply and ask for the XML — at most twice.
             */
            const leakedToolCall =
              (finishReason === 'tool-calls' || hasLeakedToolCall(content)) && toolCallRetries < MAX_TOOL_CALL_RETRIES;

            if (finishReason !== 'length' && !leakedToolCall) {
              const lastUserMsg = messages.filter((x) => x.role === 'user').slice(-1)[0];
              const { model: usageModel, provider: usageProvider } = extractPropertiesFromMessage(lastUserMsg);

              /*
               * OpenRouter/Together expose live per-token pricing; first-party
               * providers don't, so this returns undefined and we use the static table.
               */
              const liveRate = await getLiveModelRate(
                usageProvider,
                usageModel,
                context.cloudflare?.env as unknown as Record<string, string>,
                apiKeys,
              );
              const cost = computeCost(
                usageProvider,
                usageModel,
                cumulativeUsage.promptTokens,
                cumulativeUsage.completionTokens,
                liveRate,
              );

              dataStream.writeMessageAnnotation({
                type: 'usage',
                value: {
                  completionTokens: cumulativeUsage.completionTokens,
                  promptTokens: cumulativeUsage.promptTokens,
                  totalTokens: cumulativeUsage.totalTokens,
                  promptCost: cost.promptCost,
                  completionCost: cost.completionCost,
                  totalCost: cost.totalCost,
                },
              });
              dataStream.writeMessageAnnotation({ type: 'skillsUsed', skills: loadedSkills } as any);
              dataStream.writeData({
                type: 'progress',
                label: 'response',
                status: 'complete',
                order: progressCounter++,
                message: 'Response Generated',
              } satisfies ProgressAnnotation);
              await new Promise((resolve) => setTimeout(resolve, 0));

              // Track every chat in MongoDB
              console.log(
                '[chat-tracker] onFinish hit — authUser:',
                authUser?.email,
                '| trackingId:',
                trackingId,
                '| selectedClient:',
                JSON.stringify(selectedClient),
              );

              if (!authUser) {
                console.error('[chat-tracker] SKIP: no authUser');
              } else if (!trackingId) {
                console.error('[chat-tracker] SKIP: no trackingId');
              } else if (!selectedClient) {
                console.error('[chat-tracker] SKIP: selectedClient is null/undefined');
              } else {
                /*
                 * MongoDB treats dots in dot-notation paths as nested keys, so a model
                 * name like "gpt-4.1" would scatter usage across bogus sub-documents.
                 */
                const modelKey = `${usageModel}:${usageProvider}`.replace(/\./g, '_');
                console.log(
                  `[chat-tracker] saving — trackingId: ${trackingId}, client: ${selectedClient.clientName}, model: ${modelKey}, cost: $${cost.totalCost.toFixed(4)}`,
                );

                /*
                 * IMPORTANT: await the write. This is a streaming response — once onFinish
                 * returns and the stream closes, the request context is torn down and any
                 * in-flight (un-awaited) DB write is cancelled before it commits, which is
                 * why rows never appeared. onFinish is async, so awaiting here is safe.
                 */
                try {
                  await upsertProject(
                    trackingId,
                    chatDescription || trackingId,
                    { userId: authUser.userId, email: authUser.email, name: authUser.name, role: authUser.role },
                    selectedClient,
                    modelKey,
                    {
                      model: usageModel,
                      provider: usageProvider,
                      promptTokens: cumulativeUsage.promptTokens,
                      completionTokens: cumulativeUsage.completionTokens,
                      totalTokens: cumulativeUsage.totalTokens,
                      promptCost: cost.promptCost,
                      completionCost: cost.completionCost,
                      cost: cost.totalCost,
                    },
                    chatId,
                    env,
                  );
                  console.log('[chat-tracker] upsert SUCCESS for', trackingId);
                } catch (err) {
                  console.error('[chat-tracker] upsert FAILED:', String(err));
                }
              }

              return;
            }

            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
              throw Error('Cannot continue message: Maximum segments reached');
            }

            const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

            if (leakedToolCall) {
              toolCallRetries++;
              logger.warn(
                `Model emitted a tool call instead of <boltArtifact>; asking it to continue (retry ${toolCallRetries})`,
              );
            } else {
              logger.info(
                `Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`,
              );
            }

            pushContinuation(
              leakedToolCall ? stripLeakedToolCall(content) : content,
              leakedToolCall ? TOOL_CALL_RETRY_PROMPT : CONTINUE_PROMPT,
            );
            await startSegment();

            return;
          },
        };

        /** Ends the history with the partial reply plus a follow-up instruction, for the next segment. */
        function pushContinuation(partialReply: string, instruction: string) {
          const lastUserMessage = messages.filter((x) => x.role == 'user').slice(-1)[0];
          const { model, provider } = extractPropertiesFromMessage(lastUserMessage);
          messages.push({ id: generateId(), role: 'assistant', content: partialReply });
          messages.push({
            id: generateId(),
            role: 'user',
            content: `[Model: ${model}]\n\n[Provider: ${provider}]\n\n${instruction}`,
          });
        }

        /*
         * One model call, streamed into the response. A watchdog aborts it when the provider goes
         * silent but keeps the connection open — otherwise the chat shows "Generating Response"
         * forever — and continues from the text received so far, like a cut-off reply.
         */
        async function startSegment() {
          const abort = new AbortController();
          let stalled = false;

          const result = await streamText({
            messages,
            env: context.cloudflare?.env,
            options: {
              ...options,
              abortSignal: abort.signal,
              onFinish: async (event) => {
                if (!stalled) {
                  await options.onFinish?.(event);
                }
              },
            },
            apiKeys,
            files,
            providerSettings,
            promptId,
            contextOptimization,
            contextFiles: filteredFiles,
            summary,
            messageSliceId,
            onSkillsLoaded: (skills) => {
              loadedSkills = skills;
            },
          });

          result.mergeIntoDataStream(dataStream);

          (async () => {
            let text = '';
            let timer: ReturnType<typeof setTimeout> | undefined;
            let closeHold: (() => void) | undefined;

            const arm = (ms: number) => {
              clearTimeout(timer);
              timer = setTimeout(() => {
                stalled = true;
                stallAbortPending = true;

                // Keeps the response open until the continuation is merged in (or we give up).
                dataStream.merge(
                  new ReadableStream({
                    start: (controller) => {
                      closeHold = () => controller.close();
                    },
                  }),
                );
                logger.warn(`Model sent nothing for ${ms / 1000}s — aborting the stalled stream`);
                abort.abort(new Error(STALL_MARKER));
              }, ms);
            };

            arm(STALL_LIMITS.firstOutputMs);

            try {
              for await (const part of result.fullStream) {
                stallAbortPending = stalled;

                if (part.type === 'error') {
                  if (!stalled) {
                    logger.error(`${part.error}`);
                    dataStream.writeData({ type: 'error', error: classifyProviderError(part.error) });
                  }

                  break;
                }

                if (part.type === 'text-delta') {
                  text += part.textDelta;
                  replyText += part.textDelta;
                }

                arm(STALL_LIMITS.silenceMs);
              }
            } catch (error) {
              if (!stalled) {
                logger.error('Model stream failed', error);
              }
            } finally {
              clearTimeout(timer);
            }

            if (!stalled) {
              return;
            }

            try {
              if (stallRetries >= STALL_LIMITS.maxRetries) {
                dataStream.writeData({
                  type: 'error',
                  error: {
                    code: 'model_stalled',
                    message: 'The AI model stopped responding. Send your message again or pick another model.',
                  },
                });

                return;
              }

              stallRetries++;

              // Inside a file/edit action: retry that action in full rather than resuming mid-file.
              const plan = planStallRetry(replyText, text, CONTINUE_PROMPT);
              logger.warn(
                `Retrying after a stalled stream (retry ${stallRetries}${plan.closeText ? ', redoing the interrupted action' : ''})`,
              );

              if (plan.closeText) {
                // Let the aborted stream's last buffered text reach the browser first.
                await new Promise((resolve) => setTimeout(resolve, 50));
                dataStream.merge(
                  new ReadableStream({
                    start: (controller) => {
                      controller.enqueue(formatDataStreamPart('text', plan.closeText));
                      controller.close();
                    },
                  }),
                );
                replyText += plan.closeText;
              }

              pushContinuation(plan.historyText, plan.instruction);
              await startSegment();
            } catch (error) {
              logger.error('Could not continue after a stalled stream', error);
            } finally {
              closeHold?.();
            }
          })();
        }

        dataStream.writeData({
          type: 'progress',
          label: 'response',
          status: 'in-progress',
          order: progressCounter++,
          message: 'Generating Response',
        } satisfies ProgressAnnotation);

        await startSegment();
      },

      // The abort of a stalled stream is expected: tag it so the transform below drops it.
      onError: (error: any) => (stallAbortPending ? STALL_MARKER : `Custom error: ${error.message}`),
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (typeof chunk === 'string' && chunk.startsWith('3:') && chunk.includes(STALL_MARKER)) {
            return;
          }

          if (!lastChunk) {
            lastChunk = ' ';
          }

          if (typeof chunk === 'string') {
            if (chunk.startsWith('g') && !lastChunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "<div class=\\"__boltThought__\\">"\n`));
            }

            if (lastChunk.startsWith('g') && !chunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "</div>\\n"\n`));
            }
          }

          lastChunk = chunk;

          let transformedChunk = chunk;

          if (typeof chunk === 'string' && chunk.startsWith('g')) {
            let content = chunk.split(':').slice(1).join(':');

            if (content.endsWith('\n')) {
              content = content.slice(0, content.length - 1);
            }

            transformedChunk = `0:${content}\n`;
          }

          // Convert the string stream to a byte stream
          const str = typeof transformedChunk === 'string' ? transformedChunk : JSON.stringify(transformedChunk);
          controller.enqueue(encoder.encode(str));
        },
      }),
    );

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    logger.error(error);

    const classified = classifyProviderError(error);

    if (classified.code === 'credits_exhausted') {
      throw new Response(classified.message, { status: 402, statusText: 'Payment Required' });
    }

    if (classified.code === 'invalid_api_key') {
      throw new Response(classified.message, { status: 401, statusText: 'Unauthorized' });
    }

    throw new Response(classified.message, { status: 500, statusText: 'Internal Server Error' });
  }
}

interface ProviderError {
  code: string;
  message: string;
  [key: string]: string;
}

function classifyProviderError(error: any): ProviderError {
  const msg: string = (error?.message ?? error?.toString() ?? '').toLowerCase();
  const status: number = error?.status ?? error?.statusCode ?? 0;

  if (
    msg.includes('credit') ||
    msg.includes('billing') ||
    msg.includes('insufficient_quota') ||
    msg.includes('exceeded your current quota') ||
    status === 402
  ) {
    return {
      code: 'credits_exhausted',
      message: 'You have run out of API credits. Please top up your account and try again.',
    };
  }

  if (msg.includes('api key') || msg.includes('api_key') || msg.includes('authentication') || status === 401) {
    return { code: 'invalid_api_key', message: 'Invalid or missing API key. Please check your settings.' };
  }

  if (msg.includes('rate limit') || msg.includes('rate_limit') || status === 429) {
    return { code: 'rate_limited', message: 'Rate limit reached. Please wait a moment and try again.' };
  }

  if (msg.includes('overloaded') || status === 529 || status === 503) {
    return { code: 'overloaded', message: 'The AI provider is currently overloaded. Please try again shortly.' };
  }

  return { code: 'unknown', message: error?.message ?? 'An unexpected error occurred. Please try again.' };
}
