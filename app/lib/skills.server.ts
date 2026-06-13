import dns from 'dns';
import { MongoClient, type Collection } from 'mongodb';
import JSZip from 'jszip';
import type { PromptSkill } from '~/lib/common/prompts/skills';

// Cloudflare Workers handles SRV natively. Only fix DNS in local Node.js dev.
if (typeof navigator === 'undefined' || navigator.userAgent !== 'Cloudflare-Workers') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/';
const DB_NAME = 'project_db_client';
const COLLECTION = 'custom_skills';

// Keep imported skill bodies bounded so a single skill can't blow up the prompt
const MAX_BODY_CHARS = 32_000;

export interface CustomSkillDoc {
  name: string;
  description: string;
  body: string;

  /** Optional regex source matched against recent user messages; falls back to name words */
  triggers?: string;

  /** Load on every request regardless of triggers */
  alwaysLoad?: boolean;
  enabled: boolean;
  source: { type: 'git' | 'zip' | 'md'; ref?: string };
  createdBy: { userId: string; email: string };
  createdAt: Date;
  updatedAt: Date;
}

async function getCollection(): Promise<{ collection: Collection<CustomSkillDoc>; client: MongoClient }> {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  return { collection: client.db(DB_NAME).collection<CustomSkillDoc>(COLLECTION), client };
}

/*
 * ---------------------------------------------------------------------------
 * SKILL.md parsing — compatible with Claude skills (YAML frontmatter + body)
 * ---------------------------------------------------------------------------
 */

export interface ParsedSkill {
  name: string;
  description: string;
  triggers?: string;
  body: string;
}

export function parseSkillMd(raw: string, fallbackName?: string): ParsedSkill {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  let name = '';
  let description = '';
  let triggers: string | undefined;
  let body = text;

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);

  if (fmMatch) {
    body = text.slice(fmMatch[0].length);

    // Flat key: value lines only — nested YAML (metadata blocks) is ignored
    for (const line of fmMatch[1].split('\n')) {
      const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);

      if (!kv) {
        continue;
      }

      const key = kv[1].toLowerCase();
      const value = kv[2].trim().replace(/^['"]|['"]$/g, '');

      if (key === 'name') {
        name = value;
      } else if (key === 'description') {
        description = value;
      } else if (key === 'triggers') {
        triggers = value || undefined;
      }
    }
  }

  if (!name) {
    // Fall back to the first markdown heading, then the filename
    const heading = body.match(/^#\s+(.+)$/m);
    name = heading?.[1] || fallbackName || '';
  }

  name = name
    .toLowerCase()
    .trim()
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  if (!name) {
    throw new Error('Skill has no name — add a `name:` field in the SKILL.md frontmatter.');
  }

  if (!description) {
    // First non-empty, non-heading line as a fallback description
    description =
      body
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith('#')) || name;
  }

  body = body.trim();

  if (!body) {
    throw new Error('Skill body is empty.');
  }

  if (body.length > MAX_BODY_CHARS) {
    throw new Error(`Skill body is too large (${body.length} chars, max ${MAX_BODY_CHARS}).`);
  }

  if (triggers) {
    new RegExp(triggers, 'i'); // throws early on an invalid pattern
  }

  return { name, description: description.slice(0, 500), triggers, body };
}

/*
 * ---------------------------------------------------------------------------
 * Importers — git URL, zip upload, raw markdown
 * ---------------------------------------------------------------------------
 */

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url, { headers: { 'User-Agent': 'sitara-skill-importer' } });

  if (!response.ok) {
    return null;
  }

  return await response.text();
}

export async function importSkillFromGit(url: string): Promise<ParsedSkill> {
  const trimmed = url.trim().replace(/\/+$/, '');

  // Direct link to a markdown file (raw or GitHub blob view)
  if (/\.md(\?.*)?$/i.test(trimmed)) {
    const rawUrl = trimmed
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/')
      .replace('/raw/', '/');
    const md = await fetchText(rawUrl);

    if (!md) {
      throw new Error(`Could not fetch markdown from ${rawUrl}`);
    }

    return parseSkillMd(md, trimmed.split('/').pop());
  }

  // GitHub repo URL, optionally pointing at a subfolder: github.com/owner/repo[/tree/branch[/path]]
  const gh = trimmed.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.*))?)?$/);

  if (gh) {
    const [, owner, repo, branch, subPath] = gh;
    const branches = branch ? [branch] : ['HEAD', 'main', 'master'];
    const dir = subPath ? `${subPath}/` : '';

    for (const b of branches) {
      for (const file of ['SKILL.md', 'skill.md', 'README.md']) {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${dir}${file}`;
        const md = await fetchText(rawUrl);

        if (md) {
          return parseSkillMd(md, repo);
        }
      }
    }

    throw new Error('No SKILL.md (or README.md) found in that repository. Point the URL at the skill folder.');
  }

  // Last resort: treat the URL as a raw markdown endpoint
  const md = await fetchText(trimmed);

  if (md && !md.trim().startsWith('<')) {
    return parseSkillMd(md, trimmed.split('/').pop());
  }

  throw new Error('Unsupported URL. Use a GitHub repo/folder URL or a direct link to a .md file.');
}

export async function importSkillFromZip(base64: string, filename?: string): Promise<ParsedSkill> {
  const zip = await JSZip.loadAsync(Buffer.from(base64, 'base64'));
  const candidates = Object.keys(zip.files).filter((p) => /(^|\/)skill\.md$/i.test(p) && !zip.files[p].dir);

  // Prefer the shallowest SKILL.md (skill zips often nest one folder deep)
  candidates.sort((a, b) => a.split('/').length - b.split('/').length);

  const entry = candidates[0];

  if (!entry) {
    throw new Error('No SKILL.md found inside the zip.');
  }

  const md = await zip.files[entry].async('string');

  return parseSkillMd(md, filename?.replace(/\.zip$/i, ''));
}

/*
 * ---------------------------------------------------------------------------
 * CRUD + prompt integration
 * ---------------------------------------------------------------------------
 */

export async function saveCustomSkill(
  parsed: ParsedSkill,
  source: CustomSkillDoc['source'],
  createdBy: CustomSkillDoc['createdBy'],
  options?: { triggers?: string; alwaysLoad?: boolean },
): Promise<CustomSkillDoc> {
  const { collection, client } = await getCollection();

  try {
    const now = new Date();
    const triggers = options?.triggers?.trim() || parsed.triggers;

    if (triggers) {
      new RegExp(triggers, 'i');
    }

    const doc = {
      name: parsed.name,
      description: parsed.description,
      body: parsed.body,
      ...(triggers ? { triggers } : {}),
      alwaysLoad: !!options?.alwaysLoad,
      enabled: true,
      source,
      createdBy,
      updatedAt: now,
    };

    await collection.updateOne(
      { name: parsed.name },
      { $set: doc, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    invalidateSkillsCache();

    return (await collection.findOne({ name: parsed.name })) as CustomSkillDoc;
  } finally {
    await client.close();
  }
}

export async function listCustomSkills(): Promise<Array<Omit<CustomSkillDoc, 'body'> & { bodyChars: number }>> {
  const { collection, client } = await getCollection();

  try {
    const docs = await collection.find({}).sort({ name: 1 }).toArray();

    return docs.map(({ body, ...rest }) => ({ ...rest, bodyChars: body.length }));
  } finally {
    await client.close();
  }
}

export async function setCustomSkillEnabled(name: string, enabled: boolean): Promise<void> {
  const { collection, client } = await getCollection();

  try {
    await collection.updateOne({ name }, { $set: { enabled, updatedAt: new Date() } });
    invalidateSkillsCache();
  } finally {
    await client.close();
  }
}

export async function deleteCustomSkill(name: string): Promise<void> {
  const { collection, client } = await getCollection();

  try {
    await collection.deleteOne({ name });
    invalidateSkillsCache();
  } finally {
    await client.close();
  }
}

// Short-lived cache so every chat message doesn't pay a Mongo roundtrip
let skillsCache: { skills: PromptSkill[]; loadedAt: number } | null = null;
let disabledBuiltinsCache: { names: string[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidateSkillsCache() {
  skillsCache = null;
  disabledBuiltinsCache = null;
}

/*
 * ---------------------------------------------------------------------------
 * Built-in skill enable/disable — stored as a single settings doc
 * ---------------------------------------------------------------------------
 */

const SETTINGS_COLLECTION = 'skill_settings';
const BUILTIN_SETTINGS_ID = 'builtin_disabled';

export async function getDisabledBuiltinSkillNames(): Promise<string[]> {
  if (disabledBuiltinsCache && Date.now() - disabledBuiltinsCache.loadedAt < CACHE_TTL_MS) {
    return disabledBuiltinsCache.names;
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();

    const doc = await client
      .db(DB_NAME)
      .collection(SETTINGS_COLLECTION)
      .findOne({ _id: BUILTIN_SETTINGS_ID as any });
    const names: string[] = Array.isArray(doc?.names) ? doc.names : [];
    disabledBuiltinsCache = { names, loadedAt: Date.now() };

    return names;
  } finally {
    await client.close();
  }
}

export async function setBuiltinSkillEnabled(name: string, enabled: boolean): Promise<void> {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    await client
      .db(DB_NAME)
      .collection(SETTINGS_COLLECTION)
      .updateOne(
        { _id: BUILTIN_SETTINGS_ID as any },
        enabled ? { $pull: { names: name } } : ({ $addToSet: { names: name } } as any),
        { upsert: true },
      );
    invalidateSkillsCache();
  } finally {
    await client.close();
  }
}

function triggersFromName(name: string): RegExp {
  const words = name.split('-').filter((w) => w.length > 3);
  const parts = [name, name.replace(/-/g, ' '), ...words];

  return new RegExp(`\\b(${parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
}

function toPromptSkill(doc: CustomSkillDoc): PromptSkill {
  const tagName = doc.name.replace(/-/g, '_');

  return {
    name: doc.name,
    description: doc.description,
    triggers: doc.triggers ? new RegExp(doc.triggers, 'i') : triggersFromName(doc.name),
    ...(doc.alwaysLoad ? { alwaysLoad: true } : {}),
    body: () => `<${tagName}_skill>\n${doc.body}\n</${tagName}_skill>`,
  };
}

export async function getActiveCustomPromptSkills(): Promise<PromptSkill[]> {
  if (skillsCache && Date.now() - skillsCache.loadedAt < CACHE_TTL_MS) {
    return skillsCache.skills;
  }

  const { collection, client } = await getCollection();

  try {
    const docs = await collection.find({ enabled: true }).toArray();
    const skills = docs.map(toPromptSkill);
    skillsCache = { skills, loadedAt: Date.now() };

    return skills;
  } finally {
    await client.close();
  }
}
