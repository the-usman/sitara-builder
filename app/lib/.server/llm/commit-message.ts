import { generateText } from 'ai';
import { PROVIDER_LIST } from '~/utils/constants';
import { getApiKeysFromCookie, getProviderSettingsFromCookie, parseCookies } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('commit-message');

const MAX_PROMPT_CHARS = 800;
const MAX_LISTED_FILES = 25;
const GENERATION_TIMEOUT_MS = 10_000;

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified';
}

export function fallbackCommitMessage(changes: ChangedFile[]): string {
  const added = changes.filter((c) => c.status === 'added').length;
  const modified = changes.length - added;
  const parts = [added ? `${added} added` : '', modified ? `${modified} modified` : ''].filter(Boolean);

  return `Update website (${parts.join(', ') || 'no changes'})`;
}

/** Keeps the model's output to a clean git message: no fences/quotes, subject <= 72 chars. */
function cleanMessage(text: string): string | undefined {
  const cleaned = text
    .replace(/^```[a-z]*\n?|```$/gim, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  if (!cleaned) {
    return undefined;
  }

  const [subject, ...rest] = cleaned.split('\n');
  const trimmedSubject = subject.trim().replace(/^(commit message|subject):\s*/i, '');

  const finalSubject = trimmedSubject.length > 72 ? `${trimmedSubject.slice(0, 69).trimEnd()}...` : trimmedSubject;
  const body = rest.join('\n').trim();

  return body ? `${finalSubject}\n\n${body.slice(0, 600)}` : finalSubject;
}

/**
 * Asks the user's currently selected model (cookies `selectedProvider` / `selectedModel`, the same ones
 * the chat uses) to describe what a sync changed. Never throws: any failure returns the plain fallback
 * message so a slow or misconfigured model can't block the GitHub push.
 */
export async function generateCommitMessage(props: {
  request: Request;
  serverEnv: any;
  userPrompt?: string;
  changes: ChangedFile[];
}): Promise<string> {
  const { request, serverEnv, userPrompt, changes } = props;
  const fallback = fallbackCommitMessage(changes);

  try {
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseCookies(cookieHeader);
    const providerInfo = PROVIDER_LIST.find((p) => p.name === cookies.selectedProvider);
    const model = cookies.selectedModel;

    if (!providerInfo || !model) {
      return fallback;
    }

    const fileList = changes
      .slice(0, MAX_LISTED_FILES)
      .map((c) => `- ${c.status}: ${c.path}`)
      .join('\n');
    const extra = changes.length > MAX_LISTED_FILES ? `\n- ...and ${changes.length - MAX_LISTED_FILES} more files` : '';
    const prompt = (userPrompt || '').slice(0, MAX_PROMPT_CHARS);

    const result = await generateText({
      model: providerInfo.getModelInstance({
        model,
        serverEnv,
        apiKeys: getApiKeysFromCookie(cookieHeader),
        providerSettings: getProviderSettingsFromCookie(cookieHeader),
      }),
      maxTokens: 150,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      system:
        'You write git commit messages for an AI website builder. Reply with ONLY the commit message: ' +
        'a concise imperative subject line (max 72 chars, e.g. "Add pricing section to landing page"), ' +
        'optionally followed by a blank line and 1-3 short "- " bullets. ' +
        'Describe what changed for the website from the user\'s point of view. No quotes, no markdown fences, no preamble.',
      prompt: `The user asked:\n${prompt || '(not available)'}\n\nFiles changed in this version:\n${fileList}${extra}\n\nCommit message:`,
    });

    return cleanMessage(result.text) ?? fallback;
  } catch (error) {
    logger.warn(`Commit message generation failed, using fallback: ${error instanceof Error ? error.message : error}`);
    return fallback;
  }
}
