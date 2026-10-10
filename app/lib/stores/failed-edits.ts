import { atom } from 'nanostores';
import type { FileMap } from './files';

/**
 * Edit actions (SEARCH/REPLACE) that could not be applied during the current response. When the
 * response finishes, the chat sends them back to the model with the files' current content so it
 * can redo them (see Chat.client.tsx).
 */
export interface FailedEdit {
  // path relative to the project, e.g. src/components/Hero.tsx
  filePath: string;
  reason: string;

  // the SEARCH text that did not match, when that was the problem
  failedSearch?: string;
}

export const failedEdits = atom<FailedEdit[]>([]);

export function recordFailedEdit(edit: FailedEdit) {
  failedEdits.set([...failedEdits.get(), edit]);
}

// Marks the automatic retry message, so the chat can tell it apart from what the user typed.
export const EDIT_RETRY_MARKER = '*Some of your edits could not be applied*';

// Larger files are cut off: the model then has to rewrite them from what it already knows.
const MAX_FILE_CHARS = 40_000;

export function buildEditRetryMessage(edits: FailedEdit[], files: FileMap, workDir: string): string {
  const byFile = new Map<string, FailedEdit[]>();

  for (const edit of edits) {
    byFile.set(edit.filePath, [...(byFile.get(edit.filePath) ?? []), edit]);
  }

  const sections = [...byFile].map(([filePath, fileEdits]) => {
    const failures = fileEdits
      .map((edit) =>
        edit.failedSearch
          ? `- ${edit.reason}\n  SEARCH text that did not match:\n\`\`\`\n${edit.failedSearch}\n\`\`\``
          : `- ${edit.reason}`,
      )
      .join('\n');

    const file = files[`${workDir}/${filePath}`];

    let current: string;

    if (file?.type !== 'file') {
      current = 'The file does not exist — create it with a full file action.';
    } else if (file.isBinary) {
      current = 'The file is binary.';
    } else if (file.content.length > MAX_FILE_CHARS) {
      current = `Current content (first ${MAX_FILE_CHARS} characters of ${file.content.length}):\n\`\`\`\n${file.content.slice(0, MAX_FILE_CHARS)}\n\`\`\``;
    } else {
      current = `Current content:\n\`\`\`\n${file.content}\n\`\`\``;
    }

    return `### ${filePath}\n${failures}\n\n${current}`;
  });

  return [
    EDIT_RETRY_MARKER,
    '',
    'None of the changes in the edits below were made: the SEARCH text must match the file exactly, and it did not. ' +
      'Apply the same intended changes again using the current file content shown here. Copy SEARCH text character for character ' +
      'from it (indentation included), or rewrite the whole file with a file action if that is simpler. Do not change anything else ' +
      'and do not repeat edits that already worked.',
    '',
    ...sections,
  ].join('\n');
}
