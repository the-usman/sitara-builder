import { atom } from 'nanostores';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import type { ProviderInfo } from '~/types/model';
import { WORK_DIR } from '~/utils/constants';
import { describeGeneratedAssets, PUBLIC_ASSET_DIR, type ProposedAsset } from '~/utils/reference-assets';

/*
 * Before a message with a reference image is sent: propose images that match it, wait for the
 * user's approval (ReferenceAssetsDialog), generate the approved ones with fal.ai into
 * public/generated/, and return a note for the build message. Nothing is generated unapproved.
 */

export interface ReviewAsset extends ProposedAsset {
  selected: boolean;
  status?: 'generating' | 'done' | 'failed';
  error?: string;

  // data URL, once generated
  preview?: string;
}

export interface ReferenceAssetsState {
  phase: 'planning' | 'review' | 'generating';
  assets: ReviewAsset[];

  /*
   * 'reference': planned from a reference image; 'request': the message asked for generated images;
   * 'enhancer': proposed by the prompt enhancer — approving adds the images to the prompt, it doesn't send
   */
  source?: 'reference' | 'request' | 'enhancer';
}

export const referenceAssets = atom<ReferenceAssetsState | null>(null);

let finish: ((note: string) => void) | undefined;
let planAbort: AbortController | undefined;
let enabled: Promise<boolean> | undefined;

export const NO_FAL_KEY_MESSAGE =
  "You asked for AI-generated images, but no fal.ai key was found, so stock photos will be used. Add FAL_KEY in the admin API keys or the server's .env, then try again.";

function isEnabled(): Promise<boolean> {
  // Only a "yes" is cached, so a key added later is picked up without a reload.
  enabled ??= fetch('/api/reference-assets')
    .then((res) => (res.ok ? res.json() : { enabled: false }))
    .then((data: any) => data.enabled === true)
    .catch(() => false)
    .then((on) => {
      if (!on) {
        enabled = undefined;
      }

      return on;
    });

  return enabled;
}

function close(note: string) {
  planAbort?.abort();
  planAbort = undefined;
  referenceAssets.set(null);

  const done = finish;
  finish = undefined;
  done?.(note);
}

/** Tells the user straight away when they asked for generated images but no fal.ai key is set up. */
export async function warnIfImageGenerationOff() {
  if (!(await isEnabled())) {
    toast.warning(NO_FAL_KEY_MESSAGE, { autoClose: 10000 });
  }
}

/**
 * Resolves with the note to append to the message ('' when skipped, not set up, or nothing fits).
 * Without `image`, the images are planned from the message (the user asked for generated images).
 */
export async function offerReferenceAssets(options: {
  image?: string;
  message: string;
  model: string;
  provider: ProviderInfo;
}): Promise<string> {
  if (finish) {
    return '';
  }

  if (!(await isEnabled())) {
    if (!options.image) {
      toast.warning(NO_FAL_KEY_MESSAGE, { autoClose: 10000 });
    }

    return '';
  }

  const result = new Promise<string>((resolve) => {
    finish = resolve;
  });

  referenceAssets.set({ phase: 'planning', assets: [], source: options.image ? 'reference' : 'request' });
  planAbort = new AbortController();

  fetch('/api/reference-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: planAbort.signal,
    body: JSON.stringify({ op: 'plan', ...options }),
  })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { images?: ProposedAsset[]; error?: string };

      if (referenceAssets.get()?.phase !== 'planning') {
        return; // skipped meanwhile
      }

      if (!res.ok || !data.images) {
        toast.warning(`Couldn't suggest images to generate: ${data.error || res.statusText}. Building without them.`);
        close('');

        return;
      }

      if (!data.images.length) {
        toast.info(
          options.image
            ? 'This reference has no background or photo imagery to generate.'
            : 'No images to generate were found for this request.',
        );
        close('');

        return;
      }

      referenceAssets.set({ phase: 'review', assets: data.images.map((asset) => ({ ...asset, selected: true })) });
    })
    .catch(() => {
      // aborted by Skip, or the network failed: build without generated images
      if (referenceAssets.get()?.phase === 'planning') {
        close('');
      }
    });

  return result;
}

/**
 * The prompt enhancer already proposed the images: go straight to the approval step.
 * Resolves with the note to append to the prompt ('' when skipped or nothing was generated).
 */
export function reviewProposedAssets(images: ProposedAsset[]): Promise<string> {
  if (finish || !images.length) {
    return Promise.resolve('');
  }

  const result = new Promise<string>((resolve) => {
    finish = resolve;
  });

  referenceAssets.set({
    phase: 'review',
    source: 'enhancer',
    assets: images.map((asset) => ({ ...asset, selected: true })),
  });

  return result;
}

export function skipReferenceAssets() {
  close('');
}

export function updateReviewAsset(name: string, change: Partial<ReviewAsset>) {
  const state = referenceAssets.get();

  if (state) {
    referenceAssets.set({
      ...state,
      assets: state.assets.map((asset) => (asset.name === name ? { ...asset, ...change } : asset)),
    });
  }
}

async function generateOne(asset: ReviewAsset): Promise<boolean> {
  updateReviewAsset(asset.name, { status: 'generating', error: undefined });

  try {
    const res = await fetch('/api/reference-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'generate', prompt: asset.prompt, size: asset.size }),
    });
    const data = (await res.json().catch(() => ({}))) as { imageData?: string; error?: string };

    if (!res.ok || !data.imageData) {
      throw new Error(data.error || res.statusText);
    }

    const bytes = Uint8Array.from(atob(data.imageData), (c) => c.charCodeAt(0));
    await workbenchStore.createFile(`${WORK_DIR}/public/${PUBLIC_ASSET_DIR}/${asset.name}.png`, bytes);
    updateReviewAsset(asset.name, { status: 'done', preview: `data:image/png;base64,${data.imageData}` });

    return true;
  } catch (error) {
    updateReviewAsset(asset.name, { status: 'failed', error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** The user approved: generate the selected images, then send the message with them. */
export async function generateApprovedAssets() {
  const state = referenceAssets.get();

  if (!state || state.phase !== 'review') {
    return;
  }

  const approved = state.assets.filter((asset) => asset.selected && asset.prompt.trim());

  if (!approved.length) {
    close('');
    return;
  }

  referenceAssets.set({ ...state, phase: 'generating' });

  const results = await Promise.all(approved.map(generateOne));
  const generated = approved.filter((_, index) => results[index]);
  const failed = approved.length - generated.length;

  if (failed) {
    toast.warning(`${failed} of ${approved.length} images couldn't be generated; building with the rest.`);
  }

  if (generated.length) {
    toast.success(
      `Saved ${generated.length} generated image${generated.length > 1 ? 's' : ''} to public/${PUBLIC_ASSET_DIR}/`,
    );
  }

  // Leave the finished previews visible for a moment before the build starts.
  await new Promise((resolve) => setTimeout(resolve, 800));
  close(describeGeneratedAssets(generated));
}
