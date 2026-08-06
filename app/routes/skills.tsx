import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import { useRef, useState } from 'react';
import { requireAuth } from '~/lib/auth.server';
import { getDisabledBuiltinSkillNames, listCustomSkills } from '~/lib/skills.server';
import { promptSkills } from '~/lib/common/prompts/skills';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireAuth(request, env);
  const [customSkills, disabledBuiltins] = await Promise.all([
    listCustomSkills(env),
    getDisabledBuiltinSkillNames(env),
  ]);
  const builtIn = promptSkills.map((s) => ({
    name: s.name,
    description: s.description,
    enabled: !disabledBuiltins.includes(s.name),
  }));

  return json({ customSkills, builtIn, isSuperAdmin: user.role === 'super_admin' });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1)); // strip data: prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SkillsPage() {
  const { customSkills, builtIn, isSuperAdmin } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [gitUrl, setGitUrl] = useState('');
  const [triggers, setTriggers] = useState('');
  const [alwaysLoad, setAlwaysLoad] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const callApi = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { success?: boolean; error?: string; skill?: { name: string } };

      if (!response.ok || data.error) {
        setMessage({ type: 'error', text: data.error || `Request failed (${response.status})` });
      } else {
        if (data.skill) {
          setMessage({ type: 'success', text: `Skill "${data.skill.name}" added.` });
          setGitUrl('');
          setTriggers('');
          setAlwaysLoad(false);
        }

        revalidator.revalidate();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  const extraOptions = {
    ...(triggers.trim() ? { triggers: triggers.trim() } : {}),
    ...(alwaysLoad ? { alwaysLoad: true } : {}),
  };

  const importFromGit = () => {
    if (gitUrl.trim()) {
      callApi({ intent: 'add-git', url: gitUrl.trim(), ...extraOptions });
    }
  };

  const importFromFile = async (file: File) => {
    if (/\.zip$/i.test(file.name)) {
      const dataBase64 = await fileToBase64(file);
      callApi({ intent: 'add-zip', dataBase64, filename: file.name, ...extraOptions });
    } else {
      const content = await file.text();
      callApi({ intent: 'add-md', content, filename: file.name, ...extraOptions });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white transition-colors">
            <div className="i-ph:arrow-left text-lg" />
          </a>
          <h1 className="text-lg font-semibold">Skills</h1>
          {isSuperAdmin && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300">
              Admin
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {builtIn.length} built-in · {customSkills.length} custom
        </span>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Add skill — super_admin only */}
        {isSuperAdmin && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="i-ph:plus-circle text-lg text-purple-400" />
              <h2 className="text-sm font-semibold">Add a skill</h2>
              <span className="text-xs text-gray-500">
                Claude-compatible SKILL.md — via GitHub URL, .zip, or .md upload
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && importFromGit()}
                placeholder="https://github.com/owner/repo  or  …/tree/main/skills/my-skill  or a direct SKILL.md link"
                className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={importFromGit}
                disabled={busy || !gitUrl.trim()}
                className="px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
              >
                {busy ? 'Importing…' : 'Import from Git'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="px-4 py-2.5 text-sm font-medium border border-white/[0.15] hover:border-purple-500 disabled:opacity-40 rounded-xl transition-colors"
              >
                Upload .zip / .md
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.zip,.markdown"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    importFromFile(file);
                  }

                  e.target.value = '';
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <input
                type="text"
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                placeholder="Optional trigger regex, e.g. pdf|invoice|report (defaults to the skill name)"
                className="flex-1 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-xs placeholder-gray-600 focus:outline-none focus:border-purple-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={alwaysLoad}
                  onChange={(e) => setAlwaysLoad(e.target.checked)}
                  className="accent-purple-500"
                />
                Always load (every request)
              </label>
            </div>

            {message && (
              <div
                className={`text-sm px-4 py-2.5 rounded-xl border ${
                  message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        )}

        {/* Custom skills */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Custom skills</h2>
          {customSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 rounded-xl border border-white/[0.08]">
              <div className="i-ph:puzzle-piece text-4xl mb-2 opacity-30" />
              <p className="text-sm">
                No custom skills yet.{isSuperAdmin ? ' Import one from a GitHub URL or upload a SKILL.md.' : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {customSkills.map((skill) => (
                <div
                  key={skill.name}
                  className={`flex items-center gap-4 rounded-xl border border-white/[0.08] px-4 py-3 ${
                    skill.enabled ? 'bg-white/[0.02]' : 'bg-white/[0.01] opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{skill.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        {skill.source?.type}
                      </span>
                      {skill.alwaysLoad && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          always
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{skill.description}</p>
                    <p className="text-[10px] text-gray-700 mt-0.5">
                      {Math.round(skill.bodyChars / 4)} tokens approx · by {skill.createdBy?.email} ·{' '}
                      {new Date(skill.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => callApi({ intent: 'toggle', name: skill.name, enabled: !skill.enabled })}
                        disabled={busy}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          skill.enabled
                            ? 'border-green-500/30 text-green-300 hover:bg-green-500/10'
                            : 'border-white/[0.15] text-gray-400 hover:border-white/[0.3]'
                        }`}
                      >
                        {skill.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete skill "${skill.name}"?`)) {
                            callApi({ intent: 'delete', name: skill.name });
                          }
                        }}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Built-in skills */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Built-in skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {builtIn.map((skill) => (
              <div
                key={skill.name}
                className={`rounded-xl border border-white/[0.08] px-4 py-3 ${
                  skill.enabled ? 'bg-white/[0.02]' : 'bg-white/[0.01] opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{skill.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    built-in
                  </span>
                  {!skill.enabled && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-300">
                      disabled
                    </span>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => callApi({ intent: 'toggle-builtin', name: skill.name, enabled: !skill.enabled })}
                      disabled={busy}
                      className={`ml-auto px-3 py-1 text-xs rounded-lg border transition-colors shrink-0 ${
                        skill.enabled
                          ? 'border-green-500/30 text-green-300 hover:bg-green-500/10'
                          : 'border-white/[0.15] text-gray-400 hover:border-white/[0.3]'
                      }`}
                    >
                      {skill.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
