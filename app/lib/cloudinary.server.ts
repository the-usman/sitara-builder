import type { ServerEnv } from '~/lib/mongo.server';
import type { AuthUser } from '~/lib/auth.server';
import { getCloudinaryConfig } from '~/lib/config/provider-tokens.server';
import { recordCloudinaryUpload } from '~/lib/cloudinary-uploads.server';

/*
 * Server-side Cloudinary uploads, shared by the manual upload route and the AI image
 * generation routes. The API secret never leaves the server: the signature is computed
 * here and the upload is performed here, never handed back to the browser.
 */

async function sha1Hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  bytes?: number;
}

/**
 * Uploads bytes to the shared, admin-managed Cloudinary account and records the upload
 * in Mongo (best-effort: a failed record never fails the upload).
 *
 * Returns `null` when Cloudinary is not configured, so callers can fall back to saving
 * the asset into the project instead. Throws on an actual upload failure.
 */
export async function uploadToCloudinary({
  env,
  data,
  filename,
  trackingId,
  uploadedBy,
}: {
  env?: ServerEnv;
  data: Uint8Array;
  filename: string;
  trackingId?: string;
  uploadedBy: Pick<AuthUser, 'userId' | 'email'>;
}): Promise<CloudinaryUploadResult | null> {
  const { cloudName, apiKey, apiSecret } = await getCloudinaryConfig(env);

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  /*
   * Cloudinary's signature is a SHA-1 of every request param it doesn't already trust
   * (everything except `file`, `cloud_name`, `api_key`, and the signature itself),
   * sorted alphabetically, with the api secret appended — per Cloudinary's signing spec.
   */
  const signature = await sha1Hex(`timestamp=${timestamp}${apiSecret}`);

  const uploadForm = new FormData();
  uploadForm.set('file', new Blob([data], { type: 'image/png' }), filename);
  uploadForm.set('api_key', apiKey);
  uploadForm.set('timestamp', timestamp);
  uploadForm.set('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: uploadForm,
  });

  const result = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(result?.error?.message || 'Cloudinary upload failed');
  }

  const uploaded: CloudinaryUploadResult = {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    bytes: result.bytes,
  };

  await recordCloudinaryUpload(
    {
      trackingId: trackingId || undefined,
      uploadedBy: { userId: uploadedBy.userId, email: uploadedBy.email },
      filename,
      url: uploaded.url,
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
      bytes: uploaded.bytes,
    },
    env,
  ).catch((error) => console.error('Failed to record Cloudinary upload:', error));

  return uploaded;
}
