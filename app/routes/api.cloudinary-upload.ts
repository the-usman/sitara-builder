import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { requireCloudinaryConfig } from '~/lib/config/provider-tokens.server';

async function sha1Hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/cloudinary-upload — signs and relays a file to the shared, admin-managed
 * Cloudinary account. The API secret never leaves the server: this route generates the
 * signature and performs the upload itself rather than handing a signature back to the
 * browser to upload directly.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  await requireAuth(request, env);

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { cloudName, apiKey, apiSecret } = await requireCloudinaryConfig(env);

  const incoming = await request.formData();
  const file = incoming.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    /*
     * Cloudinary's signature is a SHA-1 of every request param it doesn't already trust
     * (everything except `file`, `cloud_name`, `api_key`, and the signature itself),
     * sorted alphabetically, with the api secret appended — per Cloudinary's signing spec.
     */
    const signature = await sha1Hex(`timestamp=${timestamp}${apiSecret}`);

    const uploadForm = new FormData();
    uploadForm.set('file', file, file.name);
    uploadForm.set('api_key', apiKey);
    uploadForm.set('timestamp', timestamp);
    uploadForm.set('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: uploadForm,
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      return json({ error: data.error?.message || 'Cloudinary upload failed' }, { status: 400 });
    }

    return json({ url: data.secure_url as string, publicId: data.public_id as string });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return json({ error: 'Cloudinary upload failed' }, { status: 500 });
  }
}
