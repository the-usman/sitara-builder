import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || 'architecture';
  const category = url.searchParams.get('category') || '';
  const count = Math.min(Number(url.searchParams.get('count') || '16'), 24);
  const cursor = url.searchParams.get('cursor') || '';

  const license = url.searchParams.get('license') || 'cc0';
  const params = new URLSearchParams({
    q,
    type: 'models',
    count: String(count),
    downloadable: 'true',
    ...(category ? { categories: category } : {}),
    ...(cursor ? { cursor } : {}),
    ...(license ? { license } : {}),
  });

  try {
    const res = await fetch(`https://api.sketchfab.com/v3/models?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return json({ error: `Sketchfab API error: ${res.status}`, results: [], nextCursor: null }, { status: 200 });
    }

    const data = (await res.json()) as any;
    const results = (data.results ?? []).map((m: any) => {
      const images: any[] = m.thumbnails?.images ?? [];
      const thumb = images.find((i) => i.width >= 200) ?? images[0];
      return {
        uid: m.uid as string,
        name: m.name as string,
        author: (m.user?.username as string) ?? '',
        license: (m.license?.label as string) ?? 'CC BY',
        thumbnail: (thumb?.url as string) ?? '',
        embedUrl: `https://sketchfab.com/models/${m.uid}/embed`,
      };
    });

    return json({ results, nextCursor: data.cursors?.next ?? null });
  } catch (err: any) {
    return json({ error: err.message ?? 'Network error', results: [], nextCursor: null });
  }
}
