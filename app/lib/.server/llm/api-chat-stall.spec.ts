import { streamText as aiStreamText } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STALL_LIMITS } from '~/lib/.server/llm/stall-watchdog';

/*
 * A provider that stops sending mid-reply without closing the connection must not leave the chat
 * "Generating Response" forever: the watchdog aborts it and continues from the partial text.
 */

const calls: Array<{ messages: any[] }> = [];
let behaviours: Array<'stall' | 'stall-in-file' | 'finish'> = [];

const PARTIAL_FILE = '<boltArtifact id="s" title="Site"><boltAction type="file" filePath="src/Hero.tsx">export fun';

function makeModel() {
  return new MockLanguageModelV1({
    doStream: async ({ prompt, abortSignal }) => {
      calls.push({ messages: prompt });

      const behaviour = behaviours.shift() ?? 'finish';
      const stream = new ReadableStream<any>({
        start(controller) {
          if (behaviour === 'stall' || behaviour === 'stall-in-file') {
            controller.enqueue({ type: 'text-delta', textDelta: behaviour === 'stall' ? 'PARTIAL-' : PARTIAL_FILE });

            // ...and then nothing, until the watchdog aborts the request.
            abortSignal?.addEventListener('abort', () => controller.error(abortSignal.reason));

            return;
          }

          controller.enqueue({ type: 'text-delta', textDelta: 'REST' });
          controller.enqueue({ type: 'finish', finishReason: 'stop', usage: { promptTokens: 1, completionTokens: 1 } });
          controller.close();
        },
      });

      return { stream, rawCall: { rawPrompt: null, rawSettings: {} } };
    },
  });
}

vi.mock('~/lib/.server/llm/stream-text', () => ({
  streamText: async ({ messages, options }: any) =>
    aiStreamText({
      model: makeModel(),
      messages: messages.map((m: any) => ({ role: m.role, content: String(m.content) })),
      ...options,
    }),
}));
vi.mock('~/lib/auth.server', () => ({ getAuthToken: () => null, verifyJwt: async () => null }));
vi.mock('~/lib/config/app-config.server', () => ({ readAppConfig: async () => ({ apiKeys: {} }) }));
vi.mock('~/lib/.server/llm/live-pricing.server', () => ({ getLiveModelRate: async () => undefined }));
vi.mock('~/lib/project-tracker.server', () => ({ upsertProject: async () => undefined }));

let action: typeof import('~/routes/api.chat').action;

// Loading the route registers every LLM provider, which is slow — keep it out of the test timeouts.
beforeAll(async () => {
  ({ action } = await import('~/routes/api.chat'));
}, 60_000);

async function chat() {
  const request = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ id: '1', role: 'user', content: '[Model: m]\n\n[Provider: p]\n\nbuild it' }],
      files: {},
      contextOptimization: false,
    }),
  });
  const response = await action({ request, context: { cloudflare: { env: {} } }, params: {} } as any);

  return await response.text();
}

describe('api.chat stall watchdog', () => {
  beforeEach(() => {
    calls.length = 0;
    STALL_LIMITS.firstOutputMs = 1000;
    STALL_LIMITS.silenceMs = 200;
    STALL_LIMITS.maxRetries = 2;
  });

  it('aborts a silent stream and continues from the partial reply', async () => {
    behaviours = ['stall', 'finish'];

    const body = await chat();

    expect(body).toContain('PARTIAL-');
    expect(body).toContain('REST');
    expect(body).not.toContain('__sitara_stream_stalled__');
    expect(body).not.toMatch(/^3:/m); // no error shown to the user
    expect(calls).toHaveLength(2);

    // The second call carries the partial reply, so the model can pick up where it stopped.
    expect(JSON.stringify(calls[1].messages)).toContain('PARTIAL-');
  }, 10_000);

  it('closes a half-written file and asks the model to write that file again', async () => {
    behaviours = ['stall-in-file', 'finish'];

    const body = await chat();

    expect(body).toContain('sitara:interrupted-action'); // the runner skips the partial file
    expect(body).toContain('REST');

    const retry = JSON.stringify(calls[1].messages);
    expect(retry).toContain('COMPLETE `src/Hero.tsx`');
    expect(retry).not.toContain('export fun'); // the broken half-file isn't shown to the model
  }, 10_000);

  it('gives up with a clear error instead of hanging when the model keeps stalling', async () => {
    behaviours = ['stall', 'stall', 'stall'];

    const body = await chat();

    expect(body).toContain('model_stalled');
    expect(calls).toHaveLength(3);
  }, 10_000);
});
