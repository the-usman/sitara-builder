import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '~/lib/skills.server';
import { selectSkills, type PromptSkill, type SkillContext } from '~/lib/common/prompts/skills';

const ctx: SkillContext = { cwd: '/home/project' };

describe('parseSkillMd (Claude SKILL.md compatibility)', () => {
  it('parses YAML frontmatter name/description and body', () => {
    const parsed = parseSkillMd(`---
name: pdf-processing
description: Extract text and tables from PDF files.
license: MIT
---

# PDF Processing

Use pdf-lib for manipulation.`);
    expect(parsed.name).toBe('pdf-processing');
    expect(parsed.description).toBe('Extract text and tables from PDF files.');
    expect(parsed.body).toContain('Use pdf-lib');
  });

  it('falls back to heading and first line when frontmatter is missing', () => {
    const parsed = parseSkillMd(`# Brand Guidelines\n\nAlways use the company palette.`);
    expect(parsed.name).toBe('brand-guidelines');
    expect(parsed.description).toBe('Always use the company palette.');
  });

  it('normalizes names to kebab-case and respects custom triggers', () => {
    const parsed = parseSkillMd(`---
name: My PDF Skill!
description: d
triggers: pdf|invoice
---
body`);
    expect(parsed.name).toBe('my-pdf-skill');
    expect(parsed.triggers).toBe('pdf|invoice');
  });

  it('rejects empty bodies and invalid trigger regexes', () => {
    expect(() => parseSkillMd(`---\nname: x\ndescription: d\n---\n`)).toThrow();
    expect(() => parseSkillMd(`---\nname: x\ndescription: d\ntriggers: (((\n---\nbody`)).toThrow();
  });
});

describe('custom skills in selection', () => {
  const customSkill: PromptSkill = {
    name: 'pdf-processing',
    description: 'PDF skill',
    triggers: /\bpdf\b/i,
    body: () => '<pdf_processing_skill>rules</pdf_processing_skill>',
  };

  it('loads a custom skill when its trigger matches', () => {
    const selected = selectSkills(['a', 'b', 'c', 'extract this PDF'], ctx, [customSkill]);
    expect(selected.map((s) => s.name)).toContain('pdf-processing');
  });

  it('does not load a custom skill without a trigger match', () => {
    const selected = selectSkills(['a', 'b', 'c', 'change the title'], ctx, [customSkill]);
    expect(selected.map((s) => s.name)).not.toContain('pdf-processing');
  });

  it('includes custom skills in the legacy load-everything path', () => {
    const selected = selectSkills(undefined, ctx, [customSkill]);
    expect(selected.map((s) => s.name)).toContain('pdf-processing');
  });
});
