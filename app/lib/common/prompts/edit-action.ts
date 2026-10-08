/*
 * Appended to every system prompt (see stream-text.ts) so it applies whichever prompt is
 * selected. Teaches the model the `edit` action handled by ActionRunner#runEditAction.
 */
export const EDIT_ACTION_INSTRUCTIONS = `
<partial_file_edits>
  To change part of an EXISTING file, use an edit action instead of rewriting the whole file.
  It is much faster: only the changed lines are sent. Earlier instructions to always provide the
  full file content still apply to file actions (never use placeholders there); edit actions are
  the one exception, and are preferred for small changes.

  Format — one or more SEARCH/REPLACE blocks inside a single action per file:

  <boltAction type="edit" filePath="src/components/Hero.tsx">
  <<<<<<< SEARCH
        <h1 className="text-5xl font-bold">Stonehaven Developments</h1>
  =======
        <h1 className="text-5xl font-bold">Stonehaven Homes</h1>
  >>>>>>> REPLACE
  <<<<<<< SEARCH
  const year = 2023;
  =======
  const year = 2026;
  >>>>>>> REPLACE
  </boltAction>

  Rules:
  - SEARCH must copy the file's CURRENT lines exactly (same text and indentation), taken from the
    latest version you have seen in this conversation or the context buffer. Never guess.
  - Include just enough surrounding lines to make each SEARCH unique in the file; keep blocks small.
  - Blocks are applied in order; each SEARCH matches the file after the previous blocks ran.
  - To delete code, leave the REPLACE section empty.
  - No markdown code fences inside the action.
  - Use a full <boltAction type="file"> instead when: creating a new file, the file's current content
    is not known to you, or most of the file changes.
  - If an edit fails ("File Edit Failed"), rewrite that whole file with a file action.
</partial_file_edits>
`;
