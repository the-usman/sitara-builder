import { describe, expect, it } from 'vitest';
import { selectSkills } from '~/lib/common/prompts/skills';
import {
  asksForGeneratedImages,
  describeGeneratedAssets,
  extractEnhancerImagePlan,
  MAX_PROPOSED_ASSETS,
  parseAssetPlan,
  stripEnhancerImagePlan,
} from './reference-assets';

describe('asksForGeneratedImages', () => {
  it('spots requests for AI-generated images', () => {
    expect(asksForGeneratedImages('generate the image for websites')).toBe(true);
    expect(asksForGeneratedImages('Build a spa site and generate a hero background with AI')).toBe(true);
    expect(asksForGeneratedImages('create a website, and generate images for it')).toBe(true);
    expect(asksForGeneratedImages('use ai images for the sections')).toBe(true);
    expect(asksForGeneratedImages('make the hero with flux')).toBe(true);
  });

  it('ignores ordinary site requests', () => {
    expect(asksForGeneratedImages('generate a website with photos of food')).toBe(false);
    expect(asksForGeneratedImages('build a bakery landing page with images')).toBe(false);
    expect(asksForGeneratedImages('Generate a landing page. Add images of cakes.')).toBe(false);
  });
});

describe('enhancer image plan', () => {
  const block =
    '<generated_images>{"images":[{"name":"hero-background","purpose":"Hero background","prompt":"Misty pine forest at dawn, no text","size":"1792x1024"}]}</generated_images>';

  it('splits the refined prompt from the proposed images', () => {
    const { text, images } = extractEnhancerImagePlan(`## Build\nA cabin rental site.\n\n${block}\n`);

    expect(text).toBe('## Build\nA cabin rental site.');
    expect(images).toHaveLength(1);
    expect(images[0].name).toBe('hero-background');
  });

  it('hides a block that is still streaming in, and keeps text appended after it', () => {
    expect(stripEnhancerImagePlan('Prompt\n\n<generated_images>{"images":[{"na')).toBe('Prompt');
    expect(stripEnhancerImagePlan(`Prompt\n${block}\n\n---\n\n## VERIFIED IMAGE URLS`)).toBe(
      'Prompt\n\n---\n\n## VERIFIED IMAGE URLS',
    );
    expect(extractEnhancerImagePlan('Just a prompt').images).toEqual([]);
  });
});

describe('parseAssetPlan', () => {
  it('reads the JSON even with a code fence and chatter around it', () => {
    const raw =
      'Sure!\n```json\n{"images":[{"name":"Hero Background","purpose":"Hero background","prompt":"Dusky city skyline, purple haze, no text","size":"1792x1024"}]}\n```';

    expect(parseAssetPlan(raw)).toEqual([
      {
        name: 'hero-background',
        purpose: 'Hero background',
        prompt: 'Dusky city skyline, purple haze, no text',
        size: '1792x1024',
      },
    ]);
  });

  it('fixes bad sizes, duplicate names and drops entries without a prompt', () => {
    const raw = JSON.stringify({
      images: [
        { name: 'bg', prompt: 'a', size: '800x600' },
        { name: 'bg', prompt: 'b', size: '1024x1024' },
        { name: 'empty', prompt: '  ' },
      ],
    });
    const plan = parseAssetPlan(raw);

    expect(plan.map((p) => p.name)).toEqual(['bg', 'bg-2']);
    expect(plan[0].size).toBe('1792x1024');
  });

  it('caps the number of images and survives garbage', () => {
    const many = { images: Array.from({ length: 9 }, (_, i) => ({ name: `i${i}`, prompt: 'x' })) };

    expect(parseAssetPlan(JSON.stringify(many))).toHaveLength(MAX_PROPOSED_ASSETS);
    expect(parseAssetPlan('no json here')).toEqual([]);
    expect(parseAssetPlan('{"images": "nope"}')).toEqual([]);
  });
});

describe('describeGeneratedAssets', () => {
  it('gives the builder the exact public URLs', () => {
    const note = describeGeneratedAssets([{ name: 'hero-background', purpose: 'Hero background' }]);

    expect(note).toContain('/generated/hero-background.png — Hero background');
    expect(describeGeneratedAssets([])).toBe('');
  });

  it('lists the hosted URL, not a local path, when the image was uploaded', () => {
    const note = describeGeneratedAssets([
      {
        name: 'hero-background',
        purpose: 'Hero background',
        url: 'https://res.cloudinary.com/demo/image/upload/hero.png',
      },
    ]);

    expect(note).toContain('https://res.cloudinary.com/demo/image/upload/hero.png — Hero background');
    expect(note).not.toContain('/generated/hero-background.png');
  });

  it('loads the generated-images skill even when the router did not pick it', () => {
    const note = describeGeneratedAssets([{ name: 'hero-background', purpose: 'Hero background' }]);
    const loaded = selectSkills([`Build a cabin site${note}`], { cwd: '/home/project' }, [], ['internet-assets']);

    expect(loaded.map((skill) => skill.name)).toContain('generated-images');
  });

  it('loads the generated-images skill for a hosted-URL note too', () => {
    const note = describeGeneratedAssets([{ name: 'hero', purpose: 'Hero', url: 'https://cdn.example.com/a.png' }]);
    const loaded = selectSkills([`Build a site${note}`], { cwd: '/home/project' }, [], ['internet-assets']);

    expect(loaded.map((skill) => skill.name)).toContain('generated-images');
  });
});
