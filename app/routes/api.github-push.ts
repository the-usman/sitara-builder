import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { requireProviderToken } from '~/lib/config/provider-tokens.server';
import { updateProjectUrl } from '~/lib/project-tracker.server';

const GITHUB_API = 'https://api.github.com';

interface PushRequestBody {
  /** First user message ID — stable across devices, used as the repo name. */
  trackingId: string;
  files: Record<string, string>;
  commitMessage?: string;

  /** IndexedDB-local chat id, only used to mirror the URL into web_builders (project-tracker), same as api.vercel-deploy.ts. */
  clientChatId?: string;
}

/*
 * GitHub repo names allow [A-Za-z0-9._-], max 100 chars, and can't be just dots.
 * trackingId is already a mixed-case nanoid, so this is mostly a safety net.
 */
function toGithubRepoName(trackingId: string): string {
  const cleaned = trackingId.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^\.+/, '').slice(0, 100);
  return cleaned || `chat-${Date.now()}`;
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sitara-builder',
  };
}

async function ghFetch(url: string, token: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { ...ghHeaders(token), ...(init?.headers || {}), 'Content-Type': 'application/json' },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  await requireAuth(request, env);

  // Shared, admin-configured token (GITHUB_TOKEN in .env) — every user's auto-push uses this one account.
  const token = await requireProviderToken('github', env);

  try {
    const { trackingId, files, commitMessage, clientChatId } = (await request.json()) as PushRequestBody;

    if (!trackingId) {
      return json({ error: 'Missing trackingId' }, { status: 400 });
    }

    const fileEntries = Object.entries(files || {}).filter(([, content]) => typeof content === 'string');

    if (fileEntries.length === 0) {
      // Nothing to push yet (e.g. very first turn, before any files exist) — not an error.
      return json({ success: true, skipped: true });
    }

    const repoName = toGithubRepoName(trackingId);

    const userResponse = await ghFetch(`${GITHUB_API}/user`, token);

    if (!userResponse.ok) {
      return json({ error: 'GitHub token is invalid or lacks access to the authenticated user' }, { status: 400 });
    }

    const user = (await userResponse.json()) as { login: string };
    const owner = user.login;

    let defaultBranch = 'main';
    const repoResponse = await ghFetch(`${GITHUB_API}/repos/${owner}/${repoName}`, token);

    if (repoResponse.ok) {
      const repo = (await repoResponse.json()) as any;
      defaultBranch = repo.default_branch || 'main';
    } else if (repoResponse.status === 404) {
      const createResponse = await ghFetch(`${GITHUB_API}/user/repos`, token, {
        method: 'POST',
        body: JSON.stringify({ name: repoName, private: true, auto_init: true }),
      });

      if (!createResponse.ok) {
        const errorData = (await createResponse.json().catch(() => ({}))) as any;
        return json(
          { error: `Failed to create repo: ${errorData.message || 'Unknown error'}` },
          { status: 400 },
        );
      }

      const newRepo = (await createResponse.json()) as any;
      defaultBranch = newRepo.default_branch || 'main';

      // Give GitHub a moment to finish initializing the repo (README commit, default branch ref) before pushing.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      const errorData = (await repoResponse.json().catch(() => ({}))) as any;
      return json({ error: `Failed to look up repo: ${errorData.message || 'Unknown error'}` }, { status: 400 });
    }

    // Create a blob for every file, in parallel.
    const blobs = await Promise.all(
      fileEntries.map(async ([filePath, content]) => {
        const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        const blobResponse = await ghFetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/blobs`, token, {
          method: 'POST',
          body: JSON.stringify({ content: Buffer.from(content).toString('base64'), encoding: 'base64' }),
        });

        if (!blobResponse.ok) {
          throw new Error(`Failed to create blob for ${normalizedPath}`);
        }

        const blob = (await blobResponse.json()) as { sha: string };

        return { path: normalizedPath, sha: blob.sha };
      }),
    );

    const refResponse = await ghFetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`, token);

    if (!refResponse.ok) {
      return json({ error: 'Failed to read the repo default branch ref' }, { status: 400 });
    }

    const ref = (await refResponse.json()) as { object: { sha: string } };
    const latestCommitSha = ref.object.sha;

    const treeResponse = await ghFetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/trees`, token, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: latestCommitSha,
        tree: blobs.map((blob) => ({ path: blob.path, mode: '100644', type: 'blob', sha: blob.sha })),
      }),
    });

    if (!treeResponse.ok) {
      return json({ error: 'Failed to create tree' }, { status: 400 });
    }

    const newTree = (await treeResponse.json()) as { sha: string };

    const commitResponse = await ghFetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage || 'Auto-sync from Sitara Builder',
        tree: newTree.sha,
        parents: [latestCommitSha],
      }),
    });

    if (!commitResponse.ok) {
      return json({ error: 'Failed to create commit' }, { status: 400 });
    }

    const newCommit = (await commitResponse.json()) as { sha: string };

    const updateRefResponse = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`,
      token,
      { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) },
    );

    if (!updateRefResponse.ok) {
      return json({ error: 'Failed to update branch ref' }, { status: 400 });
    }

    const repoUrl = `https://github.com/${owner}/${repoName}`;

    if (clientChatId) {
      updateProjectUrl(clientChatId, 'githubUrl', repoUrl, env).catch(console.error);
    }

    return json({ success: true, repoUrl, repoName, owner, branch: defaultBranch });
  } catch (error) {
    console.error('GitHub push error:', error);
    return json({ error: error instanceof Error ? error.message : 'GitHub push failed' }, { status: 500 });
  }
}
