import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import type { VercelProjectInfo } from '~/types/vercel';
import { updateProjectUrl } from '~/lib/project-tracker.server';
import { requireAuth } from '~/lib/auth.server';
import { requireProviderToken } from '~/lib/config/provider-tokens.server';

// Add loader function to handle GET requests
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any)?.cloudflare?.env;
  await requireAuth(request, env);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return json({ error: 'Missing projectId' }, { status: 400 });
  }

  // Server-held credential: a `?token=` query parameter is no longer honoured.
  const token = await requireProviderToken('vercel', env);

  try {
    // Get project info
    const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!projectResponse.ok) {
      return json({ error: 'Failed to fetch project' }, { status: 400 });
    }

    const projectData = (await projectResponse.json()) as any;

    // Get latest deployment
    const deploymentsResponse = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!deploymentsResponse.ok) {
      return json({ error: 'Failed to fetch deployments' }, { status: 400 });
    }

    const deploymentsData = (await deploymentsResponse.json()) as any;

    const latestDeployment = deploymentsData.deployments?.[0];

    return json({
      project: {
        id: projectData.id,
        name: projectData.name,
        url: `https://${projectData.name}.vercel.app`,
      },
      deploy: latestDeployment
        ? {
            id: latestDeployment.id,
            state: latestDeployment.state,
            url: latestDeployment.url ? `https://${latestDeployment.url}` : `https://${projectData.name}.vercel.app`,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching Vercel deployment:', error);
    return json({ error: 'Failed to fetch deployment' }, { status: 500 });
  }
}

interface DeployRequestBody {
  projectId?: string;
  files: Record<string, string>;
  chatId: string;
}

/*
 * chatId is the chat's trackingId — a mixed-case nanoid like "r8ftipJSEzzuzMLX" — but
 * Vercel project names must be lowercase and limited to [a-z0-9._-], with no '---' run.
 * Passing chatId straight through (as this used to) makes project creation fail with
 * "Project names ... must be lowercase" for any chat whose id has uppercase letters.
 */
function toVercelProjectName(chatId: string): string {
  return `sitara-builder-${chatId}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-{3,}/g, '--')
    .slice(0, 100);
}

/*
 * New projects (and projects inheriting team-level defaults) can come back from Vercel
 * with "Vercel Authentication" and/or password protection enabled, which makes the
 * deployed URL loadable only by someone logged into the shared Vercel account. Every
 * project deployed through this shared token is meant to be a public site, so explicitly
 * clear both protections after the project exists. Best-effort: a failure here shouldn't
 * block the deployment itself.
 */
async function ensureProjectIsPublic(projectId: string, token: string): Promise<void> {
  try {
    await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ssoProtection: null, passwordProtection: null }),
    });
  } catch (error) {
    console.error('Failed to clear Vercel deployment protection:', error);
  }
}

// Existing action function for POST requests
export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  await requireAuth(request, env);

  /*
   * Deploys always run against the shared, super-admin-managed Vercel account.
   * A `token` in the request body is ignored.
   */
  const token = await requireProviderToken('vercel', env);

  try {
    const { projectId, files, chatId } = (await request.json()) as DeployRequestBody;

    let targetProjectId = projectId;
    let projectInfo: VercelProjectInfo | undefined;

    // If no projectId provided, create a new project
    if (!targetProjectId) {
      const projectName = toVercelProjectName(chatId);
      const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          framework: null,
        }),
      });

      if (!createProjectResponse.ok) {
        const errorData = (await createProjectResponse.json()) as any;
        return json(
          { error: `Failed to create project: ${errorData.error?.message || 'Unknown error'}` },
          { status: 400 },
        );
      }

      const newProject = (await createProjectResponse.json()) as any;
      targetProjectId = newProject.id;
      projectInfo = {
        id: newProject.id,
        name: newProject.name,
        url: `https://${newProject.name}.vercel.app`,
        chatId,
      };
    } else {
      // Get existing project info
      const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${targetProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (projectResponse.ok) {
        const existingProject = (await projectResponse.json()) as any;
        projectInfo = {
          id: existingProject.id,
          name: existingProject.name,
          url: `https://${existingProject.name}.vercel.app`,
          chatId,
        };
      } else {
        // If project doesn't exist, create a new one
        const projectName = toVercelProjectName(chatId);
        const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            framework: null,
          }),
        });

        if (!createProjectResponse.ok) {
          const errorData = (await createProjectResponse.json()) as any;
          return json(
            { error: `Failed to create project: ${errorData.error?.message || 'Unknown error'}` },
            { status: 400 },
          );
        }

        const newProject = (await createProjectResponse.json()) as any;
        targetProjectId = newProject.id;
        projectInfo = {
          id: newProject.id,
          name: newProject.name,
          url: `https://${newProject.name}.vercel.app`,
          chatId,
        };
      }
    }

    // Make sure the deployed link is publicly accessible, not gated behind the shared Vercel account
    await ensureProjectIsPublic(targetProjectId as string, token);

    // Prepare files for deployment
    const deploymentFiles = [];

    for (const [filePath, content] of Object.entries(files)) {
      // Ensure file path doesn't start with a slash for Vercel
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      deploymentFiles.push({
        file: normalizedPath,
        data: content,
      });
    }

    // Create a new deployment
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectInfo.name,
        project: targetProjectId,
        target: 'production',
        files: deploymentFiles,
        routes: [{ src: '/(.*)', dest: '/$1' }],
      }),
    });

    if (!deployResponse.ok) {
      const errorData = (await deployResponse.json()) as any;
      return json(
        { error: `Failed to create deployment: ${errorData.error?.message || 'Unknown error'}` },
        { status: 400 },
      );
    }

    const deployData = (await deployResponse.json()) as any;

    // Poll for deployment status
    let retryCount = 0;
    const maxRetries = 60;
    let deploymentUrl = '';
    let deploymentState = '';

    while (retryCount < maxRetries) {
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (statusResponse.ok) {
        const status = (await statusResponse.json()) as any;
        deploymentState = status.readyState;
        deploymentUrl = status.url ? `https://${status.url}` : '';

        if (status.readyState === 'READY' || status.readyState === 'ERROR') {
          break;
        }
      }

      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (deploymentState === 'ERROR') {
      return json({ error: 'Deployment failed' }, { status: 500 });
    }

    if (retryCount >= maxRetries) {
      return json({ error: 'Deployment timed out' }, { status: 500 });
    }

    /*
     * Prefer the URL of the deployment we just polled to READY (`deploymentUrl`,
     * Vercel's own `status.url`) over the project's default alias domain
     * (`projectInfo.url`, `<name>.vercel.app`). Vercel doesn't guarantee that alias
     * is attached the instant a brand-new project's first deployment goes READY, so
     * always preferring it (as this used to) could hand back a URL that 404s with
     * DEPLOYMENT_NOT_FOUND even though the deployment itself succeeded.
     */
    const finalUrl = deploymentUrl || projectInfo.url;

    if (chatId && finalUrl) {
      updateProjectUrl(chatId, 'vercelUrl', finalUrl, env).catch(console.error);
    }

    return json({
      success: true,
      deploy: {
        id: deployData.id,
        state: deploymentState,
        url: finalUrl,
      },
      project: projectInfo,
    });
  } catch (error) {
    console.error('Vercel deploy error:', error);
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
}
