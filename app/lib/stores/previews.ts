import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';

// Extend Window interface to include our custom property
declare global {
  interface Window {
    _tabId?: string;
  }
}

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

// Create a broadcast channel for preview updates
const PREVIEW_CHANNEL = 'preview-updates';

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;
  #broadcastChannel: BroadcastChannel | null = null;
  #lastUpdate = new Map<string, number>();
  #watchedFiles = new Set<string>();
  #refreshTimeouts = new Map<string, NodeJS.Timeout>();
  #REFRESH_DELAY = 300;
  #storageChannel: BroadcastChannel | null = null;

  previews = atom<PreviewInfo[]>([]);

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    if (typeof BroadcastChannel !== 'undefined') {
      this.#broadcastChannel = new BroadcastChannel(PREVIEW_CHANNEL);
      this.#storageChannel = new BroadcastChannel('storage-sync-channel');

      // Listen for preview updates from other tabs
      this.#broadcastChannel.onmessage = (event) => {
        const { type, previewId } = event.data;

        if (type === 'file-change') {
          const timestamp = event.data.timestamp;
          const lastUpdate = this.#lastUpdate.get(previewId) || 0;

          if (timestamp > lastUpdate) {
            this.#lastUpdate.set(previewId, timestamp);
            this.refreshPreview(previewId);
          }
        }
      };

      // Listen for storage sync messages
      this.#storageChannel.onmessage = (event) => {
        const { storage, source } = event.data;

        if (storage && source !== this._getTabId()) {
          this._syncStorage(storage);
        }
      };
    }

    // Override localStorage setItem to catch all changes
    if (typeof window !== 'undefined') {
      const originalSetItem = localStorage.setItem;

      localStorage.setItem = (...args) => {
        originalSetItem.apply(localStorage, args);
        this.#changedStorageKeys.add(String(args[0]));
        this._scheduleStorageSync();
      };
    }

    this.#init();
  }

  // Generate a unique ID for this tab
  private _getTabId(): string {
    if (typeof window !== 'undefined') {
      if (!window._tabId) {
        window._tabId = Math.random().toString(36).substring(2, 15);
      }

      return window._tabId;
    }

    return '';
  }

  /*
   * Sync storage data between tabs. Only keys whose value actually differs are written, and previews are
   * NOT reloaded: the preview iframe lives on a different origin and cannot see this storage, so reloading
   * it here only threw away the running page (very costly for heavy 3D/animated sites) every time anything
   * in another tab touched localStorage.
   */
  private _syncStorage(storage: Record<string, string>) {
    if (typeof window !== 'undefined') {
      const originalSetItem = Object.getPrototypeOf(localStorage).setItem;

      Object.entries(storage).forEach(([key, value]) => {
        try {
          if (localStorage.getItem(key) !== value) {
            originalSetItem.call(localStorage, key, value);
          }
        } catch (error) {
          console.error('[Preview] Error syncing storage:', error);
        }
      });
    }
  }

  // Keys written since the last broadcast — only these are sent, not the whole of localStorage
  #changedStorageKeys = new Set<string>();

  // Debounce so bursts of localStorage writes collapse into a single broadcast
  #storageSyncTimeout: NodeJS.Timeout | null = null;

  private _scheduleStorageSync() {
    if (this.#storageSyncTimeout) {
      return;
    }

    this.#storageSyncTimeout = setTimeout(() => {
      this.#storageSyncTimeout = null;
      this._broadcastStorageSync();
    }, 300);
  }

  // Broadcast storage state to other tabs
  private _broadcastStorageSync() {
    if (typeof window !== 'undefined') {
      const storage: Record<string, string> = {};

      for (const key of this.#changedStorageKeys) {
        const value = localStorage.getItem(key);

        if (value !== null) {
          storage[key] = value;
        }
      }

      this.#changedStorageKeys.clear();

      if (Object.keys(storage).length === 0) {
        return;
      }

      this.#storageChannel?.postMessage({
        type: 'storage-sync',
        storage,
        source: this._getTabId(),
        timestamp: Date.now(),
      });
    }
  }

  async #init() {
    const webcontainer = await this.#webcontainer;

    // Listen for server ready events
    webcontainer.on('server-ready', (port, url) => {
      console.log('[Preview] Server ready on port:', port, url);
      this.broadcastUpdate(url);

      // Initial storage sync when preview is ready
      this._broadcastStorageSync();
    });

    try {
      // Watch for file changes
      webcontainer.internal.watchPaths(
        {
          // Only watch specific file types that affect the preview
          include: ['**/*.html', '**/*.css', '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.json'],
          exclude: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '**/.next/**',
            '**/.nuxt/**',
            '**/.svelte-kit/**',
            '**/.vite/**',
            '**/.turbo/**',
            '**/.cache/**',
            '**/.parcel-cache/**',
            '**/.vercel/**',
          ],
        },
        () => this.#scheduleFileChangeBroadcast(),
      );
    } catch (error) {
      console.error('[Preview] Error setting up watchers:', error);
    }

    // Listen for port events
    webcontainer.on('port', (port, type, url) => {
      let previewInfo = this.#availablePreviews.get(port);

      if (type === 'close' && previewInfo) {
        this.#availablePreviews.delete(port);
        this.previews.set(this.previews.get().filter((preview) => preview.port !== port));

        return;
      }

      const previews = this.previews.get();

      if (!previewInfo) {
        previewInfo = { port, ready: type === 'open', baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
        previews.push(previewInfo);
      }

      previewInfo.ready = type === 'open';
      previewInfo.baseUrl = url;

      this.previews.set([...previews]);

      if (type === 'open') {
        this.broadcastUpdate(url);
      }
    });
  }

  /*
   * The watcher fires for every file the AI writes or npm touches. Refreshing the preview on each event meant a
   * full page reload per file — which also defeats the dev server's hot reload. Wait until the writes go quiet
   * and refresh once.
   */
  #fileChangeTimeout: NodeJS.Timeout | null = null;
  #FILE_CHANGE_QUIET_MS = 1000;

  #scheduleFileChangeBroadcast() {
    if (this.#fileChangeTimeout) {
      clearTimeout(this.#fileChangeTimeout);
    }

    this.#fileChangeTimeout = setTimeout(() => {
      this.#fileChangeTimeout = null;

      for (const preview of this.previews.get()) {
        const previewId = this.getPreviewId(preview.baseUrl);

        if (previewId) {
          this.broadcastFileChange(previewId);
        }
      }
    }, this.#FILE_CHANGE_QUIET_MS);
  }

  // Helper to extract preview ID from URL
  getPreviewId(url: string): string | null {
    const match = url.match(/^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/);
    return match ? match[1] : null;
  }

  // Broadcast state change to all tabs
  broadcastStateChange(previewId: string) {
    const timestamp = Date.now();
    this.#lastUpdate.set(previewId, timestamp);

    this.#broadcastChannel?.postMessage({
      type: 'state-change',
      previewId,
      timestamp,
    });
  }

  // Broadcast file change to all tabs
  broadcastFileChange(previewId: string) {
    const timestamp = Date.now();
    this.#lastUpdate.set(previewId, timestamp);

    this.#broadcastChannel?.postMessage({
      type: 'file-change',
      previewId,
      timestamp,
    });
  }

  // Broadcast update to all tabs
  broadcastUpdate(url: string) {
    const previewId = this.getPreviewId(url);

    if (previewId) {
      const timestamp = Date.now();
      this.#lastUpdate.set(previewId, timestamp);

      this.#broadcastChannel?.postMessage({
        type: 'file-change',
        previewId,
        timestamp,
      });
    }
  }

  // Method to refresh a specific preview
  refreshPreview(previewId: string) {
    // Clear any pending refresh for this preview
    const existingTimeout = this.#refreshTimeouts.get(previewId);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new timeout for this refresh
    const timeout = setTimeout(() => {
      const previews = this.previews.get();
      const preview = previews.find((p) => this.getPreviewId(p.baseUrl) === previewId);

      if (preview) {
        preview.ready = false;
        this.previews.set([...previews]);

        requestAnimationFrame(() => {
          preview.ready = true;
          this.previews.set([...previews]);
        });
      }

      this.#refreshTimeouts.delete(previewId);
    }, this.#REFRESH_DELAY);

    this.#refreshTimeouts.set(previewId, timeout);
  }

  refreshAllPreviews() {
    const previews = this.previews.get();

    for (const preview of previews) {
      const previewId = this.getPreviewId(preview.baseUrl);

      if (previewId) {
        this.broadcastFileChange(previewId);
      }
    }
  }
}

// Create a singleton instance
let previewsStore: PreviewsStore | null = null;

export function usePreviewStore() {
  if (!previewsStore) {
    /*
     * Initialize with a Promise that resolves to WebContainer
     * This should match how you're initializing WebContainer elsewhere
     */
    previewsStore = new PreviewsStore(Promise.resolve({} as WebContainer));
  }

  return previewsStore;
}
