/*
 * When a model stream stalls mid-action, the server closes the half-written action with this marker
 * inside it and asks the model to write that action again (see planStallRetry in
 * lib/.server/llm/stall-watchdog.ts). The action runner skips actions carrying it, so the partial
 * file or edit is never applied as final.
 */
export const INTERRUPTED_ACTION_MARKER = '<!-- sitara:interrupted-action -->';

export const INTERRUPTED_ACTION_CLOSE = `\n${INTERRUPTED_ACTION_MARKER}\n</boltAction>\n`;

export function isInterruptedAction(content: string | undefined): boolean {
  return !!content?.includes(INTERRUPTED_ACTION_MARKER);
}
