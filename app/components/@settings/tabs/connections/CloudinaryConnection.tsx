import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppConfigStatus } from '~/lib/hooks/useAppConfig';
import { syncProviderConfig } from '~/lib/config/sync-config.client';

/**
 * Cloudinary is only ever the shared, admin-managed account — unlike GitHub/Netlify/Vercel
 * there is no per-browser "personal connection" concept for it (the upload always runs
 * signed, server-side), so this form just edits the shared config directly instead of
 * mirroring the localStorage-backed connection stores the other providers use.
 */
export default function CloudinaryConnection() {
  const { status, isLoading, refresh } = useAppConfigStatus();
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status?.cloudinary.label) {
      setCloudName(status.cloudinary.label);
    }
  }, [status?.cloudinary.label]);

  const handleSave = async () => {
    if (!cloudName || !apiKey || !apiSecret) {
      toast.error('Cloud name, API key, and API secret are all required.');
      return;
    }

    setIsSaving(true);

    try {
      const ok = await syncProviderConfig({
        cloudinary: { cloudName, apiKey, apiSecret, label: cloudName },
      });

      if (ok) {
        toast.success('Cloudinary connected');
        setApiKey('');
        setApiSecret('');
        await refresh();
      } else {
        toast.error('Failed to save Cloudinary credentials');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      className="bg-bolt-elements-background dark:bg-bolt-elements-background rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="i-ph:cloud-arrow-up w-5 h-5 text-bolt-elements-item-contentAccent" />
          <h3 className="text-base font-medium text-bolt-elements-textPrimary">Cloudinary</h3>
          {status?.cloudinary.configured && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </span>
          )}
        </div>
        <p className="text-sm text-bolt-elements-textSecondary">
          Used for the "Upload to Cloudinary" option in the file explorer. Uploads always run signed, server-side — the
          API secret never reaches the browser.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={cloudName}
            onChange={(e) => setCloudName(e.target.value)}
            placeholder="Cloud name"
            className="px-3 py-2 rounded-md bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-sm text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary"
          />
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API key"
            className="px-3 py-2 rounded-md bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-sm text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary"
          />
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={status?.cloudinary.hint ? `API secret (${status.cloudinary.hint})` : 'API secret'}
            className="px-3 py-2 rounded-md bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-sm text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-4 py-2 rounded-md bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text text-sm font-medium hover:bg-bolt-elements-button-primary-backgroundHover disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Cloudinary credentials'}
        </button>
      </div>
    </motion.div>
  );
}
