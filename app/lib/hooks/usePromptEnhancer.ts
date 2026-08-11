import { useState } from 'react';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptEnhancement');

export interface EnhancerClient {
  _id: string;
  clientName: string;
  productName: string;
}

export function usePromptEnhancer() {
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [promptEnhanced, setPromptEnhanced] = useState(false);

  const resetEnhancer = () => {
    setEnhancingPrompt(false);
    setPromptEnhanced(false);
  };

  const enhancePrompt = async (
    input: string,
    setInput: (value: string) => void,
    model: string,
    provider: ProviderInfo,
    apiKeys?: Record<string, string>,
    chatContext?: {
      // Stable ID of the chat this refine belongs to — same value api.chat.ts uses to
      // attribute cost to a project (see project-tracker.server.ts). The caller is
      // responsible for pre-generating one even for a brand-new chat (whose first
      // message doesn't exist yet) so the refine's cost can still be tracked.
      trackingId?: string;
      hasExistingSite?: boolean;
      chatId?: string;
      selectedClient?: EnhancerClient | null;
    },
  ) => {
    setEnhancingPrompt(true);
    setPromptEnhanced(false);

    const requestBody: any = {
      message: input,
      model,
      provider,
      hasExistingSite: chatContext?.hasExistingSite ?? false,
      trackingId: chatContext?.trackingId,
      chatId: chatContext?.chatId,
      selectedClient: chatContext?.selectedClient ?? undefined,
    };

    if (apiKeys) {
      requestBody.apiKeys = apiKeys;
    }

    const response = await fetch('/api/enhancer', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const reader = response.body?.getReader();

    const originalInput = input;

    if (reader) {
      const decoder = new TextDecoder();

      let _input = '';
      let _error;

      try {
        setInput('');

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          _input += decoder.decode(value);

          logger.trace('Set input', _input);

          setInput(_input);
        }
      } catch (error) {
        _error = error;
        setInput(originalInput);
      } finally {
        if (_error) {
          logger.error(_error);
        }

        setEnhancingPrompt(false);
        setPromptEnhanced(true);

        setTimeout(() => {
          setInput(_input);
        });
      }
    }
  };

  return { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer };
}
