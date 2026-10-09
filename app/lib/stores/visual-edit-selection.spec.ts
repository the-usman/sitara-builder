import { beforeEach, describe, expect, it } from 'vitest';
import type { FileMap } from './files';
import { locateByText, SELECTION_BLOCK_RE, selectedPreviewElement, withSelectedElementContext } from './visual-edit';

const hero = [
  "import SmoothScroll from '@/components/SmoothScroll';",
  '',
  'export function Hero() {',
  '  return (',
  '    <section className="hero">',
  '      <h1>Built to last</h1>',
  '      <p>Homes across the coast since 2009</p>',
  '    </section>',
  '  );',
  '}',
].join('\n');

const files: FileMap = {
  '/home/project/components/Hero.tsx': { type: 'file', isBinary: false, content: hero },
  '/home/project/components/SmoothScroll.tsx': { type: 'file', isBinary: false, content: 'export default function S() {}' },
};

describe('preview selection context', () => {
  beforeEach(() => selectedPreviewElement.set(undefined));

  it('targets the selected file and includes its current code', () => {
    selectedPreviewElement.set({
      source: { file: 'components/Hero.tsx', line: 5 },
      tag: 'section',
      text: 'Built to last',
      html: '<section class="hero">…</section>',
    });

    const message = withSelectedElementContext('make the background navy', files);

    expect(message).toMatch(/^<sitara-selection tag="section" file="components\/Hero.tsx" line="5">/);
    expect(message).toContain('defined in components/Hero.tsx, line 5');
    expect(message).toContain('<section className="hero">'); // the actual code, not just a path
    expect(message).toContain('REQUEST: make the background navy');
    expect(selectedPreviewElement.get()).toBeUndefined(); // used once
  });

  it('finds the file from the visible text when React has no location (server components)', () => {
    expect(locateByText(files, 'Built to last\nHomes across the coast since 2009')).toEqual({
      file: 'components/Hero.tsx',
      line: 6,
    });

    selectedPreviewElement.set({ tag: 'section', text: 'Built to last\nHomes across the coast since 2009', html: '' });
    expect(withSelectedElementContext('x', files)).toContain('file="components/Hero.tsx"');
  });

  it('can be split back out of the message for display', () => {
    selectedPreviewElement.set({ source: { file: 'components/Hero.tsx', line: 5 }, tag: 'section', text: '', html: '' });

    const message = withSelectedElementContext('make it navy', files);

    expect(message.replace(SELECTION_BLOCK_RE, '')).toBe('REQUEST: make it navy');
  });

  it('leaves messages without a selection untouched', () => {
    expect(withSelectedElementContext('hello', files)).toBe('hello');
  });
});
