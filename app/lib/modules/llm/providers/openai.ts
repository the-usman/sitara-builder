import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/*
 * Newer OpenAI models (o-series, gpt-5, …) reject `max_tokens` and require
 * `max_completion_tokens`. Our pinned @ai-sdk/openai only remaps that for o1/o3,
 * so rewrite the request body for every chat/completions call.
 */
function rewriteMaxTokensFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    if (init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>;

        if (body.max_tokens != null) {
          if (body.max_completion_tokens == null) {
            body.max_completion_tokens = body.max_tokens;
          }

          delete body.max_tokens;
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // leave the body unchanged if it isn't JSON
      }
    }

    return baseFetch(input, init);
  };
}

export default class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  getApiKeyLink = 'https://platform.openai.com/api-keys';

  config = {
    apiTokenKey: 'OPENAI_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-4', label: 'GPT-4', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI', maxTokenAllowed: 8000 },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://api.openai.com/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;
    const staticModelIds = this.staticModels.map((m) => m.name);

    const data = res.data.filter(
      (model: any) =>
        model.object === 'model' &&
        (model.id.startsWith('gpt-') || model.id.startsWith('o') || model.id.startsWith('chatgpt-')) &&
        !staticModelIds.includes(model.id),
    );

    return data.map((m: any) => ({
      name: m.id,
      label: `${m.id}`,
      provider: this.name,
      // Output cap for the request — context_window is the full context, not max output
      maxTokenAllowed: 32000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      apiKey,

      // 'strict' sends stream_options.include_usage so streaming responses report token usage
      compatibility: 'strict',
      fetch: rewriteMaxTokensFetch(),
    });

    return wrapOpenAIModel(openai(model));
  }
}

import { experimental_wrapLanguageModel as wrapLanguageModel, type LanguageModelV1 } from 'ai';

const MODELS_REJECTING_ZERO_TEMPERATURE: RegExp[] = [
  /^o1(?:-mini|-preview)?\b/,
  /^o3(?:-mini)?\b/,
  /^gpt-5\b/,
];

function rejectsZeroTemperature(modelId: string): boolean {
  const normalizedId = modelId.toLowerCase();
  return MODELS_REJECTING_ZERO_TEMPERATURE.some((pattern) => pattern.test(normalizedId));
}

function wrapOpenAIModel(model: LanguageModelV1): LanguageModelV1 {
  return wrapLanguageModel({
    model,
    middleware: {
      transformParams: async ({ params }) => {
        if (params.temperature === 0) {
          const { temperature: _temperature, ...rest } = params;
          return { ...rest, temperature: 1 };
        }
        return params;
      },
    },
  });
}
