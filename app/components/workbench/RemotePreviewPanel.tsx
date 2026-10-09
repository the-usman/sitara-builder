import { memo, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import {
  reconnectRemotePreview,
  remotePreview,
  remoteSandboxAvailable,
  runRemotePreview,
} from '~/lib/sandbox/remote-sandbox.client';
import { workbenchStore } from '~/lib/stores/workbench';

const STATUS_TEXT: Record<string, string> = {
  idle: 'The preview is not running.',
  syncing: 'Uploading project files to the sandbox…',
  installing: 'Installing dependencies on Vercel…',
  starting: 'Starting the dev server on Vercel…',
  running: 'Your preview is live on Vercel.',
  stopped: 'Preview stopped to save credits.',
  error: 'Something went wrong.',
};

const PRIMARY_BUTTON =
  'px-4 py-2 rounded-md bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'px-4 py-2 rounded-md border border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 disabled:opacity-50 disabled:cursor-not-allowed';

function runPreview() {
  void runRemotePreview(workbenchStore.boltTerminal.terminal);
}

/** Shown in the Preview tab until the sandbox's dev server is live (then the site is embedded). */
export const RemotePreviewPanel = memo(() => {
  const state = useStore(remotePreview);
  const available = useStore(remoteSandboxAvailable);
  const url = 'url' in state ? state.url : undefined;
  const openedFor = useRef<string | undefined>(undefined);

  // Showing "not running"? The sandbox may already serve the preview (reload, status mix-up).
  useEffect(() => {
    if (state.status === 'idle' || state.status === 'stopped') {
      void reconnectRemotePreview();
    }
  }, [state.status]);

  // Opening a tab without a click is usually blocked, so only a hint toast fires automatically.
  useEffect(() => {
    if (state.status === 'running' && openedFor.current !== state.url) {
      openedFor.current = state.url;
      toast.success('Preview is ready — click "Open preview" to view it.');
    }
  }, [state]);

  const busy = state.status === 'syncing' || state.status === 'installing' || state.status === 'starting';
  const running = state.status === 'running';

  if (available === false) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bolt-elements-background-depth-1 p-6">
        <div className="max-w-md flex flex-col items-center gap-3 text-center">
          <div className="i-ph:plugs text-4xl text-bolt-elements-textSecondary" />
          <div className="text-bolt-elements-textPrimary font-medium">Previews are not set up</div>
          <div className="text-sm text-bolt-elements-textSecondary">
            Projects run in a Vercel Sandbox. Ask a super admin to set VERCEL_TOKEN, VERCEL_TEAM_ID and
            VERCEL_PROJECT_ID on the server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-bolt-elements-background-depth-1 p-6">
      <div className="max-w-md w-full flex flex-col items-center gap-4 text-center">
        <div
          className={`text-4xl ${
            state.status === 'error'
              ? 'i-ph:warning-circle text-red-500'
              : busy
                ? 'i-svg-spinners:90-ring-with-bg text-bolt-elements-textSecondary'
                : 'i-ph:globe-hemisphere-west text-bolt-elements-textPrimary'
          }`}
        />
        <div className="text-bolt-elements-textPrimary font-medium">{STATUS_TEXT[state.status] ?? ''}</div>
        {state.status === 'error' && (
          <div className="text-sm text-bolt-elements-textSecondary break-words">{state.error}</div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {running && url && (
            <button type="button" className={PRIMARY_BUTTON} onClick={() => window.open(url, '_blank', 'noopener')}>
              Open preview
            </button>
          )}

          {state.status === 'idle' ? (
            <button type="button" className={PRIMARY_BUTTON} onClick={runPreview}>
              Run preview
            </button>
          ) : (
            <button
              type="button"
              className={running ? SECONDARY_BUTTON : PRIMARY_BUTTON}
              disabled={busy}
              onClick={runPreview}
              title="Reinstall dependencies and restart the dev server"
            >
              Restart preview
            </button>
          )}
        </div>

        {running && url && (
          <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary max-w-full">
            <span className="truncate">{url}</span>
            <button
              type="button"
              className="i-ph:copy shrink-0 hover:text-bolt-elements-textPrimary"
              title="Copy link"
              onClick={() => {
                navigator.clipboard.writeText(url).then(() => toast.success('Preview link copied'));
              }}
            />
          </div>
        )}

        <div className="text-xs text-bolt-elements-textTertiary">
          Runs in a Vercel Sandbox and appears here once it's live. Edits sync automatically. The sandbox stops when you
          close this chat or leave it idle.
        </div>
      </div>
    </div>
  );
});
