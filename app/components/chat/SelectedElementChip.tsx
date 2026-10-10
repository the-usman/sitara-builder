import { useStore } from '@nanostores/react';
import { describeSelection, removeSelection, selectedPreviewElements } from '~/lib/stores/visual-edit';

/** Shown above the chat input while preview sections are selected; they ride along with the next message. */
export function SelectedElementChip() {
  const selections = useStore(selectedPreviewElements);

  if (!selections.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 pt-3">
      <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
        <span className="i-ph:cursor-click text-accent-500" />
        <span>
          {selections.length === 1
            ? 'Your next message will change this section'
            : `Your next message will change these ${selections.length} sections`}
        </span>
        <button
          type="button"
          className="ml-auto text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
          onClick={() => selectedPreviewElements.set([])}
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {selections.map((selection, index) => (
          <div
            key={selection.id}
            className="flex items-center gap-1.5 max-w-full rounded-md border border-accent-500/40 bg-accent-500/10 px-2 py-1 text-xs text-bolt-elements-textPrimary"
          >
            <span className="shrink-0 rounded bg-accent-500 px-1 text-[10px] font-semibold leading-4 text-white">
              {index + 1}
            </span>
            <code className="truncate">{describeSelection(selection)}</code>
            <button
              type="button"
              title="Remove this section"
              className="i-ph:x shrink-0 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
              onClick={() => removeSelection(selection.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
