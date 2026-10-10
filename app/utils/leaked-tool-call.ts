/*
 * Some tool-trained models (seen with moonshotai/kimi-k3 via TokenGo) occasionally mistake the
 * <boltArtifact> format for a function call and emit their native tool-call tokens instead, e.g.
 *   <|open|>tools<|sep|><|open|>call tool="boltArtifact" …<|close|>call<|sep|>…
 * The provider then ends the reply there, so no files are written. The server detects this and
 * asks the model to continue in plain text; the chat hides the leaked tokens.
 */

/** Native chat-template control tokens: <|open|>, <|sep|>, <|close|>, <|im_start|>, <|tool_call_begin|>… */
const CONTROL_TOKEN = /<\|[a-z_]+\|>/i;

export function hasLeakedToolCall(text: string): boolean {
  return CONTROL_TOKEN.test(text) && /\b(tools?|call|tool_call)\b/i.test(text);
}

/** The reply up to where the model switched into tool-call tokens. */
export function stripLeakedToolCall(text: string): string {
  const index = text.search(CONTROL_TOKEN);
  return index === -1 ? text : text.slice(0, index).trimEnd();
}

export const TOOL_CALL_RETRY_PROMPT = `Your previous reply tried to call a tool named "boltArtifact", but there are NO tools or function calls available here, so nothing was created.
Continue your reply now by writing the complete <boltArtifact id="..." title="..."> ... </boltArtifact> block as plain text inside your message, with every <boltAction> exactly in the XML format from your instructions.
Do not repeat the sentence you already wrote, do not apologise, and never use tool-call syntax.`;

/** Removes leaked tool-call token runs from text shown in the chat (the retry writes the real artifact after them). */
export function hideLeakedToolCalls(text: string): string {
  return text.replace(/<\|[a-z_]+\|>[\s\S]*<\|[a-z_]+\|>/gi, '');
}
