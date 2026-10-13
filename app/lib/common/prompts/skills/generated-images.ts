import type { PromptSkill } from './types';

/*
 * Loaded when the app generated images with fal.ai before the message was sent (the user approved
 * them in ReferenceAssetsDialog — see utils/reference-assets.ts, which writes the note this skill
 * is force-triggered by). Those images are the user's explicit choice and beat stock photos.
 */
export const GENERATED_IMAGES_NOTE = 'AI-generated images are saved in the project';

export const generatedImagesSkill: PromptSkill = {
  name: 'generated-images',
  description:
    'Using AI-generated images (backgrounds, hero art, photos) the app saved to public/generated/ — they replace stock photos.',
  triggers: /ai-generated images are saved in the project|public\/generated\//,
  forceTriggers: /ai-generated images are saved in the project/,
  body: () => `
<generated_images_skill>
  The user asked for AI-generated images and approved them. They are ALREADY saved in the project
  under public/generated/ and listed in the message as "/generated/<name>.png — <purpose>".

  Rules (these override the stock-photo, Unsplash, Pexels and picsum guidance elsewhere):
  - Put every listed image where its purpose says (hero background, section background, feature
    photo…). Use the exact URL, e.g. "/generated/hero-background.png". Do not rename or move files.
  - When a design reference was uploaded, these files were generated from that reference
    (image-to-image) — treat them as the authoritative match for the photos/artwork in the design.
  - Never replace a generated image with a stock photo, an Unsplash/Pexels/picsum URL or a gradient.
    Do not search for or link other photos for those spots. Stock photos are only acceptable for
    other image slots the list does not cover.
  - Do not create, overwrite or delete files in public/generated/ — they are binary images.
  - Backgrounds: Tailwind \`bg-[url(/generated/hero-background.png)] bg-cover bg-center\` on the
    section, or an absolutely positioned \`<img src="/generated/…" class="absolute inset-0 h-full
    w-full object-cover" alt="" />\` behind the content. Add a dark or brand-colored overlay
    (e.g. \`bg-black/40\` or a gradient) wherever text sits on the image so it stays readable.
  - Content photos: \`<img src="/generated/…" alt="<meaningful description>" class="object-cover" />\`
    with the aspect ratio of the slot.
  - In the final message, say which generated image went where.
</generated_images_skill>
`,
};
