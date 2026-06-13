import { getSystemPrompt } from './prompts/prompts';
import type { PromptSkill } from './prompts/skills';
import optimized from './prompts/optimized';
import { getFineTunedPrompt } from './prompts/new-prompt';

export interface PromptOptions {
  cwd: string;
  allowedHtmlElements: string[];
  modificationTagName: string;

  /*
   * Plain-text user messages of the conversation — used to decide which prompt
   * skills to load. When omitted, all skills are loaded (legacy behavior).
   */
  userMessages?: string[];

  /** Admin-imported skills (Claude SKILL.md compatible) merged into skill selection */
  customSkills?: PromptSkill[];

  /** Skill names picked by the LLM router; when set, replaces regex trigger matching */
  llmSelectedSkills?: string[];

  /** Skill names (built-in or custom) the admin disabled — never loaded, never advertised */
  disabledSkills?: string[];
  supabase?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: {
      anonKey?: string;
      supabaseUrl?: string;
    };
  };
}

export class PromptLibrary {
  static library: Record<
    string,
    {
      label: string;
      description: string;
      get: (options: PromptOptions) => string;
    }
  > = {
    default: {
      label: 'Default Prompt',
      description: 'This is the battle tested default system Prompt',
      get: (options) =>
        getSystemPrompt(
          options.cwd,
          options.supabase,
          options.userMessages,
          options.customSkills,
          options.llmSelectedSkills,
          options.disabledSkills,
        ),
    },
    enhanced: {
      label: 'Fine Tuned Prompt',
      description: 'An fine tuned prompt for better results',
      get: (options) => getFineTunedPrompt(options.cwd, options.supabase),
    },
    optimized: {
      label: 'Optimized Prompt (experimental)',
      description: 'an Experimental version of the prompt for lower token usage',
      get: (options) => optimized(options),
    },
  };
  static getList() {
    return Object.entries(this.library).map(([key, value]) => {
      const { label, description } = value;
      return {
        id: key,
        label,
        description,
      };
    });
  }
  static getPropmtFromLibrary(promptId: string, options: PromptOptions) {
    const prompt = this.library[promptId];

    if (!prompt) {
      throw 'Prompt Now Found';
    }

    return this.library[promptId]?.get(options);
  }
}
