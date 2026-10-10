import { beforeEach, describe, expect, it } from 'vitest';
import type { FileMap } from './files';
import {
  addSelection,
  locateByText,
  removeSelection,
  SELECTION_BLOCK_RE,
  SELECTION_TARGET_RE,
  selectedPreviewElements,
  withSelectedElementContext,
} from './visual-edit';

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

const footer = ['export function Footer() {', '  return <footer>© Stonehaven Developments</footer>;', '}'].join('\n');

const files: FileMap = {
  '/home/project/src/components/Hero.tsx': { type: 'file', isBinary: false, content: hero },
  '/home/project/src/components/Footer.tsx': { type: 'file', isBinary: false, content: footer },
  '/home/project/src/components/SmoothScroll.tsx': {
    type: 'file',
    isBinary: false,
    content: 'export default function S() {}',
  },
};

describe('preview selection context', () => {
  beforeEach(() => selectedPreviewElements.set([]));

  it('targets the selected file and includes its current code', () => {
    addSelection({
      id: 1,
      source: { file: 'src/components/Hero.tsx', line: 5 },
      tag: 'section',
      text: 'Built to last',
      html: '<section class="hero">…</section>',
    });

    const message = withSelectedElementContext('make the background navy', files);

    expect(message).toContain('<target n="1" tag="section" file="src/components/Hero.tsx" line="5" />');
    expect(message).toContain('<section className="hero">'); // the actual code, not just a path
    expect(message).toContain('REQUEST: make the background navy');
    expect(selectedPreviewElements.get()).toEqual([]); // used once
  });

  it('sends several selected sections, numbered', () => {
    addSelection({ id: 1, source: { file: 'src/components/Hero.tsx', line: 5 }, tag: 'section', text: '', html: '' });
    addSelection({ id: 2, source: { file: 'src/components/Footer.tsx', line: 2 }, tag: 'footer', text: '', html: '' });

    const message = withSelectedElementContext('use the brand purple', files);
    const targets = [...message.matchAll(SELECTION_TARGET_RE)].map((m) => `${m[1]}:${m[2]}:${m[3]}`);

    expect(targets).toEqual(['1:section:src/components/Hero.tsx', '2:footer:src/components/Footer.tsx']);
    expect(message).toContain('selected 2 elements');
    expect(message).toContain('### Target 2: <footer>');
  });

  it('removes a single selection', () => {
    addSelection({ id: 1, tag: 'a', text: '', html: '' });
    addSelection({ id: 2, tag: 'b', text: '', html: '' });
    removeSelection(1);
    expect(selectedPreviewElements.get().map((s) => s.id)).toEqual([2]);
  });

  it('uses the React 19 file hint and finds the exact lines by text in that file', () => {
    addSelection({
      id: 3,
      source: { file: 'src/components/Hero.tsx', line: 40, approx: true }, // line from transformed code
      tag: 'p',
      text: 'Homes across the coast since 2009',
      html: '',
    });

    expect(withSelectedElementContext('x', files)).toContain('file="src/components/Hero.tsx" line="7"');
  });

  it('finds the file from the visible text when there is no location at all', () => {
    expect(locateByText(files, 'Built to last\nHomes across the coast since 2009')).toEqual({
      file: 'src/components/Hero.tsx',
      line: 6,
    });
  });

  it('can be split back out of the message for display', () => {
    addSelection({ id: 1, source: { file: 'src/components/Hero.tsx', line: 5 }, tag: 'section', text: '', html: '' });

    const message = withSelectedElementContext('make it navy', files);

    expect(message.replace(SELECTION_BLOCK_RE, '')).toBe('REQUEST: make it navy');
  });

  it('leaves messages without a selection untouched', () => {
    expect(withSelectedElementContext('hello', files)).toBe('hello');
  });
});
