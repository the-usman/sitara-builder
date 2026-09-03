import { createOpenAI } from '@ai-sdk/openai';
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

const DEFAULT_BASE_URL = 'https://api.thorbase.com/v1';

/*
 * TokenGo's upstream models "think" by default, and their chain-of-thought can eat
 * the whole completion-token budget before any answer streams — leaving the UI stuck
 * on the "continue" loop. Every model accepts an OpenAI-style `thinking` flag:
 *
 *   - GLM 5.3 / GLM 5.3 Flash CANNOT disable thinking (the API 400s), so we keep it
 *     enabled but pin `reasoning_effort` low so the reasoning stays short.
 *   - Every other model: disable thinking outright.
 *
 * The AI SDK has no first-class field for either, so we splice them into the request
 * body with a wrapping fetch. Override the effort with TOKENGO_REASONING_EFFORT.
 */
const MANDATORY_THINKING = /glm-5\.3/i;

function createTokenGoFetch(reasoningEffort: string): typeof fetch {
  return async (input: any, init: any) => {
    if (init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);

        if (body && Array.isArray(body.messages)) {
          const alwaysThinks = MANDATORY_THINKING.test(String(body.model || ''));

          if (body.thinking === undefined) {
            body.thinking = { type: alwaysThinks ? 'enabled' : 'disabled' };
          }

          if (alwaysThinks && body.reasoning_effort === undefined) {
            body.reasoning_effort = reasoningEffort;
          }

          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // body isn't JSON we can safely amend — send it through untouched
      }
    }

    return fetch(input, init);
  };
}

export default class TokenGoProvider extends BaseProvider {
  name = 'TokenGo';
  getApiKeyLink = 'https://tokengo.com/console/api-keys';

  config = {
    baseUrlKey: 'TOKENGO_API_BASE_URL',
    apiTokenKey: 'TOKENGO_API_KEY',
  };

  /*
   * TokenGo (tokengo.com) is an OpenAI-compatible gateway. Every model is pulled
   * live from the /models endpoint, so there are no hard-coded models here.
   */
  staticModels: ModelInfo[] = [];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    const { baseUrl: fetchBaseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: 'TOKENGO_API_BASE_URL',
      defaultApiTokenKey: 'TOKENGO_API_KEY',
    });
    const baseUrl = fetchBaseUrl || DEFAULT_BASE_URL;

    if (!baseUrl || !apiKey) {
      return [];
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`TokenGo /models request failed: ${response.status} ${response.statusText}`);
    }

    const res = (await response.json()) as any;

    // OpenAI-style responses wrap the list in `data`; some gateways return a bare array.
    const data: any[] = Array.isArray(res) ? res : res?.data || res?.models || [];

    return data
      .filter((m: any) => {
        const id = m?.id ?? m?.name;

        if (!id) {
          return false;
        }

        // Keep chat/text models; drop embeddings, rerank, image, audio, etc.
        const type = (m.type || m.mode || m.object || '').toString().toLowerCase();

        return !/embed|rerank|image|audio|speech|tts|whisper|moderation/.test(`${type} ${id}`.toLowerCase());
      })
      .map((m: any) => {
        const id: string = m.id ?? m.name;

        // ids are vendor-namespaced (e.g. "z-ai/glm-5.2") — show the readable tail in the picker
        const label = m.display_name || m.name || (id.includes('/') ? id.split('/').pop() : id);

        /*
         * `maxTokenAllowed` is the request's max *output* tokens (see stream-text.ts), not the
         * context window. GLM 5.3 / 5.3 Flash still spend some of this on forced reasoning, so
         * keep a little more headroom than the 8000 default.
         */
        return {
          name: id,
          label: `${label} (TokenGo)`,
          provider: this.name,
          maxTokenAllowed: 16000,
        };
      });
  }

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
      defaultBaseUrlKey: 'TOKENGO_API_BASE_URL',
      defaultApiTokenKey: 'TOKENGO_API_KEY',
    });

    const finalBaseUrl = baseUrl || DEFAULT_BASE_URL;

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const reasoningEffort =
      (serverEnv as any)?.TOKENGO_REASONING_EFFORT ||
      (typeof process !== 'undefined' ? process.env?.TOKENGO_REASONING_EFFORT : undefined) ||
      'low';

    const openai = createOpenAI({
      baseURL: finalBaseUrl,
      apiKey,
      fetch: createTokenGoFetch(reasoningEffort),
    });

    return openai(model);
  }
}
