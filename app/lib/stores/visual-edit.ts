import { atom } from 'nanostores';
import type { FileMap } from '~/lib/stores/files';
import { WORK_DIR } from '~/utils/constants';

/*
 * Visual editing of the live preview. The preview bridge (app/lib/sandbox/preview-bridge.ts)
 * reports clicks with the JSX source location React recorded; this store turns them into either
 * a selected section the next chat message is about, or a direct text change in the source.
 */

export type PreviewEditMode = 'off' | 'select' | 'text';

export interface PreviewSource {
  /** Project-relative path, e.g. "components/Hero.tsx". */
  file: string;
  line: number;
  column?: number;
}

export interface SelectedPreviewElement {
  source?: PreviewSource;
  tag: string;
  text: string;
  html: string;
}

export const previewEditMode = atom<PreviewEditMode>('off');
export const selectedPreviewElement = atom<SelectedPreviewElement | undefined>(undefined);

/** Text for the chat input to adopt (e.g. a text edit that has to go through the AI). */
export const pendingChatPrompt = atom<string | undefined>(undefined);

const SANDBOX_PROJECT_DIR = '/vercel/project/';

/** The bridge reports paths as seen by the dev server in the sandbox. */
export function toProjectRelative(fileName: string): string {
  if (fileName.startsWith(SANDBOX_PROJECT_DIR)) {
    return fileName.slice(SANDBOX_PROJECT_DIR.length);
  }

  if (fileName.startsWith(WORK_DIR + '/')) {
    return fileName.slice(WORK_DIR.length + 1);
  }

  return fileName.replace(/^\.?\//, '');
}

export function describeSelection(selection: SelectedPreviewElement): string {
  const where = selection.source ? `${selection.source.file}:${selection.source.line}` : 'unknown file';
  return `<${selection.tag}> · ${where}`;
}

/**
 * Appends what the user selected in the preview to their message, so the model knows exactly
 * which element "this" refers to, then clears the selection.
 */
const SNIPPET_BEFORE = 3;
const SNIPPET_AFTER = 45;

/*
 * When React couldn't say where an element is written (Next.js server components), find it by
 * its visible text: the source file containing the most of its distinctive text lines wins.
 */
export function locateByText(files: FileMap, text: string): PreviewSource | undefined {
  const phrases = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
    .sort((a, b) => b.length - a.length)
    .slice(0, 6)
    .map((line) => line.slice(0, 60));

  if (!phrases.length) {
    return undefined;
  }

  let best: { source: PreviewSource; hits: number } | undefined;

  for (const [filePath, dirent] of Object.entries(files)) {
    if (
      dirent?.type !== 'file' ||
      dirent.isBinary ||
      !SOURCE_FILE.test(filePath) ||
      filePath.includes('/node_modules/')
    ) {
      continue;
    }

    const hits = phrases.filter((phrase) => dirent.content.includes(phrase));

    if (hits.length && (!best || hits.length > best.hits)) {
      // Earliest match: where the selected section's text begins in the file.
      const offset = Math.min(...hits.map((phrase) => dirent.content.indexOf(phrase)));
      const line = dirent.content.slice(0, offset).split('\n').length;
      best = { source: { file: toProjectRelative(filePath), line }, hits: hits.length };
    }
  }

  return best?.source;
}

function codeSnippet(files: FileMap, source: PreviewSource): string | undefined {
  const file = files[`${WORK_DIR}/${source.file}`];

  if (file?.type !== 'file' || file.isBinary) {
    return undefined;
  }

  const lines = file.content.split('\n');
  const from = Math.max(0, source.line - 1 - SNIPPET_BEFORE);
  const to = Math.min(lines.length, source.line - 1 + SNIPPET_AFTER);
  const language = source.file.split('.').pop() || '';

  return [
    `Current code of ${source.file}, lines ${from + 1}-${to} (the selected element starts on line ${source.line}):`,
    '```' + language,
    lines.slice(from, to).join('\n'),
    '```',
  ].join('\n');
}

/** Matches the block withSelectedElementContext adds; UserMessage renders it as a card. */
export const SELECTION_BLOCK_RE = /<sitara-selection([^>]*)>[\s\S]*?<\/sitara-selection>\s*/;

/**
 * Prepends what the user selected in the preview to their message — the element, the file and
 * the actual code around it — so the model edits exactly that section, then clears the
 * selection. Wrapped in <sitara-selection> so the chat can show it as a card.
 */
export function withSelectedElementContext(message: string, files: FileMap): string {
  const selection = selectedPreviewElement.get();

  if (!selection) {
    return message;
  }

  selectedPreviewElement.set(undefined);

  const source = selection.source ?? locateByText(files, selection.text);
  const snippet = source ? codeSnippet(files, source) : undefined;
  const where = source ? `${source.file}, line ${source.line}` : 'an unknown file (find it from the HTML below)';

  const block = [
    `<sitara-selection tag="${selection.tag}" file="${source?.file ?? ''}" line="${source?.line ?? ''}">`,
    `TARGET: the user selected a <${selection.tag}> element in the live preview, defined in ${where}.`,
    'Apply the request below to THIS element/section only. Do not change other components, sections or files',
    'unless the request explicitly needs it. Prefer a small edit action on this file.',
    '',
    snippet ?? '',
    '',
    `Visible text of the selection: ${JSON.stringify(selection.text.slice(0, 300))}`,
    `Rendered HTML of the selection (truncated): ${selection.html.slice(0, 1200)}`,
    '</sitara-selection>',
  ]
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n');

  return `${block}\n\nREQUEST: ${message}`;
}

/** Text written into JSX must not be read as an expression or a tag. */
const JSX_TEXT_ESCAPES: Record<string, string> = { '{': "{'{'}", '}': "{'}'}", '<': '&lt;', '>': '&gt;' };

function escapeJsxText(text: string): string {
  // Single pass: escaping "{" adds a "}" that a second pass would escape again.
  return text.replace(/[{}<>]/g, (char) => JSX_TEXT_ESCAPES[char]);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces `oldText` with `newText` in `content`, looking only near `line` (the element's JSX).
 * Matches across the line breaks/indentation JSX text is usually formatted with. Returns
 * undefined when the text isn't written literally there (it comes from a variable, a prop, a
 * translation…), so the caller can hand the change to the AI instead.
 */
export function replaceTextNearLine(
  content: string,
  line: number,
  oldText: string,
  newText: string,
  windowLines = 40,
): string | undefined {
  const words = oldText.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return undefined;
  }

  const lines = content.split('\n');
  const from = Math.max(0, line - 1);
  const to = Math.min(lines.length, from + windowLines);
  const windowStart = lines.slice(0, from).reduce((offset, l) => offset + l.length + 1, 0);
  const windowText = lines.slice(from, to).join('\n');
  const match = windowText.match(jsxTextPattern(words));

  if (!match || match.index === undefined) {
    return undefined;
  }

  const start = windowStart + match.index + match[1].length;
  const end = start + match[2].length;

  return content.slice(0, start) + escapeJsxText(newText.trim()) + content.slice(end);
}

/** Same words in order, any whitespace between them, and not inside a tag or expression. */
function jsxTextPattern(words: string[], flags = ''): RegExp {
  return new RegExp(`(^|[>}\\s])(${words.map(escapeRegExp).join('\\s+')})(?=$|[<{\\s])`, flags);
}

const SOURCE_FILE = /\.(jsx|tsx|js|ts|mdx|html)$/;

/**
 * Fallback when the preview can't say where an element came from (Next.js server components):
 * changes the text only if it appears exactly once as JSX text in the whole project, so a word
 * used in several places (nav and footer) is never changed in the wrong one.
 */
export function replaceTextInProject(
  files: FileMap,
  oldText: string,
  newText: string,
): { filePath: string; content: string } | undefined {
  const words = oldText.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return undefined;
  }

  const pattern = jsxTextPattern(words, 'g');
  let found: { filePath: string; content: string } | undefined;

  for (const [filePath, dirent] of Object.entries(files)) {
    if (
      dirent?.type !== 'file' ||
      dirent.isBinary ||
      !SOURCE_FILE.test(filePath) ||
      filePath.includes('/node_modules/')
    ) {
      continue;
    }

    const occurrences = dirent.content.match(pattern)?.length ?? 0;

    if (occurrences === 0) {
      continue;
    }

    if (occurrences > 1 || found) {
      return undefined; // ambiguous
    }

    found = { filePath, content: replaceTextNearLine(dirent.content, 1, oldText, newText, Infinity)! };
  }

  return found;
}
