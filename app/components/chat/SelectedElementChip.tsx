import { useStore } from '@nanostores/react';
import { describeSelection, selectedPreviewElement } from '~/lib/stores/visual-edit';

/** Shown above the chat input while a preview section is selected; it rides along with the next message. */
export function SelectedElementChip() {
  const selection = useStore(selectedPreviewElement);

  if (!selection) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 pt-3">
      <div className="flex items-center gap-1.5 max-w-full rounded-md border border-accent-500/40 bg-accent-500/10 px-2 py-1 text-xs text-bolt-elements-textPrimary">
        <span className="i-ph:cursor-click shrink-0 text-accent-500" />
        <span className="shrink-0 text-bolt-elements-textSecondary">Changing</span>
        <code className="truncate">{describeSelection(selection)}</code>
        <button
          type="button"
          title="Clear selection"
          className="i-ph:x shrink-0 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
          onClick={() => selectedPreviewElement.set(undefined)}
        />
      </div>
    </div>
  );
}
