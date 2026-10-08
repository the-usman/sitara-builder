/*
 * SEARCH/REPLACE edits for `<boltAction type="edit">`. Lets the model change a few lines of an
 * existing file instead of re-sending all of it:
 *
 *   <<<<<<< SEARCH
 *   exact lines currently in the file
 *   =======
 *   the lines to put there instead
 *   >>>>>>> REPLACE
 */

export interface SearchReplaceBlock {
  search: string;
  replace: string;
}

const BLOCK_RE = /<{5,9} SEARCH[^\n]*\n([\s\S]*?)\n?={5,9}[^\n]*\n([\s\S]*?)\n?>{5,9} REPLACE/g;

export function parseSearchReplaceBlocks(text: string): SearchReplaceBlock[] {
  const blocks: SearchReplaceBlock[] = [];

  for (const match of text.replace(/\r\n/g, '\n').matchAll(BLOCK_RE)) {
    blocks.push({ search: match[1], replace: match[2] });
  }

  return blocks;
}

/** Finds `search` ignoring per-line indentation/trailing-space differences; returns [start, end) offsets. */
function findLooseMatch(content: string, search: string): [number, number] | undefined {
  const lines = content.split('\n');
  const wanted = search.split('\n').map((line) => line.trim());

  while (wanted.length && wanted[wanted.length - 1] === '') {
    wanted.pop();
  }

  if (!wanted.length) {
    return undefined;
  }

  const offsets: number[] = [];
  let offset = 0;

  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  for (let i = 0; i + wanted.length <= lines.length; i++) {
    if (wanted.every((line, j) => lines[i + j].trim() === line)) {
      const last = i + wanted.length - 1;
      return [offsets[i], offsets[last] + lines[last].length];
    }
  }

  return undefined;
}

export class SearchReplaceError extends Error {
  constructor(
    message: string,
    readonly failedSearch: string,
  ) {
    super(message);
    this.name = 'SearchReplaceError';
  }
}

/**
 * Applies blocks in order. A block whose SEARCH text isn't found, but whose REPLACE text already
 * is, counts as applied — that's what happens when a restored chat replays its edits onto files
 * that already contain them.
 */
export function applySearchReplace(original: string, blocks: SearchReplaceBlock[]): string {
  let content = original.replace(/\r\n/g, '\n');

  for (const { search, replace } of blocks) {
    if (!search.trim()) {
      throw new SearchReplaceError('A SEARCH section is empty. Use a full file action to create files.', search);
    }

    const exact = content.indexOf(search);

    if (exact !== -1) {
      content = content.slice(0, exact) + replace + content.slice(exact + search.length);
      continue;
    }

    const loose = findLooseMatch(content, search);

    if (loose) {
      content = content.slice(0, loose[0]) + replace + content.slice(loose[1]);
      continue;
    }

    // Whole-line match only: a substring check would "find" short replacements inside other words.
    if (replace.trim() && findLooseMatch(content, replace)) {
      continue;
    }

    throw new SearchReplaceError('SEARCH text was not found in the file.', search);
  }

  return content;
}
