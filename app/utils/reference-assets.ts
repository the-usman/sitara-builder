import { GENERATED_IMAGES_NOTE } from '~/lib/common/prompts/skills/generated-images';

/*
 * Images generated with fal.ai to match a reference screenshot (hero/section backgrounds, photos).
 * The AI proposes them from the reference, the user approves them, and they are saved under
 * public/generated/ before the build message goes out (see ReferenceAssetsDialog).
 */

export type AssetSize = '1792x1024' | '1024x1024' | '1024x1792' | '1365x1024';

export const ASSET_SIZES: Record<AssetSize, string> = {
  '1792x1024': 'Wide 16:9',
  '1365x1024': 'Landscape 4:3',
  '1024x1024': 'Square',
  '1024x1792': 'Tall 9:16',
};

export interface ProposedAsset {
  // short kebab-case name, used for the file name
  name: string;

  // where it goes on the page, e.g. "Hero background"
  purpose: string;
  prompt: string;
  size: AssetSize;
}

export const PUBLIC_ASSET_DIR = 'generated';

// Images per reference: more is slow, costly, and rarely needed.
export const MAX_PROPOSED_ASSETS = 5;

export const ASSET_PLAN_SYSTEM_PROMPT = `You look at a website reference screenshot and decide which raster images must be generated so a rebuilt site can match it.

Include ONLY photographic or illustrated imagery that cannot be made with CSS: hero/section background photos or artwork, large feature photos, textured or painted backgrounds, illustrations.
Do NOT include: logos, icons, UI screenshots or dashboards (those are built in code), plain colors, gradients, simple patterns, text, avatars of real people, or anything already covered by another item.
If the screenshot has no such imagery (for example a plain UI, a dashboard, or a bug screenshot), return an empty list.

For each image, write a detailed generation prompt (40-80 words) that reproduces what is in the reference: subject, composition and framing, camera angle, lighting, mood, color palette (name the dominant colors, with hex codes where you can read them), style (photo, 3D render, illustration, abstract). Never include text, words, letters, logos or UI in the image prompt — say "no text". For backgrounds that have content laid over them, keep the area where the text sits calm and uncluttered and say where.

Reply with ONLY JSON, no other text:
{"images":[{"name":"hero-background","purpose":"Hero section background","prompt":"...","size":"1792x1024"}]}
"size" is one of "1792x1024" (wide backgrounds, banners), "1365x1024" (landscape photos), "1024x1024" (square), "1024x1792" (tall/portrait). At most ${MAX_PROPOSED_ASSETS} images.`;

/*
 * The prompt enhancer, when a fal.ai key is configured, also decides which sections deserve an
 * AI-generated background or photo and lists them in this block after the refined prompt. The
 * client strips the block from the textarea and asks the user before generating anything.
 */
export const ENHANCER_IMAGES_TAG = 'generated_images';

export const ENHANCER_IMAGE_INSTRUCTIONS = `AI IMAGE GENERATION IS AVAILABLE for this project (fal.ai). Besides the refined prompt, decide which parts of the site should use a custom generated image instead of a stock photo — most often the hero background, and section backgrounds, banners or large feature photos where a bespoke image clearly lifts the design. If reference images are attached, pick the imagery they show (backgrounds, photos, artwork) so the generated images match them.
Only raster imagery that CSS cannot make: no logos, icons, UI screenshots, plain colors, gradients, simple patterns, text, or real people's faces. Prefer fewer, high-impact images (usually 1-3, never more than ${MAX_PROPOSED_ASSETS}). If nothing benefits from one, use an empty list.

After the refined prompt, on its own lines at the very end, output EXACTLY this block and nothing after it:
<${ENHANCER_IMAGES_TAG}>{"images":[{"name":"hero-background","purpose":"Hero section background","prompt":"...","size":"1792x1024"}]}</${ENHANCER_IMAGES_TAG}>
Each "prompt" is a detailed 40-80 word image-generation prompt: subject, composition, camera angle, lighting, mood, color palette with hex codes matching the site's palette, style (photo, 3D render, illustration, abstract), and "no text". For backgrounds with content over them, keep the area behind the text calm and say where it is.
"size" is one of "1792x1024" (wide backgrounds, banners), "1365x1024" (landscape photos), "1024x1024" (square), "1024x1792" (tall/portrait).
The user approves these images before they are generated, so the refined prompt itself must still work without them: keep the normal image instructions there and do not mention this block or /generated/ paths.`;

const ENHANCER_BLOCK_PATTERN = new RegExp(`<${ENHANCER_IMAGES_TAG}>([\\s\\S]*?)(?:</${ENHANCER_IMAGES_TAG}>|$)`, 'i');

/** Hides the enhancer's image block from what the user sees, also while it is still streaming in. */
export function stripEnhancerImagePlan(text: string): string {
  return text
    .replace(ENHANCER_BLOCK_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The refined prompt without the image block, plus the images it proposed. */
export function extractEnhancerImagePlan(text: string): { text: string; images: ProposedAsset[] } {
  const block = text.match(ENHANCER_BLOCK_PATTERN)?.[1];

  return { text: stripEnhancerImagePlan(text), images: block ? parseAssetPlan(block) : [] };
}

// No reference image: plan from the request alone (the user asked for generated images in words).
export const TEXT_ASSET_PLAN_SYSTEM_PROMPT = `You plan the custom images for a website the user described. They asked for AI-generated images, so propose the ones that lift the design most — usually the hero background, plus section backgrounds, banners or large feature photos the site needs.
Only raster imagery that CSS cannot make: no logos, icons, UI screenshots, plain colors, gradients, simple patterns, text, or real people's faces. Prefer 1-3 high-impact images, never more than ${MAX_PROPOSED_ASSETS}. If the user named specific images, include exactly those.

For each image, write a detailed generation prompt (40-80 words): subject, composition and framing, camera angle, lighting, mood, a color palette that fits the brand (hex codes), style (photo, 3D render, illustration, abstract), and "no text". For backgrounds with content over them, keep the area behind the text calm and say where.

Reply with ONLY JSON, no other text:
{"images":[{"name":"hero-background","purpose":"Hero section background","prompt":"...","size":"1792x1024"}]}
"size" is one of "1792x1024" (wide backgrounds, banners), "1365x1024" (landscape photos), "1024x1024" (square), "1024x1792" (tall/portrait).`;

/** The user asked, in words, for AI-generated images (rather than stock photos). */
export function asksForGeneratedImages(message: string): boolean {
  const text = message.toLowerCase();

  // "generate … images", but not "generate a website with photos" (that asks for a site)
  const generateImages = Array.from(text.matchAll(/\b(?:generate|generated|generating|genrate|genarate)\b/g)).some(
    (match) => {
      const after = text.slice(match.index! + match[0].length).split(/[.\n]/)[0];
      const image = after.match(/\b(?:images?|backgrounds?|photos?|pictures?|illustrations?|artwork|visuals?)\b/);

      return (
        !!image && image.index! <= 60 && !/\b(web\s?site|site|page|app|landing)\b/.test(after.slice(0, image.index))
      );
    },
  );

  return (
    generateImages ||
    /\bai[- ](generated\s+)?(images?|backgrounds?|photos?|art)\b/.test(text) ||
    /\b(fal|flux)\b/.test(text)
  );
}

function toFileName(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return slug || `image-${index + 1}`;
}

/** Reads the model's JSON reply leniently (code fences, chatter around it, bad fields). */
export function parseAssetPlan(raw: string): ProposedAsset[] {
  const json = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').match(/\{[\s\S]*\}/)?.[0];

  if (!json) {
    return [];
  }

  let images: unknown;

  try {
    images = JSON.parse(json)?.images;
  } catch {
    return [];
  }

  if (!Array.isArray(images)) {
    return [];
  }

  const seen = new Set<string>();

  return images
    .filter((image) => image && typeof image.prompt === 'string' && image.prompt.trim())
    .slice(0, MAX_PROPOSED_ASSETS)
    .map((image, index) => {
      let name = toFileName(String(image.name ?? image.purpose ?? ''), index);

      while (seen.has(name)) {
        name = `${name}-${index + 1}`;
      }

      seen.add(name);

      return {
        name,
        purpose: String(image.purpose || name).slice(0, 80),
        prompt: String(image.prompt).trim(),
        size: (image.size in ASSET_SIZES ? image.size : '1792x1024') as AssetSize,
      };
    });
}

/** Tells the builder model which generated images exist and where to use them. */
export function describeGeneratedAssets(assets: Array<Pick<ProposedAsset, 'name' | 'purpose'>>): string {
  if (!assets.length) {
    return '';
  }

  const lines = assets.map(
    (asset) =>
      `- /${PUBLIC_ASSET_DIR}/${asset.name}.png — ${asset.purpose} (file: public/${PUBLIC_ASSET_DIR}/${asset.name}.png)`,
  );

  return (
    `\n\n[${GENERATED_IMAGES_NOTE} — use them,` +
    ' with these exact URLs, for the purpose listed (where the reference shows that imagery, if there is one), ' +
    'instead of stock photos or placeholders. Backgrounds go in CSS/Tailwind (e.g. bg-[url(/generated/hero-background.png)] bg-cover bg-center) ' +
    'or an <img> with object-cover; add an overlay if text must stay readable.\n' +
    `${lines.join('\n')}]`
  );
}
