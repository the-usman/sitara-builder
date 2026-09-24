import { describe, expect, it } from 'vitest';
import { MAX_SNAPSHOT_BINARY_CHARS, slimSnapshotFiles } from './snapshot-slim';

const file = (content: string, isBinary = false) => ({ type: 'file' as const, content, isBinary });

describe('slimSnapshotFiles', () => {
  it('drops build output and lockfiles but keeps source and folders', () => {
    const slim = slimSnapshotFiles({
      '/home/project/index.html': file('<html>'),
      '/home/project/src': { type: 'folder' },
      '/home/project/dist/app.js': file('x'),
      '/home/project/node_modules/a/index.js': file('x'),
      '/home/project/package-lock.json': file('{}'),
    });

    expect(Object.keys(slim).sort()).toEqual(['/home/project/index.html', '/home/project/src']);
  });

  it('keeps small media but drops media that blows the budget', () => {
    const slim = slimSnapshotFiles({
      '/home/project/logo.png': file('a'.repeat(1000), true),
      '/home/project/video.mp4': file('a'.repeat(MAX_SNAPSHOT_BINARY_CHARS + 1), true),
    });

    expect(Object.keys(slim)).toEqual(['/home/project/logo.png']);
  });
});
