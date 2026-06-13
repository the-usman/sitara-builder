export interface SkillContext {
  cwd: string;
  supabase?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: { anonKey?: string; supabaseUrl?: string };
  };
}

export interface PromptSkill {
  /** Unique kebab-case identifier, also shown to the model in the skills catalog */
  name: string;

  /** One-line summary shown in the <available_skills> catalog */
  description: string;

  /** Matched (case-insensitive) against the recent user messages to decide loading */
  triggers: RegExp;

  /**
   * Fallback only (used when the LLM router is unavailable): load on the first
   * message(s) of a new chat regardless of triggers.
   */
  defaultOnFirstMessage?: boolean;

  /**
   * Fallback only (used when the LLM router is unavailable): force-load based on
   * runtime context (e.g. Supabase is connected).
   */
  isNeeded?: (ctx: SkillContext) => boolean;

  /** Unconditionally load on every request, even when the router selects nothing */
  alwaysLoad?: boolean;

  /** Full prompt section for this skill */
  body: (ctx: SkillContext) => string;
}
