import type { PromptSkill } from './types';

/*
 * Loaded when the app generated images with fal.ai before the message was sent (the user approved
 * them in ReferenceAssetsDialog — see utils/reference-assets.ts, which writes the note this skill
 * is force-triggered by). Those images are the user's explicit choice and beat stock photos.
 */
export const GENERATED_IMAGES_NOTE = 'AI-generated images are hosted and listed';

export const generatedImagesSkill: PromptSkill = {
  name: 'generated-images',
  description:
    'Using AI-generated images (backgrounds, hero art, photos) listed in the message as hosted URLs — they replace stock photos.',
  triggers: /ai-generated images are hosted and listed|public\/generated\//,
  forceTriggers: /ai-generated images are hosted and listed/,
  body: () => `
<generated_images_skill>
  The user asked for AI-generated images and approved them. They are ALREADY hosted and listed in the
  message as "<url> — <purpose>". Each <url> is either an https:// hosted URL or a "/generated/<name>.png"
  project path — use it exactly as given.

  Rules (these override the stock-photo, Unsplash, Pexels and picsum guidance elsewhere):
  - Put every listed image where its purpose says (hero background, section background, feature
    photo…). Use the exact URL, e.g. an https:// URL directly, or "/generated/hero-background.png".
    Do not rename, move or re-host them.
  - When a design reference was uploaded, these images were generated from that reference
    (image-to-image) — treat them as the authoritative match for the photos/artwork in the design.
  - Never replace a generated image with a stock photo, an Unsplash/Pexels/picsum URL or a gradient.
    Do not search for or link other photos for those spots. Stock photos are only acceptable for
    other image slots the list does not cover.
  - Do not create, overwrite or delete files under public/generated/ — they are binary images.
  - Backgrounds: Tailwind \`bg-[url(<url>)] bg-cover bg-center\` on the section, or an absolutely
    positioned \`<img src="<url>" class="absolute inset-0 h-full w-full object-cover" alt="" />\`
    behind the content. Add a dark or brand-colored overlay (e.g. \`bg-black/40\` or a gradient)
    wherever text sits on the image so it stays readable.
  - Content photos: \`<img src="<url>" alt="<meaningful description>" class="object-cover" />\` with
    the aspect ratio of the slot.
  - In the final message, say which generated image went where.
</generated_images_skill>
`,
};
