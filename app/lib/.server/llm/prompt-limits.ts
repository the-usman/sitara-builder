import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('prompt-limits');

/*
 * Rough budgets in characters (~4 chars per token). Providers reject oversized prompts outright
 * ("prompt is too long: 10581439 tokens > 1000000"), and even when accepted, huge prompts are slow
 * and expensive — so everything that goes into a request is capped here.
 */

/** Total budget for the conversation history sent with a request (~100k tokens). */
export const MAX_HISTORY_CHARS = 400_000;

/** Any single older message beyond this is truncated in the middle. */
export const MAX_OLD_MESSAGE_CHARS = 40_000;

/** The message being answered gets a larger allowance. */
export const MAX_LAST_MESSAGE_CHARS = 120_000;

/** A single file inlined into the context buffer. */
export const MAX_CONTEXT_FILE_CHARS = 40_000;

/** All files inlined into the context buffer together (~75k tokens). */
export const MAX_CONTEXT_CHARS = 300_000;

// An attached image costs tokens but its base64 is not text, so count it as a small fixed size.
const IMAGE_COST_CHARS = 6_000;

export function truncateText(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  const head = Math.floor(max * 0.7);
  const tail = max - head;
  const omitted = text.length - max;

  return `${text.slice(0, head)}\n\n[... ${omitted} characters omitted to keep the prompt small ...]\n\n${text.slice(-tail)}`;
}

function isImagePart(part: any): boolean {
  return part?.type === 'image' || part?.type === 'image_url' || part?.type === 'file';
}

function messageCost(message: { content: any }): number {
  const { content } = message;

  if (typeof content === 'string') {
    return content.length;
  }

  if (!Array.isArray(content)) {
    return 0;
  }

  return content.reduce((sum: number, part: any) => sum + (isImagePart(part) ? IMAGE_COST_CHARS : (part?.text?.length ?? 0)), 0);
}

/**
 * Makes a message list safe to send:
 *  - images/attachments are kept only on the last user message (older ones are replaced by a note),
 *  - oversized messages are truncated in the middle,
 *  - the oldest messages are dropped until the history fits the budget (the last message is always kept,
 *    and the list always starts with a user message, as providers require).
 */
export function limitMessages<T extends { role: string; content: any }>(
  messages: T[],
  maxChars: number = MAX_HISTORY_CHARS,
): T[] {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');

  let limited = messages.map((message, index) => {
    const isLast = index === messages.length - 1 || index === lastUserIndex;
    const maxText = isLast ? MAX_LAST_MESSAGE_CHARS : MAX_OLD_MESSAGE_CHARS;
    const { content } = message;

    if (typeof content === 'string') {
      return content.length > maxText ? { ...message, content: truncateText(content, maxText) } : message;
    }

    if (!Array.isArray(content)) {
      return message;
    }

    const parts = content.map((part: any) => {
      if (isImagePart(part)) {
        return index === lastUserIndex ? part : { type: 'text', text: '[image omitted from earlier message]' };
      }

      return typeof part?.text === 'string' && part.text.length > maxText
        ? { ...part, text: truncateText(part.text, maxText) }
        : part;
    });

    return { ...message, content: parts };
  });

  let total = limited.reduce((sum, message) => sum + messageCost(message), 0);
  const originalCount = limited.length;

  while (total > maxChars && limited.length > 1) {
    total -= messageCost(limited[0]);
    limited = limited.slice(1);
  }

  // Providers require the conversation to open with a user turn.
  while (limited.length > 1 && limited[0].role !== 'user') {
    total -= messageCost(limited[0]);
    limited = limited.slice(1);
  }

  if (limited.length < originalCount) {
    logger.warn(`Dropped ${originalCount - limited.length} oldest message(s) to fit the prompt budget (~${Math.round(total / 4)} tokens)`);
  }

  return limited;
}
