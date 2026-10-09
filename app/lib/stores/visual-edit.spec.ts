import { describe, expect, it } from 'vitest';
import { replaceTextInProject, replaceTextNearLine, toProjectRelative } from './visual-edit';

const hero = `export function Hero() {
  return (
    <section>
      <h1 className="text-5xl">
        Stonehaven Developments
      </h1>
      <p>Built to last since 2023</p>
      <h2>{title}</h2>
    </section>
  );
}
`;

describe('visual edit text replacement', () => {
  it('replaces multi-line JSX text near the element', () => {
    const out = replaceTextNearLine(hero, 4, 'Stonehaven Developments', 'Stonehaven Homes');
    expect(out).toContain('        Stonehaven Homes\n');
    expect(out).not.toContain('Developments');
  });

  it('matches across whitespace differences', () => {
    const out = replaceTextNearLine(hero, 7, 'Built to  last since 2023', 'Built to last since 2026');
    expect(out).toContain('<p>Built to last since 2026</p>');
  });

  it('escapes characters JSX would misread', () => {
    const out = replaceTextNearLine(hero, 7, 'Built to last since 2023', 'Use {curly} & <b>');
    expect(out).toContain("Use {'{'}curly{'}'} & &lt;b&gt;");
  });

  it('gives up when the text is not written literally (comes from a variable)', () => {
    expect(replaceTextNearLine(hero, 8, 'Welcome home', 'Hello')).toBeUndefined();
  });

  it('does not touch matching text inside attributes', () => {
    const src = '<img alt="Stonehaven Developments" />\n<p>Stonehaven Developments</p>\n';
    expect(replaceTextNearLine(src, 1, 'Stonehaven Developments', 'X')).toBe(
      '<img alt="Stonehaven Developments" />\n<p>X</p>\n',
    );
  });

  it('falls back to the one project file that contains the text', () => {
    const files = {
      '/home/project/app/page.tsx': { type: 'file' as const, isBinary: false, content: '<h1>Welcome home</h1>' },
      '/home/project/app/about/page.tsx': { type: 'file' as const, isBinary: false, content: '<h1>About us</h1>' },
    };

    expect(replaceTextInProject(files, 'Welcome home', 'Hello')).toEqual({
      filePath: '/home/project/app/page.tsx',
      content: '<h1>Hello</h1>',
    });
  });

  it('refuses to guess when the text appears more than once', () => {
    const files = {
      '/home/project/components/Nav.tsx': { type: 'file' as const, isBinary: false, content: '<a>Contact</a>' },
      '/home/project/components/Footer.tsx': { type: 'file' as const, isBinary: false, content: '<a>Contact</a>' },
    };

    expect(replaceTextInProject(files, 'Contact', 'Get in touch')).toBeUndefined();
  });

  it('maps sandbox paths to project-relative paths', () => {
    expect(toProjectRelative('/vercel/project/components/Hero.tsx')).toBe('components/Hero.tsx');
    expect(toProjectRelative('/home/project/src/App.tsx')).toBe('src/App.tsx');
  });
});
