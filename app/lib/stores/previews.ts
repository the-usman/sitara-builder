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
  #broadcastChannel: BroadcastChannel | null = null;
  #lastUpdate = new Map<string, number>();
  #refreshTimeouts = new Map<string, NodeJS.Timeout>();
  #REFRESH_DELAY = 300;
  #storageChannel: BroadcastChannel | null = null;

  previews = atom<PreviewInfo[]>([]);

  constructor() {
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

  /**
   * Previews run in a Vercel Sandbox (app/lib/sandbox); the workbench mirrors its public URL here
   * so the preview pane can show it inline. `undefined` clears it (stopped, restarting, new chat).
   */
  setRemotePreview(url: string | undefined) {
    const current = this.previews.get()[0];

    if (!url) {
      if (current) {
        this.#availablePreviews.clear();
        this.previews.set([]);
      }

      return;
    }

    if (current?.baseUrl === url) {
      return;
    }

    const preview: PreviewInfo = { port: 443, ready: true, baseUrl: url };
    this.#availablePreviews.clear();
    this.#availablePreviews.set(preview.port, preview);
    this.previews.set([preview]);
  }

  // Helper to extract preview ID from URL — sandbox previews live on their own subdomain (sb-xxxx.vercel.run).
  getPreviewId(url: string): string | null {
    try {
      return new URL(url).hostname.split('.')[0] || null;
    } catch {
      return null;
    }
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
    previewsStore = new PreviewsStore();
  }

  return previewsStore;
}
