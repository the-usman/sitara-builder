import { describe, expect, it } from 'vitest';
import type { LanguageModelV1 } from 'ai';
import { withSupportedSamplingParams } from './sampling-params';

function fakeModel(modelId: string, chunks: Array<{ type: string }>) {
  const seen: { params?: any } = {};
  const model = {
    modelId,
    specificationVersion: 'v1',
    provider: 'test',
    defaultObjectGenerationMode: 'json',
    doStream: async (params: any) => {
      seen.params = params;

      return {
        stream: new ReadableStream({
          start(controller) {
            chunks.forEach((chunk) => controller.enqueue(chunk));
            controller.close();
          },
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      };
    },
  } as unknown as LanguageModelV1;

  return { model, seen };
}

const callOptions: any = { inputFormat: 'messages', mode: { type: 'regular' }, prompt: [], temperature: 0, topP: 1 };

describe('withSupportedSamplingParams', () => {
  it('drops reasoning-signature / redacted-reasoning chunks and keeps the rest', async () => {
    const { model } = fakeModel('claude-opus-5-5', [
      { type: 'reasoning' },
      { type: 'reasoning-signature' },
      { type: 'redacted-reasoning' },
      { type: 'text-delta' },
      { type: 'finish' },
    ]);

    const { stream } = await withSupportedSamplingParams(model).doStream(callOptions);
    const types: string[] = [];

    for await (const chunk of stream as any) {
      types.push(chunk.type);
    }

    expect(types).toEqual(['reasoning', 'text-delta', 'finish']);
  });

  it('strips sampling params only for models that reject them', async () => {
    const opus5 = fakeModel('claude-opus-5-5', []);
    await withSupportedSamplingParams(opus5.model).doStream(callOptions);
    expect(opus5.seen.params.temperature).toBeUndefined();
    expect(opus5.seen.params.topP).toBeUndefined();

    const sonnet35 = fakeModel('claude-3-5-sonnet-latest', []);
    await withSupportedSamplingParams(sonnet35.model).doStream(callOptions);
    expect(sonnet35.seen.params.temperature).toBe(0);
  });
});
