import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { requireProviderToken } from '~/lib/config/provider-tokens.server';

const GITHUB_API = 'https://api.github.com';

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sitara-builder',
  };
}

/** Only ever talk to github.com — repoUrl is client-supplied, so this guards against SSRF to an arbitrary host. */
function parseGithubRepoUrl(repoUrl: string): { owner: string; repo: string } | undefined {
  let parsed: URL;

  try {
    parsed = new URL(repoUrl);
  } catch {
    return undefined;
  }

  if (parsed.hostname !== 'github.com') {
    return undefined;
  }

  const [owner, repo] = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '').split('/');

  if (!owner || !repo) {
    return undefined;
  }

  return { owner, repo };
}

/**
 * Restores a chat's files straight from its linked GitHub repo instead of a Mongo
 * snapshot blob — the fast path once a chat is auto-pushing (see api.github-push.ts).
 * Returns a Snapshot-shaped FileMap the client can drop straight into the existing
 * restore-from-snapshot flow in useChatHistory.ts.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any)?.cloudflare?.env;
  await requireAuth(request, env);

  const url = new URL(request.url);
  const repoUrl = url.searchParams.get('repoUrl');

  if (!repoUrl) {
    return json({ error: 'Missing repoUrl' }, { status: 400 });
  }

  const parsed = parseGithubRepoUrl(repoUrl);

  if (!parsed) {
    return json({ error: 'repoUrl must be a github.com repository URL' }, { status: 400 });
  }

  const { owner, repo } = parsed;

  // Optional commit to read instead of the branch head (used by version history). Commit SHAs only.
  const refParam = url.searchParams.get('ref');

  if (refParam && !/^[0-9a-f]{7,40}$/i.test(refParam)) {
    return json({ error: 'ref must be a commit SHA' }, { status: 400 });
  }

  const token = await requireProviderToken('github', env);

  try {
    const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders(token) });

    if (!repoResponse.ok) {
      return json({ error: 'Failed to load repo' }, { status: repoResponse.status === 404 ? 404 : 400 });
    }

    const repoData = (await repoResponse.json()) as { default_branch: string };
    const branch = repoData.default_branch || 'main';

    const treeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${refParam || branch}?recursive=1`, {
      headers: ghHeaders(token),
    });

    if (!treeResponse.ok) {
      return json({ error: 'Failed to load repo tree' }, { status: 400 });
    }

    const treeData = (await treeResponse.json()) as {
      tree: { path: string; type: string; sha: string }[];
      truncated: boolean;
    };

    const blobEntries = treeData.tree.filter((entry) => entry.type === 'blob');

    const files: Record<string, { type: 'file'; content: string; isBinary: boolean }> = {};

    // Fetch every blob's content in parallel — repos synced by this app are project-sized, not huge.
    await Promise.all(
      blobEntries.map(async (entry) => {
        const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs/${entry.sha}`, {
          headers: ghHeaders(token),
        });

        if (!blobResponse.ok) {
          console.error(`Failed to fetch blob for ${entry.path}`);
          return;
        }

        const blob = (await blobResponse.json()) as { content: string; encoding: string };
        const base64 = blob.content.replace(/\n/g, '');

        files[entry.path] = {
          type: 'file',
          content: Buffer.from(base64, 'base64').toString('utf-8'),
          isBinary: false,
        };
      }),
    );

    return json({
      files,
      truncated: treeData.truncated,
      repoUrl: `https://github.com/${owner}/${repo}`,
    });
  } catch (error) {
    console.error('GitHub pull error:', error);
    return json({ error: 'Failed to pull from GitHub' }, { status: 500 });
  }
}
