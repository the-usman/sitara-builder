import { motion } from 'framer-motion';
import { useAppConfigStatus } from '~/lib/hooks/useAppConfig';
import type { ConfigProviderStatus } from '~/lib/config/types';

interface ProviderRow {
  key: string;
  name: string;
  icon: string;
  status: ConfigProviderStatus;
  detail?: string;
}

function StatusPill({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        configured
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-green-500' : 'bg-bolt-elements-textTertiary'}`} />
      {configured ? 'Connected' : 'Not configured'}
    </span>
  );
}

function ProviderCard({ row, index }: { row: ProviderRow; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="flex items-center gap-4 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-4 py-3"
    >
      <div className={`${row.icon} h-5 w-5 shrink-0 text-bolt-elements-textSecondary`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-bolt-elements-textPrimary">{row.name}</p>
        <p className="truncate text-xs text-bolt-elements-textTertiary">
          {row.status.configured ? row.detail || row.status.label || row.status.hint || 'Managed centrally' : '—'}
        </p>
      </div>
      <StatusPill configured={row.status.configured} />
    </motion.li>
  );
}

/**
 * Read-only view of the shared integration config, shown to operators in place
 * of the editable connection forms. It reports what an administrator has wired
 * up so a failed deploy is diagnosable, without exposing any credential.
 */
export default function ManagedConnectionsSummary() {
  const { status, isLoading, error } = useAppConfigStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-bolt-elements-textSecondary">
        <div className="i-ph:circle-notch h-4 w-4 animate-spin" />
        Loading configuration…
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4 text-sm text-bolt-elements-textSecondary">
        Could not load the shared configuration. {error}
      </div>
    );
  }

  const configuredKeys = Object.entries(status.apiKeys).filter(([, isSet]) => isSet);

  const rows: ProviderRow[] = [
    { key: 'github', name: 'GitHub', icon: 'i-ph:github-logo', status: status.github },
    { key: 'vercel', name: 'Vercel', icon: 'i-ph:triangle', status: status.vercel },
    { key: 'netlify', name: 'Netlify', icon: 'i-ph:cloud', status: status.netlify },
    {
      key: 'supabase',
      name: 'Supabase',
      icon: 'i-ph:database',
      status: status.supabase,
      detail: status.supabase.label || status.supabase.selectedProjectId,
    },
    { key: 'cloudinary', name: 'Cloudinary', icon: 'i-ph:cloud-arrow-up', status: status.cloudinary },
    {
      key: 'llm',
      name: 'AI providers',
      icon: 'i-ph:sparkle',
      status: { configured: configuredKeys.length > 0 },
      detail: configuredKeys.map(([provider]) => provider).join(', '),
    },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-4 py-3">
        <div className="i-ph:lock-key mt-0.5 h-5 w-5 shrink-0 text-bolt-elements-textSecondary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-medium text-bolt-elements-textPrimary">Managed by your administrator</h2>
          <p className="mt-0.5 text-xs text-bolt-elements-textTertiary">
            Integration credentials are configured centrally and shared across the workspace. Contact a super admin to
            change them.
          </p>
        </div>
      </header>

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <ProviderCard key={row.key} row={row} index={index} />
        ))}
      </ul>

      {status.updatedAt && (
        <p className="px-1 text-xs text-bolt-elements-textTertiary">
          Last updated {new Date(status.updatedAt).toLocaleString()}
          {status.updatedBy ? ` by ${status.updatedBy}` : ''}
        </p>
      )}
    </div>
  );
}
