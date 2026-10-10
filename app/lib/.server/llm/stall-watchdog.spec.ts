import { describe, expect, it } from 'vitest';
import { planStallRetry } from './stall-watchdog';
import { INTERRUPTED_ACTION_MARKER } from '~/utils/interrupted-action';

const CONTINUE = 'Continue your prior response.';

describe('planStallRetry', () => {
  it('redoes the file that was being written instead of resuming mid-file', () => {
    const done = '<boltArtifact id="a" title="Site"><boltAction type="file" filePath="src/A.tsx">a</boltAction>';
    const partial = '<boltAction type="file" filePath="src/components/AiGrowth.tsx">import { useEf';
    const plan = planStallRetry(done + partial, done + partial, CONTINUE);

    expect(plan.closeText).toContain(INTERRUPTED_ACTION_MARKER);
    expect(plan.closeText).toContain('</boltAction>');
    expect(plan.historyText).toBe(done); // the model doesn't see the broken half-file
    expect(plan.instruction).toContain('COMPLETE `src/components/AiGrowth.tsx`');
    expect(plan.instruction).toContain('do not start a new <boltArtifact>');
  });

  it('redoes an interrupted edit as a whole edit', () => {
    const text = '<boltArtifact id="a" title="x"><boltAction type="edit" filePath="src/Hero.tsx"><<<<<<< SEARCH\n<h1>';
    const plan = planStallRetry(text, text, CONTINUE);

    expect(plan.instruction).toContain('same edit to `src/Hero.tsx`');
  });

  it('only trims the part of the action inside the stalled segment', () => {
    const earlier = 'intro <boltAction type="file" filePath="src/B.tsx">part one ';
    const segment = 'part two';
    const plan = planStallRetry(earlier + segment, segment, CONTINUE);

    expect(plan.closeText).not.toBe('');
    expect(plan.historyText).toBe(segment);
  });

  it('just continues when the stall was outside any action', () => {
    const text = '<boltArtifact id="a" title="x"><boltAction type="file" filePath="a">x</boltAction>Now I will';
    const plan = planStallRetry(text, text, CONTINUE);

    expect(plan).toEqual({ closeText: '', historyText: text, instruction: CONTINUE });
  });
});
