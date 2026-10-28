import { createOpenAI } from '@ai-sdk/openai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

type ChatCompletionChunk = {
  id?: string;
  created?: number;
  model?: string;
  usage?: unknown;
  choices?: {
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      tool_calls?: { index: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }[];
    };
    finish_reason?: string | null;
  }[];
};

/**
 * 9Router sometimes answers a non-streaming request (`stream` unset) with an SSE stream anyway, which
 * the AI SDK can't parse ("Invalid JSON response"). Small requests come back as JSON; larger ones, like
 * this app's, come back streamed. In that case, fold the chunks back into a single chat.completion.
 */
const nineRouterFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);

  let wantsStream = false;

  try {
    wantsStream = typeof init?.body === 'string' && JSON.parse(init.body).stream === true;
  } catch {
    // Not a JSON body (e.g. GET /models): leave the response alone.
  }

  if (wantsStream || !response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
    return response;
  }

  const text = await response.text();
  const toolCalls: { id?: string; type: string; function: { name: string; arguments: string } }[] = [];
  let content = '';
  let reasoning = '';
  let finishReason: string | null = null;
  let usage: unknown;
  let meta: Pick<ChatCompletionChunk, 'id' | 'created' | 'model'> = {};

  for (const line of text.split('\n')) {
    const data = line.startsWith('data:') ? line.slice(5).trim() : '';

    if (!data || data === '[DONE]') {
      continue;
    }

    let chunk: ChatCompletionChunk;

    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }

    meta = { id: chunk.id ?? meta.id, created: chunk.created ?? meta.created, model: chunk.model ?? meta.model };
    usage = chunk.usage ?? usage;

    for (const choice of chunk.choices ?? []) {
      content += choice.delta?.content ?? '';
      reasoning += choice.delta?.reasoning_content ?? '';
      finishReason = choice.finish_reason ?? finishReason;

      for (const call of choice.delta?.tool_calls ?? []) {
        const existing = (toolCalls[call.index] ??= { type: 'function', function: { name: '', arguments: '' } });
        existing.id = call.id ?? existing.id;
        existing.function.name += call.function?.name ?? '';
        existing.function.arguments += call.function?.arguments ?? '';
      }
    }
  }

  const completion = {
    ...meta,
    object: 'chat.completion',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
          ...(reasoning ? { reasoning_content: reasoning } : {}),
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls.filter(Boolean) } : {}),
        },
        finish_reason: finishReason ?? 'stop',
      },
    ],
    ...(usage ? { usage } : {}),
  };

  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json');
  headers.delete('content-length');
  headers.delete('content-encoding');

  return new Response(JSON.stringify(completion), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default class NineRouterProvider extends BaseProvider {
  name = '9Router';

  /*
   * 9Router is an OpenAI-compatible gateway. Both its URL and key come from the environment
   * (NINE_ROUTER_API_BASE_URL / NINE_ROUTER_API_KEY) or from Settings → Providers.
   */
  config = {
    baseUrlKey: 'NINE_ROUTER_API_BASE_URL',
    apiTokenKey: 'NINE_ROUTER_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'cc/claude-opus-5-5', label: 'Claude Opus 5.5 (9Router)', provider: '9Router', maxTokenAllowed: 32000 },
    { name: 'cc/claude-opus-5', label: 'Claude Opus 5 (9Router)', provider: '9Router', maxTokenAllowed: 32000 },
    { name: 'cc/claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (9Router)', provider: '9Router', maxTokenAllowed: 32000 },
    { name: 'cc/claude-sonnet-5', label: 'Claude Sonnet 5 (9Router)', provider: '9Router', maxTokenAllowed: 32000 },
    { name: 'cc/claude-haiku-5-5', label: 'Claude Haiku 5.5 (9Router)', provider: '9Router', maxTokenAllowed: 32000 },
  ];

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'NINE_ROUTER_API_BASE_URL',
      defaultApiTokenKey: 'NINE_ROUTER_API_KEY',
    });

    if (!baseUrl) {
      throw new Error(`Missing base URL for ${this.name} provider (set NINE_ROUTER_API_BASE_URL)`);
    }

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider (set NINE_ROUTER_API_KEY)`);
    }

    const openai = createOpenAI({ baseURL: baseUrl, apiKey, fetch: nineRouterFetch });

    return openai(model);
  }
}
