/*
 * Prepares design-reference images for the model (browser only — uses canvas).
 *
 * Vision models downscale large images (Claude to ~1568px on the long side), so a full-page
 * screenshot of 1440×6000 arrives too small to read text, spacing or details. Tall images are
 * sent as an overview plus full-width slices, top to bottom. The dominant colors are sampled
 * from the pixels, because hex values eyeballed from a screenshot are routinely off.
 */

export interface PaletteColor {
  hex: string;

  /** Share of the image's pixels, 0–100. */
  share: number;
}

export interface PreparedReference {
  /** Image data URLs in the order to send: overview first, then slices top → bottom. */
  images: string[];
  slices: number;
  width: number;
  height: number;
  palette: PaletteColor[];
}

const MAX_OVERVIEW_SIDE = 1568;
const SLICE_WIDTH = 1280;
const MAX_SLICES = 6;

/** Height/width ratio above which an image is treated as a full-page screenshot and sliced. */
const TALL_RATIO = 1.6;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the reference image'));
    img.src = src;
  });
}

function drawToDataUrl(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, scale: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.9);
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Dominant colors: pixels bucketed to 4 bits per channel, buckets averaged, then near-identical
 * colors merged so gradients and anti-aliasing don't produce ten shades of the same blue.
 */
export function samplePalette(img: HTMLImageElement, maxColors = 10): PaletteColor[] {
  const scale = Math.min(1, 220 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      continue;
    }

    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    bucket.n++;
    buckets.set(key, bucket);
    total++;
  }

  const colors = [...buckets.values()]
    .map((b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, n: b.n }))
    .sort((a, b) => b.n - a.n);

  const merged: typeof colors = [];

  for (const color of colors) {
    const near = merged.find((m) => Math.hypot(m.r - color.r, m.g - color.g, m.b - color.b) < 28);

    if (near) {
      near.n += color.n;
    } else {
      merged.push({ ...color });
    }
  }

  return merged
    .sort((a, b) => b.n - a.n)
    .filter((c) => c.n / total >= 0.004)
    .slice(0, maxColors)
    .map((c) => ({ hex: toHex(c.r, c.g, c.b), share: Math.round((c.n / total) * 1000) / 10 }));
}

export async function prepareReferenceImage(dataUrl: string): Promise<PreparedReference> {
  const img = await loadImage(dataUrl);
  const { naturalWidth: width, naturalHeight: height } = img;
  const palette = samplePalette(img);

  const overviewScale = Math.min(1, MAX_OVERVIEW_SIDE / Math.max(width, height));
  const overview = drawToDataUrl(img, 0, 0, width, height, overviewScale);

  if (height / width < TALL_RATIO) {
    return { images: [overview], slices: 0, width, height, palette };
  }

  // Full-page screenshot: slices roughly as tall as wide (more if the page is very long).
  const sliceHeight = Math.max(Math.round(width * 1.1), Math.ceil(height / MAX_SLICES));
  const sliceScale = Math.min(1, SLICE_WIDTH / width);
  const images = [overview];

  for (let y = 0; y < height; y += sliceHeight) {
    images.push(drawToDataUrl(img, 0, y, width, Math.min(sliceHeight, height - y), sliceScale));
  }

  return { images, slices: images.length - 1, width, height, palette };
}

/** The text the model gets next to the images. */
export function describeReferences(references: PreparedReference[]): string {
  if (!references.length) {
    return '';
  }

  const lines = references.map((ref, i) => {
    const layout = ref.slices
      ? `sent as 1 overview + ${ref.slices} full-detail slices from top to bottom (read the slices for text, sizes and spacing)`
      : 'sent as one image';
    const palette = ref.palette.map((c) => `${c.hex} (${c.share}%)`).join(', ');

    return `- Reference ${i + 1}: ${ref.width}×${ref.height}px, ${layout}.\n  Colors sampled from its pixels (largest share first): ${palette}`;
  });

  return `\n\n[Design reference attached — build the website to match it as closely as possible.\n${lines.join('\n')}]`;
}
