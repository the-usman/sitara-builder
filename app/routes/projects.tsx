import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { requireFreshAuth } from '~/lib/auth.server';
import { getChats, type ChatRecord } from '~/lib/project-tracker.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await requireFreshAuth(request, env);
  const chats = await getChats(user.userId, user.role, env);

  return json({ chats, role: user.role });
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number) {
  if (!n) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function ModelBadges({ models }: { models: ChatRecord['models'] }) {
  const entries = Object.values(models || {});

  if (!entries.length) {
    return <span className="text-gray-600 text-xs">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((m) => (
        <span
          key={`${m.model}:${m.provider}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs"
          title={`Prompt: ${m.promptTokens} | Completion: ${m.completionTokens} | Cost: ${formatCost(m.cost || 0)}`}
        >
          {m.model}
          <span className="text-purple-400/60">·</span>
          {formatTokens(m.totalTokens)}
        </span>
      ))}
    </div>
  );
}

function UrlLink({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return <span className="text-gray-600 text-xs">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate max-w-[140px]"
      title={href}
    >
      {label}
    </a>
  );
}

export default function ChatsPage() {
  const { chats, role } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white transition-colors">
            <div className="i-ph:arrow-left text-lg" />
          </a>
          <h1 className="text-lg font-semibold">Chats</h1>
          {role === 'super_admin' && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300">
              All Clients
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {chats.length} chat{chats.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="p-6">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <div className="i-ph:chat-circle text-5xl mb-3 opacity-30" />
            <p className="text-sm">No chats yet. Start a conversation to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Chat</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Created By</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Models & Tokens</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Total Tokens</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Total Cost</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">GitHub</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Netlify</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Vercel</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {(chats as unknown as ChatRecord[]).map((c, i) => (
                  <tr
                    key={c.trackingId}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      i % 2 === 0 ? '' : 'bg-white/[0.01]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      {/*
                       * Prefer clientChatId (the IndexedDB chat ID), but fall back to
                       * trackingId — clientChatId is often never recorded, because a new
                       * chat has no IndexedDB row until after its first response. The chat
                       * route resolves a trackingId against local chats first, then against
                       * synced history, so this link works on any device.
                       */}
                      <a
                        href={`/chat/${c.clientChatId || c.trackingId}`}
                        className="font-medium text-white hover:text-purple-300 transition-colors"
                      >
                        {c.name || c.trackingId}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-300">{c.client?.clientName}</div>
                      <div className="text-gray-500 text-xs">{c.client?.productName}</div>
                      {c.createdBy?.name && <div className="text-gray-700 text-xs mt-0.5">by {c.createdBy.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <ModelBadges models={c.models} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {formatTokens(c.totalTokens || 0)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                      {formatCost(c.totalCost || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <UrlLink href={c.githubUrl} label="GitHub" />
                    </td>
                    <td className="px-4 py-3">
                      <UrlLink href={c.netlifyUrl} label="Netlify" />
                    </td>
                    <td className="px-4 py-3">
                      <UrlLink href={c.vercelUrl} label="Vercel" />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
