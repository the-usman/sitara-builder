import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';

interface SketchfabModel {
  uid: string;
  name: string;
  author: string;
  license: string;
  thumbnail: string;
  embedUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  messages?: Array<{ role: string; content: any }>;
  chatModel?: string;
  chatProvider?: { name: string };
}

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Architecture', value: 'architecture' },
  { label: 'Characters', value: 'characters-creatures' },
  { label: 'Furniture', value: 'furniture-home' },
  { label: 'Vehicles', value: 'vehicles-transportation' },
  { label: 'Nature', value: 'nature-plants' },
  { label: 'Science & Tech', value: 'science-technology' },
  { label: 'Food & Drink', value: 'food-drink' },
  { label: 'Fashion', value: 'fashion-style' },
  { label: 'Art', value: 'art-abstract' },
];

const POPULAR_SEARCHES = ['robot', 'chair', 'building', 'car', 'tree', 'sword', 'spaceship', 'laptop'];

export function SketchfabModal({ open, onClose, sendMessage, messages, chatModel, chatProvider }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [cc0Only, setCc0Only] = useState(true);
  const [results, setResults] = useState<SketchfabModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SketchfabModel | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const hasContext = (messages?.length ?? 0) > 0 && chatModel && chatProvider;

  const search = async (q: string, cat: string, cc0: boolean, cursor?: string): Promise<SketchfabModel[]> => {
    setLoading(true);
    setError('');

    if (!cursor) {
      setResults([]);
      setSelected(null);
    }

    try {
      const params = new URLSearchParams({ q: q || 'architecture', count: '16' });

      if (cat) {
        params.set('category', cat);
      }

      if (cc0) {
        params.set('license', 'cc0');
      }

      if (cursor) {
        params.set('cursor', cursor);
      }

      const res = await fetch(`/api/sketchfab-search?${params}`);
      const data = (await res.json()) as any;

      if (data.error) {
        setError(data.error);
        return [];
      }

      const newResults: SketchfabModel[] = data.results ?? [];
      setResults((prev) => (cursor ? [...prev, ...newResults] : newResults));
      setNextCursor(data.nextCursor ?? null);
      return newResults;
    } catch (e: any) {
      setError(e.message || 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSelect = async () => {
    if (!hasContext) {
      toast.info('Start a conversation first so AI can understand what model to pick');
      return;
    }

    setAutoLoading(true);

    try {
      const res = await fetch('/api/sketchfab-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: chatModel, provider: chatProvider }),
      });
      const data = (await res.json()) as any;
      const aiQuery: string = data.query || 'architecture model';
      const aiCategory: string = data.category || '';

      setQuery(aiQuery);
      setCategory(aiCategory);

      const found = await search(aiQuery, aiCategory, cc0Only);

      if (found.length > 0) {
        setSelected(found[0]);
        toast.success(`AI selected: "${found[0].name}"`);
      } else {
        toast.info(`Searched for "${aiQuery}" — no results, try a different term`);
      }
    } catch (e: any) {
      toast.error('Auto-select failed: ' + (e.message || 'Unknown error'));
    } finally {
      setAutoLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      search(query, category, cc0Only);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    search(query, cat, cc0Only);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    search(query, category, cc0Only);
  };

  const handleQuickSearch = (q: string) => {
    setQuery(q);
    search(q, category, cc0Only);
  };

  const handleCc0Toggle = () => {
    const next = !cc0Only;
    setCc0Only(next);
    search(query, category, next);
  };

  const handleSelect = (model: SketchfabModel) => {
    setSelected((prev) => (prev?.uid === model.uid ? null : model));
  };

  const handleInsert = async () => {
    if (!selected || !sendMessage) {
      return;
    }

    setDownloadLoading(true);

    try {
      // Download GLB binary through our proxy
      const res = await fetch(`/api/sketchfab-download?uid=${selected.uid}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as any;
        toast.error(`Download failed: ${err.error || res.statusText}`, { autoClose: 7000 });
        return;
      }

      const buffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // Sanitize model name → filename
      const safeName = selected.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || selected.uid;

      const filePath = `public/models/${safeName}.glb`;

      // Write directly into the WebContainer — no AI tokens needed for this
      await workbenchStore.createFile(filePath, uint8);

      const sizeMb = (buffer.byteLength / 1024 / 1024).toFixed(1);
      toast.success(`Saved ${safeName}.glb (${sizeMb} MB) → ${filePath}`);

      // Send a SHORT message — AI only needs to know the file path
      sendMessage(
        {} as React.UIEvent,
        `3D model saved at \`/models/${safeName}.glb\` (${selected.name} by @${selected.author}, CC0). Add an "Explore in 3D" section using model-viewer: load \`/models/${safeName}.glb\`, auto-rotate, camera-controls, height 460px, dark gradient background.`,
      );

      handleClose();
    } catch (e: any) {
      toast.error(`Failed: ${e.message || 'Unknown error'}`);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setCategory('');
    setResults([]);
    setSelected(null);
    setError('');
    setNextCursor(null);
    onClose();
  };

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog className="!max-w-[720px]" showCloseButton onClose={handleClose}>
        <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
          {/* Header */}
          <div className="p-5 pb-3 border-b border-bolt-elements-borderColor shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle>
                  <div className="i-ph:cube-duotone text-purple-400 text-2xl" />
                  Browse 3D Models
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 ml-8">
                  <p className="text-xs text-bolt-elements-textTertiary">
                    Free CC0 models from Sketchfab — downloaded as GLB, embedded with model-viewer
                  </p>
                </div>
              </div>

              {/* Auto-select button */}
              <button
                onClick={handleAutoSelect}
                disabled={autoLoading || !hasContext}
                title={hasContext ? 'Let AI pick the best 3D model for your website' : 'Start a conversation first'}
                className={classNames(
                  'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all',
                  hasContext
                    ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                    : 'border-bolt-elements-borderColor text-bolt-elements-textTertiary opacity-50 cursor-not-allowed',
                )}
              >
                {autoLoading ? (
                  <div className="i-svg-spinners:90-ring-with-bg text-purple-400 text-base" />
                ) : (
                  <div className="i-ph:magic-wand-duotone text-base text-purple-400" />
                )}
                {autoLoading ? 'AI thinking…' : 'Auto-select'}
              </button>
            </div>

            {/* Search bar + CC0 toggle */}
            <form onSubmit={handleSearch} className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 i-ph:magnifying-glass text-bolt-elements-textTertiary text-base pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 3D models…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* CC0 toggle */}
              <button
                type="button"
                onClick={handleCc0Toggle}
                title={cc0Only ? 'Showing CC0 only (free to use) — click to show all licenses' : 'Showing all licenses — click for CC0 only'}
                className={classNames(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all shrink-0',
                  cc0Only
                    ? 'bg-green-500/15 border-green-500/50 text-green-400'
                    : 'border-bolt-elements-borderColor text-bolt-elements-textTertiary hover:border-bolt-elements-borderColor',
                )}
              >
                <div className={classNames('text-base', cc0Only ? 'i-ph:check-circle-fill' : 'i-ph:circle')} />
                CC0 only
              </button>

              <button
                type="submit"
                disabled={loading || autoLoading}
                className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white transition-colors shrink-0"
              >
                Search
              </button>
            </form>

            {/* Quick searches */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_SEARCHES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickSearch(q)}
                  className="px-2 py-0.5 rounded-full text-xs border border-bolt-elements-borderColor text-bolt-elements-textTertiary hover:border-purple-400 hover:text-bolt-elements-textSecondary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Category chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleCategoryChange(c.value)}
                  className={classNames(
                    'px-3 py-1 rounded-full text-xs border whitespace-nowrap transition-colors shrink-0',
                    category === c.value
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 modern-scrollbar">
            {/* Error */}
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2 mb-3">
                <div className="i-ph:warning-circle shrink-0" />
                {error}
              </div>
            )}

            {/* Auto-loading overlay */}
            {autoLoading && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="i-ph:magic-wand-duotone text-purple-400 text-4xl animate-pulse" />
                <p className="text-bolt-elements-textSecondary text-sm">AI is analyzing your project…</p>
                <p className="text-bolt-elements-textTertiary text-xs">Finding the best 3D model for your website</p>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && !autoLoading && results.length === 0 && (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-bolt-elements-background-depth-3 animate-pulse">
                    <div className="aspect-square rounded-t-lg bg-bolt-elements-background-depth-1" />
                    <div className="p-2 space-y-1.5">
                      <div className="h-3 bg-bolt-elements-background-depth-1 rounded w-3/4" />
                      <div className="h-2.5 bg-bolt-elements-background-depth-1 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results grid */}
            {!autoLoading && results.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {results.map((model) => (
                  <button
                    key={model.uid}
                    onClick={() => handleSelect(model)}
                    className={classNames(
                      'group relative flex flex-col rounded-lg border transition-all text-left overflow-hidden cursor-pointer',
                      selected?.uid === model.uid
                        ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/5'
                        : 'border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-purple-400',
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square w-full relative overflow-hidden bg-bolt-elements-background-depth-3">
                      {model.thumbnail ? (
                        <img
                          src={model.thumbnail}
                          alt={model.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="i-ph:cube text-bolt-elements-textTertiary text-3xl" />
                        </div>
                      )}
                      {/* CC0 badge */}
                      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/80 text-white leading-none">
                        CC0
                      </div>
                      {selected?.uid === model.uid && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <div className="i-ph:check-bold text-white text-xs" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2 flex-1">
                      <p className="text-xs font-medium text-bolt-elements-textPrimary truncate leading-tight">
                        {model.name}
                      </p>
                      <p className="text-xs text-bolt-elements-textTertiary mt-0.5 truncate">@{model.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Load more */}
            {nextCursor && !loading && !autoLoading && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => search(query, category, cc0Only, nextCursor)}
                  className="px-4 py-2 rounded-lg text-sm border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400 transition-colors"
                >
                  Load more
                </button>
              </div>
            )}

            {/* Loading more spinner */}
            {loading && results.length > 0 && (
              <div className="flex justify-center mt-4">
                <div className="i-svg-spinners:90-ring-with-bg text-purple-400 text-2xl" />
              </div>
            )}

            {/* Empty state */}
            {!loading && !autoLoading && results.length === 0 && !error && (
              <div className="flex flex-col items-center gap-3 py-12 text-bolt-elements-textTertiary">
                <div className="i-ph:cube text-5xl opacity-30" />
                <p className="text-sm">Search for 3D models above</p>
                {cc0Only && (
                  <p className="text-xs opacity-60">
                    Showing CC0 only — toggle off for more results
                  </p>
                )}
                {hasContext && (
                  <p className="text-xs opacity-60">
                    or click <span className="text-purple-400">Auto-select</span> to let AI choose
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Selected model panel */}
          {selected && !autoLoading && (
            <div className="border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 shrink-0">
              <div className="flex items-center gap-3 p-3">
                {/* Larger thumbnail preview */}
                {selected.thumbnail && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3">
                    <img
                      src={selected.thumbnail}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-bolt-elements-textPrimary truncate">{selected.name}</p>
                  <p className="text-xs text-bolt-elements-textTertiary mt-0.5">
                    @{selected.author}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                      CC0
                    </span>
                    <span className="text-[10px] text-bolt-elements-textTertiary">Free to use, no attribution required</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <a
                    href={`https://sketchfab.com/models/${selected.uid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400 transition-colors flex items-center gap-1.5"
                  >
                    <div className="i-ph:arrow-square-out text-base" />
                    View on Sketchfab
                  </a>
                  <button
                    onClick={handleInsert}
                    disabled={!sendMessage || downloadLoading}
                    className="px-4 py-1.5 rounded-lg text-xs bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5"
                  >
                    {downloadLoading ? (
                      <>
                        <div className="i-svg-spinners:90-ring-with-bg text-base" />
                        Downloading…
                      </>
                    ) : (
                      <>
                        <div className="i-ph:download-simple text-base" />
                        Download & Insert
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </DialogRoot>
  );
}
