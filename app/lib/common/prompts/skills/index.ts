import type { PromptSkill, SkillContext } from './types';
import { uiUxDesignSkill } from './ui-ux-design';
import { threejs3dSkill } from './threejs-3d';
import { spline3dSkill } from './spline-3d';
import { internetAssetsSkill } from './internet-assets';
import { databaseSupabaseSkill } from './database-supabase';
import { fullstackSkill } from './fullstack';
import { mobileAppSkill } from './mobile-app';
import { cavemanSkill } from './caveman';
import { designReferenceSkill } from './design-reference';
import { generatedImagesSkill } from './generated-images';

export type { PromptSkill, SkillContext } from './types';

/**
 * Registry of all prompt skills. To add a new skill (like Claude Code skills),
 * create a file in this folder exporting a PromptSkill and add it here.
 */
export const promptSkills: PromptSkill[] = [
  uiUxDesignSkill,
  threejs3dSkill,
  spline3dSkill,
  internetAssetsSkill,
  databaseSupabaseSkill,
  fullstackSkill,
  mobileAppSkill,
  cavemanSkill,
  designReferenceSkill,
  generatedImagesSkill,
];

/**
 * Decide which skills to load for this request.
 * - No message info (legacy callers): load everything — never degrade silently.
 * - isNeeded(ctx): runtime signals (e.g. Supabase connected) force-load a skill.
 * - First message(s) of a chat: load defaultOnFirstMessage skills (new builds need
 *   design/assets even when the user never says "design"). <= 2 covers the starter
 *   template flow, which injects a hidden second user message.
 * - Otherwise: regex triggers against the last 3 user messages.
 */
export function selectSkills(
  userMessages: string[] | undefined,
  ctx: SkillContext,
  customSkills: PromptSkill[] = [],
  llmSelected?: string[],
  disabledSkills: string[] = [],
): PromptSkill[] {
  // Disabled skills are dead to every path: router picks, alwaysLoad, fallbacks
  const allSkills = [...promptSkills, ...customSkills].filter((skill) => !disabledSkills.includes(skill.name));

  if (!userMessages || userMessages.length === 0) {
    return allSkills;
  }

  /*
   * When the LLM router ran, trust it fully: its picks + alwaysLoad skills, nothing
   * else. Forcing extras (first-message defaults, Supabase-connected) on top wastes
   * thousands of tokens on trivial messages like "hello" — the router already saw
   * the catalog (with runtime hints) and decided.
   */
  const recentText = userMessages.slice(-3).join('\n').toLowerCase();
  const forced = (skill: PromptSkill) => Boolean(skill.forceTriggers?.test(recentText));

  if (llmSelected) {
    return allSkills.filter((skill) => skill.alwaysLoad || forced(skill) || llmSelected.includes(skill.name));
  }

  // Fallback path (router failed): regex triggers + first-message defaults + context forces
  const isFirstMessage = userMessages.length <= 2;

  return allSkills.filter(
    (skill) =>
      skill.alwaysLoad ||
      skill.isNeeded?.(ctx) ||
      (isFirstMessage && skill.defaultOnFirstMessage) ||
      skill.triggers.test(recentText),
  );
}

/** Catalog shown to the model so it knows which skills exist and which are loaded. */
export function skillsCatalog(
  active: PromptSkill[],
  customSkills: PromptSkill[] = [],
  disabledSkills: string[] = [],
): string {
  return [...promptSkills, ...customSkills]
    .filter((skill) => !disabledSkills.includes(skill.name))
    .map((skill) => `  - ${skill.name}${active.includes(skill) ? ' (loaded below)' : ''}: ${skill.description}`)
    .join('\n');
}
