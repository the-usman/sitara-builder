import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { requireProviderToken } from '~/lib/config/provider-tokens.server';

const GITHUB_API = 'https://api.github.com';
const HISTORY_PAGE_SIZE = 50;

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sitara-builder',
    'Content-Type': 'application/json',
  };
}

/** Only ever talk to github.com — repoUrl is client-supplied, so this guards against SSRF to an arbitrary host. */
function parseGithubRepoUrl(repoUrl: string | null | undefined): { owner: string; repo: string } | undefined {
  let parsed: URL;

  try {
    parsed = new URL(repoUrl || '');
  } catch {
    return undefined;
  }

  if (parsed.hostname !== 'github.com') {
    return undefined;
  }

  const [owner, repo] = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '').split('/');

  return owner && repo ? { owner, repo } : undefined;
}

/** Lists a chat's versions: the commits on its GitHub repo, newest first. */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any)?.cloudflare?.env;
  await requireAuth(request, env);

  const parsed = parseGithubRepoUrl(new URL(request.url).searchParams.get('repoUrl'));

  if (!parsed) {
    return json({ error: 'repoUrl must be a github.com repository URL' }, { status: 400 });
  }

  const token = await requireProviderToken('github', env);
  const base = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`;

  try {
    /*
     * List from the branch head's exact SHA. GitHub's branch-name commit listing can lag a few seconds
     * behind a ref just moved by an auto-push, which made a new version show up only "after some time".
     */
    const repoResponse = await fetch(base, { headers: ghHeaders(token) });

    if (!repoResponse.ok) {
      return json({ error: 'Failed to load version history' }, { status: repoResponse.status === 404 ? 404 : 400 });
    }

    const { default_branch: branch } = (await repoResponse.json()) as { default_branch: string };
    const refResponse = await fetch(`${base}/git/ref/heads/${branch}`, { headers: ghHeaders(token) });
    const headSha = refResponse.ok ? ((await refResponse.json()) as { object: { sha: string } }).object.sha : branch;

    const response = await fetch(`${base}/commits?sha=${encodeURIComponent(headSha)}&per_page=${HISTORY_PAGE_SIZE}`, {
      headers: ghHeaders(token),
    });

    if (!response.ok) {
      return json({ error: 'Failed to load version history' }, { status: response.status === 404 ? 404 : 400 });
    }

    const commits = (await response.json()) as Array<{
      sha: string;
      html_url: string;
      commit: { message: string; committer?: { date?: string }; author?: { date?: string } };
    }>;

    const versions = commits.map((c) => {
      const [title, ...rest] = c.commit.message.split('\n');

      return {
        sha: c.sha,
        title: title.trim(),
        description: rest.join('\n').trim(),
        date: c.commit.committer?.date || c.commit.author?.date || '',
        url: c.html_url,
      };
    });

    return json({ versions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GitHub history error:', error);
    return json({ error: 'Failed to load version history' }, { status: 500 });
  }
}

/**
 * Restores an earlier version by adding a NEW commit on top of the branch that has the old commit's
 * files. History is never rewritten, so the version you restored away from stays in the list.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any)?.cloudflare?.env;
  await requireAuth(request, env);

  const { repoUrl, sha } = (await request.json()) as { repoUrl?: string; sha?: string };
  const parsed = parseGithubRepoUrl(repoUrl);

  if (!parsed) {
    return json({ error: 'repoUrl must be a github.com repository URL' }, { status: 400 });
  }

  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    return json({ error: 'sha must be a commit SHA' }, { status: 400 });
  }

  const token = await requireProviderToken('github', env);
  const base = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`;

  try {
    const repoResponse = await fetch(base, { headers: ghHeaders(token) });

    if (!repoResponse.ok) {
      return json({ error: 'Failed to load repo' }, { status: 400 });
    }

    const { default_branch: branch } = (await repoResponse.json()) as { default_branch: string };

    const [targetResponse, headResponse] = await Promise.all([
      fetch(`${base}/git/commits/${sha}`, { headers: ghHeaders(token) }),
      fetch(`${base}/git/ref/heads/${branch}`, { headers: ghHeaders(token) }),
    ]);

    if (!targetResponse.ok || !headResponse.ok) {
      return json({ error: 'Version not found' }, { status: 404 });
    }

    const target = (await targetResponse.json()) as { sha: string; message: string; tree: { sha: string } };
    const head = (await headResponse.json()) as { object: { sha: string } };

    if (target.sha === head.object.sha) {
      return json({ success: true, sha: target.sha, alreadyLatest: true });
    }

    const title = target.message.split('\n')[0];

    const commitResponse = await fetch(`${base}/git/commits`, {
      method: 'POST',
      headers: ghHeaders(token),
      body: JSON.stringify({
        message: `Restore version ${target.sha.slice(0, 7)}: ${title}`,
        tree: target.tree.sha,
        parents: [head.object.sha],
      }),
    });

    if (!commitResponse.ok) {
      return json({ error: 'Failed to create restore commit' }, { status: 400 });
    }

    const newCommit = (await commitResponse.json()) as { sha: string };

    const updateResponse = await fetch(`${base}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: ghHeaders(token),
      body: JSON.stringify({ sha: newCommit.sha }),
    });

    if (!updateResponse.ok) {
      return json({ error: 'Failed to update branch' }, { status: 400 });
    }

    return json({ success: true, sha: newCommit.sha, restoredFrom: target.sha });
  } catch (error) {
    console.error('GitHub restore error:', error);
    return json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
