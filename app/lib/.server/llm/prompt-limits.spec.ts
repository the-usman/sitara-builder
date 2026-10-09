import { describe, expect, it } from 'vitest';
import { MAX_HISTORY_CHARS, limitMessages, truncateText } from './prompt-limits';
import { createFilesContext } from './utils';

const big = (n: number) => 'x'.repeat(n);

describe('limitMessages', () => {
  it('drops images from older messages and keeps them on the latest user message', () => {
    const image = { type: 'image', image: `data:image/png;base64,${big(1000)}` };
    const out = limitMessages([
      { role: 'user', content: [{ type: 'text', text: 'old' }, image] },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: [{ type: 'text', text: 'new' }, image] },
    ]);

    expect(out[0].content[1]).toEqual({ type: 'text', text: '[image omitted from earlier message]' });
    expect(out[2].content[1]).toEqual(image);
  });

  it('keeps the design reference when later user messages have no images (starter template flow)', () => {
    const image = { type: 'image', image: `data:image/png;base64,${big(1000)}` };
    const out = limitMessages([
      { role: 'user', content: [{ type: 'text', text: 'build this site' }, image] },
      { role: 'assistant', content: 'template imported' },
      { role: 'user', content: 'continue with my original request' },
    ]);

    expect(out[0].content[1]).toEqual(image);
  });

  it('truncates giant messages and drops oldest history to fit the budget', () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `${i}:${big(30_000)}`,
    }));
    const out = limitMessages(messages);
    const total = out.reduce((sum, m) => sum + m.content.length, 0);

    expect(total).toBeLessThanOrEqual(MAX_HISTORY_CHARS + 500);
    expect(out[0].role).toBe('user');
    expect(out[out.length - 1]).toBe(messages[messages.length - 1]);
  });

  it('survives a 40MB message', () => {
    const out = limitMessages([{ role: 'user', content: big(40_000_000) }]);

    expect(out[0].content.length).toBeLessThan(130_000);
  });
});

describe('createFilesContext', () => {
  it('never inlines binary files and caps large text files', () => {
    const ctx = createFilesContext({
      '/home/project/video.mp4': { type: 'file', content: big(5_000_000), isBinary: true },
      '/home/project/data.json': { type: 'file', content: big(5_000_000), isBinary: false },
      '/home/project/index.html': { type: 'file', content: '<html></html>', isBinary: false },
    });

    expect(ctx.length).toBeLessThan(50_000);
    expect(ctx).toContain('[binary file omitted]');
    expect(ctx).toContain('<html></html>');
  });

  it('truncateText keeps head and tail', () => {
    const out = truncateText(`HEAD${big(1000)}TAIL`, 100);

    expect(out.startsWith('HEAD')).toBe(true);
    expect(out.endsWith('TAIL')).toBe(true);
  });
});
