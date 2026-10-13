import { useStore } from '@nanostores/react';
import { Dialog, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import {
  generateApprovedAssets,
  referenceAssets,
  skipReferenceAssets,
  updateReviewAsset,
} from '~/lib/stores/reference-assets';
import { classNames } from '~/utils/classNames';
import { ASSET_SIZES, type AssetSize } from '~/utils/reference-assets';

/** Asks before generating images that match a reference screenshot (see stores/reference-assets.ts). */
export function ReferenceAssetsDialog() {
  const state = useStore(referenceAssets);

  if (!state) {
    return null;
  }

  const { phase, assets, source } = state;
  const fromEnhancer = source === 'enhancer';
  const fromReference = !source || source === 'reference';
  const selected = assets.filter((asset) => asset.selected).length;
  const busy = phase === 'generating';

  return (
    <DialogRoot open onOpenChange={(open) => !open && !busy && skipReferenceAssets()}>
      <Dialog className="!max-w-[640px]" showCloseButton={!busy} onClose={() => !busy && skipReferenceAssets()}>
        <div className="p-6 flex flex-col gap-4 max-h-[85vh]">
          <DialogTitle>
            <div className="i-ph:image-square-duotone text-purple-400 text-2xl" />
            {fromReference ? 'Generate images to match your reference?' : 'Generate AI images for your site?'}
          </DialogTitle>

          {phase === 'planning' ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="i-svg-spinners:90-ring-with-bg text-purple-400 text-4xl" />
              <p className="text-sm text-bolt-elements-textSecondary">
                {fromReference
                  ? 'Looking at your reference for backgrounds and photos to recreate…'
                  : 'Planning the backgrounds and photos your site needs…'}
              </p>
              <p className="text-xs text-bolt-elements-textTertiary">
                Nothing is generated until you approve. You can skip and build without them.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-bolt-elements-textSecondary">
                {fromEnhancer
                  ? 'The prompt enhancer suggests these AI-generated images for your site.'
                  : fromReference
                    ? 'These images were suggested from your reference.'
                    : 'These images were planned from your request.'}{' '}
                Untick any you don't want and edit the descriptions — they are generated with fal.ai
                {state.referenceImage ? ' (using your uploaded reference as a visual guide)' : ''} and saved to{' '}
                <code>public/generated/</code> for the build to use instead of stock photos.
              </p>
              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {assets.map((asset) => (
                  <div
                    key={asset.name}
                    className={classNames(
                      'flex gap-3 rounded-lg border p-3',
                      asset.selected
                        ? 'border-purple-500/50 bg-purple-500/5'
                        : 'border-bolt-elements-borderColor opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-purple-500"
                      checked={asset.selected}
                      disabled={busy}
                      onChange={(e) => updateReviewAsset(asset.name, { selected: e.target.checked })}
                    />
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-bolt-elements-textPrimary">{asset.purpose}</span>
                        <select
                          className="ml-auto rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 px-2 py-1 text-xs text-bolt-elements-textSecondary"
                          value={asset.size}
                          disabled={busy}
                          onChange={(e) => updateReviewAsset(asset.name, { size: e.target.value as AssetSize })}
                        >
                          {Object.entries(ASSET_SIZES).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={3}
                        className="w-full resize-none rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 p-2 text-xs text-bolt-elements-textPrimary focus:border-purple-500 focus:outline-none"
                        value={asset.prompt}
                        disabled={busy}
                        onChange={(e) => updateReviewAsset(asset.name, { prompt: e.target.value })}
                      />
                      <div className="flex items-center gap-2 text-xs text-bolt-elements-textTertiary">
                        <code>public/generated/{asset.name}.png</code>
                        {asset.status === 'generating' && (
                          <span className="ml-auto flex items-center gap-1 text-purple-400">
                            <span className="i-svg-spinners:90-ring-with-bg" /> Generating…
                          </span>
                        )}
                        {asset.status === 'done' && <span className="ml-auto text-green-500">Saved</span>}
                        {asset.status === 'failed' && (
                          <span className="ml-auto truncate text-red-400" title={asset.error}>
                            Failed: {asset.error}
                          </span>
                        )}
                      </div>
                    </div>
                    {asset.preview && (
                      <img
                        src={asset.preview}
                        alt={asset.purpose}
                        className="h-24 w-32 shrink-0 rounded-md border border-bolt-elements-borderColor object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-bolt-elements-borderColor pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={skipReferenceAssets}
              className="px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 disabled:opacity-40"
            >
              {fromEnhancer ? 'Skip, use stock photos' : 'Skip, build without'}
            </button>
            {phase !== 'planning' && (
              <button
                type="button"
                disabled={busy || !selected}
                onClick={() => void generateApprovedAssets()}
                className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-40 flex items-center gap-2"
              >
                {busy ? (
                  <div className="i-svg-spinners:90-ring-with-bg" />
                ) : (
                  <div className="i-ph:magic-wand text-base" />
                )}
                {busy
                  ? 'Generating…'
                  : `Generate ${selected} image${selected === 1 ? '' : 's'}${fromEnhancer ? '' : ' & build'}`}
              </button>
            )}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
