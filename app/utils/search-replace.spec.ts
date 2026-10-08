import { describe, expect, it } from 'vitest';
import { applySearchReplace, parseSearchReplaceBlocks, SearchReplaceError } from './search-replace';

const file = `export function Hero() {
  return (
    <section>
      <h1>Stonehaven Developments</h1>
      <p>Since 2023</p>
    </section>
  );
}
`;

describe('search-replace', () => {
  it('parses multiple blocks', () => {
    const blocks = parseSearchReplaceBlocks(
      '<<<<<<< SEARCH\na\n=======\nb\n>>>>>>> REPLACE\n<<<<<<< SEARCH\nc\n=======\n\n>>>>>>> REPLACE',
    );

    expect(blocks).toEqual([
      { search: 'a', replace: 'b' },
      { search: 'c', replace: '' },
    ]);
  });

  it('replaces only the matched part', () => {
    const blocks = parseSearchReplaceBlocks(
      '<<<<<<< SEARCH\n      <h1>Stonehaven Developments</h1>\n=======\n      <h1>Stonehaven Homes</h1>\n>>>>>>> REPLACE',
    );

    expect(applySearchReplace(file, blocks)).toBe(file.replace('Stonehaven Developments', 'Stonehaven Homes'));
  });

  it('tolerates indentation differences', () => {
    const blocks = [{ search: '<p>Since 2023</p>', replace: '      <p>Since 2026</p>' }];
    expect(applySearchReplace(file, blocks)).toContain('<p>Since 2026</p>');
  });

  it('treats an already-applied edit as done (chat replay)', () => {
    const edited = file.replace('Stonehaven Developments', 'Stonehaven Homes');
    const blocks = [{ search: '<h1>Stonehaven Developments</h1>', replace: '<h1>Stonehaven Homes</h1>' }];

    expect(applySearchReplace(edited, blocks)).toBe(edited);
  });

  it('fails clearly when SEARCH is not in the file', () => {
    expect(() => applySearchReplace(file, [{ search: '<h2>Nope</h2>', replace: 'x' }])).toThrow(SearchReplaceError);
  });
});
