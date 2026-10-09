import { describe, expect, it } from 'vitest';
import { describeReferences } from './reference-image';

describe('describeReferences', () => {
  it('tells the model about slices and the sampled palette', () => {
    const note = describeReferences([
      {
        images: ['a', 'b', 'c', 'd'],
        slices: 3,
        width: 1440,
        height: 4800,
        palette: [
          { hex: '#0b1020', share: 61.2 },
          { hex: '#f97316', share: 2.1 },
        ],
      },
    ]);

    expect(note).toContain('[Design reference attached');
    expect(note).toContain('1440×4800px');
    expect(note).toContain('1 overview + 3 full-detail slices');
    expect(note).toContain('#0b1020 (61.2%), #f97316 (2.1%)');
  });

  it('adds nothing when no image was attached', () => {
    expect(describeReferences([])).toBe('');
  });
});
