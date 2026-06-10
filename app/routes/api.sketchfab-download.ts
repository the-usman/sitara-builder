import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid');

  if (!uid) {
    return json({ error: 'uid is required' }, { status: 400 });
  }

  const cloudflareEnv = (context as any)?.cloudflare?.env;
  const apiKey = process.env.SKETCHFAB_API_KEY || cloudflareEnv?.SKETCHFAB_API_KEY;

  if (!apiKey) {
    return json({ error: 'SKETCHFAB_API_KEY not configured. Add it to your .env file.' }, { status: 400 });
  }

  // Step 1: get the download URL from Sketchfab
  const dlInfoRes = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
    headers: { Authorization: `Token ${apiKey}`, Accept: 'application/json' },
  }).catch((e) => {
    throw new Error(`Sketchfab API unreachable: ${e.message}`);
  });

  if (!dlInfoRes.ok) {
    let detail = '';

    try {
      const body = (await dlInfoRes.json()) as any;
      detail = body.detail || body.error || JSON.stringify(body);
    } catch {
      detail = await dlInfoRes.text().catch(() => '');
    }

    return json({ error: `Sketchfab ${dlInfoRes.status}: ${detail}` }, { status: dlInfoRes.status });
  }

  const dlInfo = (await dlInfoRes.json()) as any;
  const glbUrl: string | undefined = dlInfo.glb?.url || dlInfo.gltf?.url;

  if (!glbUrl) {
    return json(
      { error: 'No downloadable GLB for this model. The author may not have enabled downloads.' },
      { status: 404 },
    );
  }

  // Step 2: proxy the actual GLB binary back to the client
  const glbRes = await fetch(glbUrl).catch((e) => {
    throw new Error(`GLB fetch failed: ${e.message}`);
  });

  if (!glbRes.ok) {
    return json({ error: `GLB download failed: ${glbRes.status}` }, { status: 502 });
  }

  const buffer = await glbRes.arrayBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
