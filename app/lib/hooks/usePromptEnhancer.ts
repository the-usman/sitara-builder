import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptEnhancement');

/*
 * Some models (reasoning models especially) wrap their answer in a markdown code
 * fence or emit a <think>…</think> block despite the system prompt telling them
 * not to. Strip both so only the refined prompt lands in the textarea.
 */
function cleanEnhancedPrompt(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const fence = out.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);

  if (fence) {
    out = fence[1].trim();
  }

  return out;
}

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
      /*
       * Stable ID of the chat this refine belongs to — same value api.chat.ts uses to
       * attribute cost to a project (see project-tracker.server.ts). The caller is
       * responsible for pre-generating one even for a brand-new chat (whose first
       * message doesn't exist yet) so the refine's cost can still be tracked.
       */
      trackingId?: string;
      hasExistingSite?: boolean;
      chatId?: string;
      selectedClient?: EnhancerClient | null;

      // Reference images attached to the prompt, so the refiner can describe what they show.
      images?: string[];
      referenceNote?: string;
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
      images: chatContext?.images?.length ? chatContext.images : undefined,
      referenceNote: chatContext?.referenceNote || undefined,
    };

    if (apiKeys) {
      requestBody.apiKeys = apiKeys;
    }

    const originalInput = input;

    let response: Response;

    try {
      response = await fetch('/api/enhancer', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      logger.error(error);
      setEnhancingPrompt(false);
      setPromptEnhanced(false);
      toast.error('Could not reach the prompt enhancer. Your prompt was left unchanged.');

      return;
    }

    const reader = response.body?.getReader();

    if (!response.ok || !reader) {
      logger.error(`Enhancer request failed: ${response.status} ${response.statusText}`);
      setEnhancingPrompt(false);
      setPromptEnhanced(false);
      toast.error(
        response.status === 401
          ? 'The enhancer model is missing a valid API key.'
          : 'Prompt enhancement failed. Your prompt was left unchanged.',
      );

      return;
    }

    const decoder = new TextDecoder();

    let _input = '';
    let _error: unknown;

    try {
      setInput('');

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        // { stream: true } so multi-byte UTF-8 split across chunks isn't corrupted
        _input += decoder.decode(value, { stream: true });

        logger.trace('Set input', _input);

        setInput(_input);
      }

      _input += decoder.decode();
    } catch (error) {
      _error = error;
    } finally {
      setEnhancingPrompt(false);

      const enhanced = cleanEnhancedPrompt(_input);

      if (_error || enhanced.length === 0) {
        if (_error) {
          logger.error(_error);
        }

        // Never leave the user with a truncated/empty prompt — restore what they typed
        setInput(originalInput);
        setPromptEnhanced(false);
        toast.error('Prompt enhancement failed. Your original prompt was restored.');
      } else {
        setPromptEnhanced(true);

        setTimeout(() => {
          setInput(enhanced);
        });
      }
    }
  };

  return { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer };
}
