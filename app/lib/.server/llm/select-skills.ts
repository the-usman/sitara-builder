import { generateText, type LanguageModelV1 } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('select-skills');

// Keep the router call tiny: short message excerpts, near-zero output tokens
const MAX_MESSAGE_CHARS = 600;
const MAX_USER_MESSAGES = 4;
const ROUTER_TIMEOUT_MS = 6000;

/**
 * Ask a small LLM call to decide which skills the main response needs.
 * The model only sees the catalog (name + short description) and the recent
 * user messages — it returns a JSON array of skill names.
 *
 * Returns undefined when the router fails, so callers can fall back to
 * regex-trigger selection.
 */
export async function selectSkillsViaLLM(props: {
  model: LanguageModelV1;
  userMessages: string[];
  catalog: Array<{ name: string; description: string }>;
}): Promise<string[] | undefined> {
  const { model, userMessages, catalog } = props;

  if (catalog.length === 0) {
    return [];
  }

  const recent = userMessages
    .slice(-MAX_USER_MESSAGES)
    .map((m) => `- ${m.length > MAX_MESSAGE_CHARS ? `${m.slice(0, MAX_MESSAGE_CHARS)}…` : m}`)
    .join('\n');

  const catalogText = catalog.map((s) => `- ${s.name}: ${s.description}`).join('\n');

  try {
    const result = await generateText({
      model,
      maxTokens: 120,
      temperature: 0,

      // The router runs before the answer starts streaming — never let it hold the response up.
      abortSignal: AbortSignal.timeout(ROUTER_TIMEOUT_MS),
      system:
        'You route which specialized instruction modules ("skills") an AI website builder needs to answer the next user request. ' +
        'Reply ONLY with a JSON array of skill names, e.g. ["ui-ux-design","threejs-3d"]. ' +
        'Select every skill that is relevant to what the user wants next (be generous with directly relevant ones), and none that are not. ' +
        'An empty array [] is a valid answer for trivial requests like fixing a typo.',
      prompt: `Available skills:\n${catalogText}\n\nRecent user messages (latest last):\n${recent}\n\nWhich skills should be loaded?`,
    });

    const match = result.text.match(/\[[\s\S]*?\]/);

    if (!match) {
      logger.warn(`Skill router returned no JSON array: ${result.text.slice(0, 200)}`);
      return undefined;
    }

    const parsed = JSON.parse(match[0]);

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const validNames = new Set(catalog.map((s) => s.name));
    const selected = parsed.filter((n): n is string => typeof n === 'string' && validNames.has(n));

    logger.info(`Skill router selected: [${selected.join(', ')}] (${result.usage?.totalTokens ?? '?'} router tokens)`);

    return selected;
  } catch (error) {
    logger.error('Skill router failed, falling back to trigger matching', error);
    return undefined;
  }
}
