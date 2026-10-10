import { INTERRUPTED_ACTION_CLOSE } from '~/utils/interrupted-action';

/*
 * Stall watchdog limits for chat streams (see startSegment in routes/api.chat.ts): some providers
 * stop sending mid-reply without closing the connection. The first output may legitimately take a
 * while (long prompt, hidden reasoning); after that, this much silence means the stream is dead.
 * Mutable only so tests can shorten them.
 */
export const STALL_LIMITS = {
  firstOutputMs: 180_000,
  silenceMs: 75_000,
  maxRetries: 2,
};

// Abort reason / error text of a stalled stream; error parts carrying it are dropped from the response.
export const STALL_MARKER = '__sitara_stream_stalled__';

export interface StallRetryPlan {
  // Sent to the browser first: closes the half-written action so the chat's parser is back outside it.
  closeText: string;

  // The stalled segment's text as the model will see it next time (without the half-written action).
  historyText: string;

  // What to ask the model to do next.
  instruction: string;
}

const ACTION_OPEN = /<boltAction\b[^>]*>/g;

/**
 * Picks how to recover from a stall. Resuming mid-file from a fresh request is fragile (the model
 * has to continue exactly mid-token), so when the stall hit inside an action, that action is
 * retried as a whole instead: it gets closed off in the chat, and the model writes it again in
 * full, then carries on with the rest of its plan.
 *
 * @param replyText everything the model sent in this reply so far, across segments
 * @param segmentText the part of it sent by the stalled request
 */
export function planStallRetry(replyText: string, segmentText: string, continuePrompt: string): StallRetryPlan {
  const lastOpen = [...replyText.matchAll(ACTION_OPEN)].pop();
  const lastClose = replyText.lastIndexOf('</boltAction>');

  if (!lastOpen || lastOpen.index! < lastClose) {
    return { closeText: '', historyText: segmentText, instruction: continuePrompt };
  }

  const tag = lastOpen[0];
  const filePath = tag.match(/filePath="([^"]*)"/)?.[1];
  const type = tag.match(/type="([^"]*)"/)?.[1] ?? 'file';

  // Where the half-written action starts within the stalled segment (it may predate the segment).
  const startInSegment = lastOpen.index! - (replyText.length - segmentText.length);
  const historyText = startInSegment >= 0 ? segmentText.slice(0, startInSegment) : segmentText;

  const what = filePath ? `the ${type} action for \`${filePath}\`` : `the ${type} action`;
  const redo =
    type === 'edit'
      ? `the same edit to \`${filePath}\` again, in full, as a new <boltAction type="edit" filePath="${filePath}">`
      : type === 'file' && filePath
        ? `the COMPLETE \`${filePath}\` again as a new <boltAction type="file" filePath="${filePath}">`
        : `that action again, in full, as a new <boltAction type="${type}">`;

  return {
    closeText: INTERRUPTED_ACTION_CLOSE,
    historyText,
    instruction:
      `Your previous response was cut off by a network problem while writing ${what}; that partial action was discarded. ` +
      `Continue the same response, still inside the open <boltArtifact>: start immediately with ${redo}, ` +
      'then the remaining actions you had planned, then close the artifact. ' +
      'Do not write any text before it, do not start a new <boltArtifact>, and do not repeat actions that were already completed.',
  };
}
