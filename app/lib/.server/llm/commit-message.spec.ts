import { describe, expect, it } from 'vitest';
import { fallbackCommitMessage, generateCommitMessage } from './commit-message';

describe('commit messages', () => {
  it('summarises changes without a model', () => {
    expect(
      fallbackCommitMessage([
        { path: 'a.html', status: 'added' },
        { path: 'b.css', status: 'modified' },
        { path: 'c.css', status: 'modified' },
      ]),
    ).toBe('Update website (1 added, 2 modified)');
  });

  it('falls back instead of failing when no model is selected in the cookies', async () => {
    const message = await generateCommitMessage({
      request: new Request('http://localhost/api/github-push'),
      serverEnv: {},
      userPrompt: 'add a pricing section',
      changes: [{ path: 'index.html', status: 'modified' }],
    });

    expect(message).toBe('Update website (1 modified)');
  });
});
