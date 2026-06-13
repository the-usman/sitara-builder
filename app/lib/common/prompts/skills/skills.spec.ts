import { describe, expect, it } from 'vitest';
import { promptSkills, selectSkills, type PromptSkill, type SkillContext } from './index';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

const ctx: SkillContext = { cwd: '/home/project' };
const names = (msgs: string[] | undefined, c: SkillContext = ctx) => selectSkills(msgs, c).map((s) => s.name);

describe('prompt skills selection', () => {
  it('loads all skills when no message info is available (legacy callers)', () => {
    expect(names(undefined)).toEqual(promptSkills.map((s) => s.name));
  });

  it('loads default skills on the first message of a new chat', () => {
    const selected = names(['build me a todo app']);
    expect(selected).toContain('ui-ux-design');
    expect(selected).toContain('internet-assets');
    expect(selected).not.toContain('mobile-app');
  });

  it('drops unneeded skills on follow-up messages', () => {
    const selected = names(['build me a todo app', 'add a delete button', 'make the button red', 'fix the bug']);
    expect(selected).not.toContain('threejs-3d');
    expect(selected).not.toContain('mobile-app');
    expect(selected).not.toContain('fullstack');
  });

  it('loads skills via trigger keywords on follow-ups', () => {
    expect(names(['a', 'b', 'c', 'add a 3D globe to the hero'])).toContain('threejs-3d');
    expect(names(['a', 'b', 'c', 'add login with supabase'])).toContain('database-supabase');
    expect(names(['a', 'b', 'c', 'create a backend API endpoint'])).toContain('fullstack');
    expect(names(['a', 'b', 'c', 'make it work on android'])).toContain('mobile-app');
  });

  it('force-loads the database skill when Supabase is connected', () => {
    const connected: SkillContext = { cwd: '/home/project', supabase: { isConnected: true, hasSelectedProject: true } };
    expect(names(['a', 'b', 'c', 'change the title color'], connected)).toContain('database-supabase');
  });

  it('only matches the last 3 user messages', () => {
    expect(names(['add a 3D globe', 'b', 'c', 'd', 'change the title'])).not.toContain('threejs-3d');
  });
});

describe('LLM router selection', () => {
  it('loads router-picked skills even without trigger keywords', () => {
    const selected = selectSkills(['a', 'b', 'c', 'make it stunning'], ctx, [], ['threejs-3d', 'ui-ux-design']);
    const selectedNames = selected.map((s) => s.name);
    expect(selectedNames).toContain('threejs-3d');
    expect(selectedNames).toContain('ui-ux-design');
    expect(selectedNames).not.toContain('mobile-app');
  });

  it('trusts the router fully: no regex, first-message, or Supabase forces on top', () => {
    const connected: SkillContext = { cwd: '/home/project', supabase: { isConnected: true, hasSelectedProject: true } };

    // First message, Supabase connected, "backend" keyword — router still said: nothing needed
    const selected = selectSkills(['hello, what is a backend?'], connected, [], []);
    const selectedNames = selected.map((s) => s.name);
    expect(selectedNames).not.toContain('fullstack');
    expect(selectedNames).not.toContain('database-supabase');
    expect(selectedNames).not.toContain('ui-ux-design');
  });

  it('a plain greeting with an empty router result loads only alwaysLoad skills', () => {
    const selected = selectSkills(['Hello'], ctx, [], []);
    expect(selected.map((s) => s.name)).toEqual(['caveman']);
  });

  it('falls back to defaults and context forces when the router is unavailable', () => {
    const connected: SkillContext = { cwd: '/home/project', supabase: { isConnected: true, hasSelectedProject: true } };
    const selected = selectSkills(['build a todo app'], connected, [], undefined);
    const selectedNames = selected.map((s) => s.name);
    expect(selectedNames).toContain('ui-ux-design'); // first-message default
    expect(selectedNames).toContain('database-supabase'); // Supabase-connected force
  });
});

describe('caveman skill', () => {
  it('is always loaded, even for trivial follow-ups with an empty router result', () => {
    expect(names(['a', 'b', 'c', 'fix the typo'])).toContain('caveman');
    expect(selectSkills(['a', 'b', 'c', 'fix the typo'], ctx, [], []).map((s) => s.name)).toContain('caveman');
  });
});

describe('disabled skills', () => {
  it('never load — not via router picks, alwaysLoad, triggers, or legacy path', () => {
    const disabled = ['caveman', 'threejs-3d'];

    // Router explicitly picked threejs-3d, caveman is alwaysLoad — both still excluded
    const routed = selectSkills(['a', 'b', 'c', 'add a 3D globe'], ctx, [], ['threejs-3d'], disabled);
    expect(routed.map((s) => s.name)).toEqual([]);

    // Regex fallback path
    const fallback = selectSkills(['a', 'b', 'c', 'add a 3D globe'], ctx, [], undefined, disabled);
    expect(fallback.map((s) => s.name)).not.toContain('threejs-3d');
    expect(fallback.map((s) => s.name)).not.toContain('caveman');

    // Legacy load-everything path
    const legacy = selectSkills(undefined, ctx, [], undefined, disabled);
    expect(legacy.map((s) => s.name)).not.toContain('caveman');
  });

  it('also disables custom skills by name', () => {
    const custom: PromptSkill = {
      name: 'pdf-processing',
      description: 'PDF skill',
      triggers: /pdf/i,
      alwaysLoad: true,
      body: () => 'x',
    };
    const selected = selectSkills(['a', 'b', 'c', 'pdf please'], ctx, [custom], undefined, ['pdf-processing']);
    expect(selected.map((s) => s.name)).not.toContain('pdf-processing');
  });
});

describe('getSystemPrompt assembly', () => {
  it('produces a much smaller prompt for simple follow-ups than for legacy full prompt', () => {
    const full = getSystemPrompt('/home/project', undefined, undefined);
    const slim = getSystemPrompt('/home/project', undefined, ['a', 'b', 'c', 'fix the typo in the title']);
    expect(slim.length).toBeLessThan(full.length * 0.4);
  });

  it('always contains the core sections and the skills catalog', () => {
    const slim = getSystemPrompt('/home/project', undefined, ['a', 'b', 'c', 'fix the typo']);
    expect(slim).toContain('<system_constraints>');
    expect(slim).toContain('<artifact_info>');
    expect(slim).toContain('<available_skills>');
    expect(slim).toContain('ui-ux-design');
  });

  it('includes the supabase credentials inside the database skill when connected', () => {
    const prompt = getSystemPrompt(
      '/home/project',
      {
        isConnected: true,
        hasSelectedProject: true,
        credentials: { supabaseUrl: 'https://x.supabase.co', anonKey: 'anon-key' },
      },
      ['a', 'b', 'c', 'add a users table'],
    );
    expect(prompt).toContain('<database_instructions>');
    expect(prompt).toContain('VITE_SUPABASE_URL=https://x.supabase.co');
    expect(prompt).toContain('VITE_SUPABASE_ANON_KEY=anon-key');
  });
});
