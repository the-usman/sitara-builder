import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

/*
 * WebContainer needs the page to be cross-origin isolated (SharedArrayBuffer). If that
 * isn't set up correctly for the environment we're running in, boot() hangs forever with
 * no error or rejection — every action waiting on it (file writes, shell commands) then
 * sits at "pending" indefinitely, which shows up as a chat restore stuck forever on
 * "Creating initial files" with no error anywhere. Race it against a timeout so a broken
 * environment fails loudly instead of hanging silently.
 */
const BOOT_TIMEOUT_MS = 30_000;

function bootWithTimeout(): Promise<WebContainer> {
  return Promise.race([
    WebContainer.boot({
      coep: 'credentialless',
      workdirName: WORK_DIR_NAME,
      forwardPreviewErrors: true, // Enable error forwarding from iframes
    }),
    new Promise<WebContainer>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `WebContainer failed to start within ${BOOT_TIMEOUT_MS / 1000}s. This usually means the page ` +
              `isn't cross-origin isolated (missing Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy ` +
              `headers) — check that the server serving this page sets them.`,
          ),
        );
      }, BOOT_TIMEOUT_MS);
    }),
  ]);
}

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => bootWithTimeout())
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        // Listen for preview errors
        webcontainer.on('preview-message', (message) => {
          console.log('WebContainer preview message:', message);

          // Handle both uncaught exceptions and unhandled promise rejections
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            const title = isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title,
              description: 'message' in message ? message.message : 'Unknown error',
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        return webcontainer;
      })
      .catch((error) => {
        console.error('WebContainer failed to boot:', error);
        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
