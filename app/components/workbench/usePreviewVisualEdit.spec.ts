import { describe, expect, it } from 'vitest';
import { toSource } from './usePreviewVisualEdit';

describe('toSource', () => {
  it('ignores the marker string sent by previews running the old bridge (was a crash)', () => {
    expect(toSource('sitara-preview')).toBeUndefined();
    expect(toSource(null)).toBeUndefined();
    expect(toSource({ line: 3 })).toBeUndefined();
  });

  it('maps a real location to a project-relative path', () => {
    expect(toSource({ file: '/vercel/project/src/components/Hero.tsx', line: 4 })).toEqual({
      file: 'src/components/Hero.tsx',
      line: 4,
      column: undefined,
      approx: undefined,
    });
    expect(toSource({ file: 'src/components/Hero.tsx', line: 13, approx: true })).toMatchObject({
      file: 'src/components/Hero.tsx',
      approx: true,
    });
  });
});
