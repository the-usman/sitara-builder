import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { listCloudinaryUploads } from '~/lib/cloudinary-uploads.server';
import { uploadToCloudinary } from '~/lib/cloudinary.server';

/** GET /api/cloudinary-upload?trackingId=x — recent uploads (own, or all for super_admin). */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);

  const trackingId = new URL(request.url).searchParams.get('trackingId') || undefined;
  const uploads = await listCloudinaryUploads({ userId: user.userId, role: user.role }, trackingId, env);

  return json({ uploads });
}

/**
 * POST /api/cloudinary-upload — signs and relays a file to the shared, admin-managed
 * Cloudinary account. The API secret never leaves the server: this route generates the
 * signature and performs the upload itself rather than handing a signature back to the
 * browser to upload directly.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const incoming = await request.formData();
  const file = incoming.get('file');
  const trackingId = incoming.get('trackingId');

  if (!(file instanceof File)) {
    return json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    const uploaded = await uploadToCloudinary({
      env,
      data: new Uint8Array(await file.arrayBuffer()),
      filename: file.name,
      trackingId: typeof trackingId === 'string' && trackingId ? trackingId : undefined,
      uploadedBy: { userId: user.userId, email: user.email },
    });

    if (!uploaded) {
      const message =
        'No Cloudinary credentials are configured. Ask a super admin to set them up in Settings → Connections.';

      return json({ error: message }, { status: 409 });
    }

    return json({ url: uploaded.url, publicId: uploaded.publicId });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return json({ error: error instanceof Error ? error.message : 'Cloudinary upload failed' }, { status: 400 });
  }
}
