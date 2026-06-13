import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import {
  deleteCustomSkill,
  importSkillFromGit,
  importSkillFromZip,
  listCustomSkills,
  parseSkillMd,
  saveCustomSkill,
  setBuiltinSkillEnabled,
  setCustomSkillEnabled,
} from '~/lib/skills.server';
import { promptSkills } from '~/lib/common/prompts/skills';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireAuth(request, (context as any).cloudflare?.env);

  return json({ skills: await listCustomSkills() });
}

interface SkillActionBody {
  intent: 'add-git' | 'add-md' | 'add-zip' | 'toggle' | 'toggle-builtin' | 'delete';
  url?: string;
  content?: string;
  dataBase64?: string;
  filename?: string;
  name?: string;
  enabled?: boolean;
  triggers?: string;
  alwaysLoad?: boolean;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await requireAuth(request, (context as any).cloudflare?.env);

  if (user.role !== 'super_admin') {
    return json({ error: 'Only a super admin can manage skills.' }, { status: 403 });
  }

  const body = (await request.json()) as SkillActionBody;
  const createdBy = { userId: user.userId, email: user.email };
  const importOptions = { triggers: body.triggers, alwaysLoad: body.alwaysLoad };

  try {
    switch (body.intent) {
      case 'add-git': {
        if (!body.url) {
          return json({ error: 'url is required' }, { status: 400 });
        }

        const parsed = await importSkillFromGit(body.url);
        const skill = await saveCustomSkill(parsed, { type: 'git', ref: body.url }, createdBy, importOptions);

        return json({ success: true, skill: { name: skill.name, description: skill.description } });
      }
      case 'add-md': {
        if (!body.content) {
          return json({ error: 'content is required' }, { status: 400 });
        }

        const parsed = parseSkillMd(body.content, body.filename);
        const skill = await saveCustomSkill(parsed, { type: 'md', ref: body.filename }, createdBy, importOptions);

        return json({ success: true, skill: { name: skill.name, description: skill.description } });
      }
      case 'add-zip': {
        if (!body.dataBase64) {
          return json({ error: 'dataBase64 is required' }, { status: 400 });
        }

        const parsed = await importSkillFromZip(body.dataBase64, body.filename);
        const skill = await saveCustomSkill(parsed, { type: 'zip', ref: body.filename }, createdBy, importOptions);

        return json({ success: true, skill: { name: skill.name, description: skill.description } });
      }
      case 'toggle': {
        if (!body.name || typeof body.enabled !== 'boolean') {
          return json({ error: 'name and enabled are required' }, { status: 400 });
        }

        await setCustomSkillEnabled(body.name, body.enabled);

        return json({ success: true });
      }
      case 'toggle-builtin': {
        if (!body.name || typeof body.enabled !== 'boolean') {
          return json({ error: 'name and enabled are required' }, { status: 400 });
        }

        if (!promptSkills.some((s) => s.name === body.name)) {
          return json({ error: `Unknown built-in skill: ${body.name}` }, { status: 400 });
        }

        await setBuiltinSkillEnabled(body.name, body.enabled);

        return json({ success: true });
      }
      case 'delete': {
        if (!body.name) {
          return json({ error: 'name is required' }, { status: 400 });
        }

        await deleteCustomSkill(body.name);

        return json({ success: true });
      }
      default:
        return json({ error: 'Unknown intent' }, { status: 400 });
    }
  } catch (error: any) {
    return json({ error: error?.message || 'Skill import failed' }, { status: 422 });
  }
}
