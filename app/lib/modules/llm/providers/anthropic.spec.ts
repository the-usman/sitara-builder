import { afterEach, describe, expect, it, vi } from 'vitest';
import '../registry';
import AnthropicProvider from './anthropic';

describe('AnthropicProvider requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends thinking: disabled', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const model = new AnthropicProvider().getModelInstance({
      model: 'claude-opus-5-5',
      serverEnv: {} as any,
      apiKeys: { Anthropic: 'test-key' },
    });

    await model
      .doGenerate({
        inputFormat: 'messages',
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      .catch(() => undefined);

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.temperature).toBeUndefined();
  });
});
