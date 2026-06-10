import { json } from '@remix-run/cloudflare';
import JSZip from 'jszip';

export async function loader({ request, context }: { request: Request; context: any }) {
  const url = new URL(request.url);
  const repo = url.searchParams.get('repo');

  if (!repo) {
    return json({ error: 'Repository name is required' }, { status: 400 });
  }

  const githubToken =
    context?.cloudflare?.env?.GITHUB_TOKEN ||
    context?.cloudflare?.env?.VITE_GITHUB_ACCESS_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.VITE_GITHUB_ACCESS_TOKEN;

  try {
    const baseUrl = 'https://api.github.com';

    const commonHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'sitara-builder/1.0',
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
    };

    // Get the latest release
    const releaseResponse = await fetch(`${baseUrl}/repos/${repo}/releases/latest`, {
      headers: commonHeaders,
    });

    if (!releaseResponse.ok) {
      const body = await releaseResponse.text();
      console.error(`GitHub API ${releaseResponse.status} for ${repo}:`, body, '| token present:', !!githubToken);
      throw new Error(`GitHub API error: ${releaseResponse.status}`);
    }

    const releaseData = (await releaseResponse.json()) as any;
    const zipballUrl = releaseData.zipball_url;

    // Fetch the zipball
    const zipResponse = await fetch(zipballUrl, {
      headers: commonHeaders,
    });

    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch release zipball: ${zipResponse.status}`);
    }

    // Get the zip content as ArrayBuffer
    const zipArrayBuffer = await zipResponse.arrayBuffer();

    // Use JSZip to extract the contents
    const zip = await JSZip.loadAsync(zipArrayBuffer);

    // Find the root folder name
    let rootFolderName = '';
    zip.forEach((relativePath) => {
      if (!rootFolderName && relativePath.includes('/')) {
        rootFolderName = relativePath.split('/')[0];
      }
    });

    // Extract all files
    const promises = Object.keys(zip.files).map(async (filename) => {
      const zipEntry = zip.files[filename];

      // Skip directories
      if (zipEntry.dir) {
        return null;
      }

      // Skip the root folder itself
      if (filename === rootFolderName) {
        return null;
      }

      // Remove the root folder from the path
      let normalizedPath = filename;

      if (rootFolderName && filename.startsWith(rootFolderName + '/')) {
        normalizedPath = filename.substring(rootFolderName.length + 1);
      }

      // Get the file content
      const content = await zipEntry.async('string');

      return {
        name: normalizedPath.split('/').pop() || '',
        path: normalizedPath,
        content,
      };
    });

    const results = await Promise.all(promises);
    const fileList = results.filter(Boolean) as { name: string; path: string; content: string }[];

    return json(fileList);
  } catch (error) {
    console.error('Error processing GitHub template:', error);
    return json({ error: 'Failed to fetch template files' }, { status: 500 });
  }
}
