import { describe, expect, it } from 'vitest';
import { buildEditRetryMessage, EDIT_RETRY_MARKER } from './failed-edits';
import type { FileMap } from './files';

const files: FileMap = {
  '/home/project/src/components/Hero.tsx': {
    type: 'file',
    isBinary: false,
    content: 'export function Hero() {\n  return <h1>Built to last</h1>;\n}\n',
  },
};

describe('buildEditRetryMessage', () => {
  it('gives the model the failed SEARCH text and the current file once per file', () => {
    const message = buildEditRetryMessage(
      [
        {
          filePath: 'src/components/Hero.tsx',
          reason: 'SEARCH block 1 not found.',
          failedSearch: '<h1>Built to Last</h1>',
        },
        { filePath: 'src/components/Hero.tsx', reason: 'SEARCH block 2 not found.', failedSearch: '<p>old</p>' },
      ],
      files,
      '/home/project',
    );

    expect(message.startsWith(EDIT_RETRY_MARKER)).toBe(true);
    expect(message).toContain('<h1>Built to Last</h1>');
    expect(message).toContain('<p>old</p>');
    expect(message.match(/### src\/components\/Hero\.tsx/g)).toHaveLength(1);
    expect(message).toContain('return <h1>Built to last</h1>;');
  });

  it('says when the file is missing', () => {
    const message = buildEditRetryMessage(
      [{ filePath: 'src/components/Nav.tsx', reason: 'The file does not exist, so it cannot be edited.' }],
      files,
      '/home/project',
    );

    expect(message).toContain('create it with a full file action');
  });
});
