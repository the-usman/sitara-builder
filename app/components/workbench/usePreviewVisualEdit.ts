import { useStore } from '@nanostores/react';
import { useEffect, type RefObject } from 'react';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import {
  pendingChatPrompt,
  previewEditMode,
  replaceTextInProject,
  replaceTextNearLine,
  addSelection,
  removeSelection,
  selectedPreviewElements,
  toProjectRelative,
  type PreviewSource,
} from '~/lib/stores/visual-edit';
import { WORK_DIR } from '~/utils/constants';

interface BridgeSource {
  file: string;
  line: number;
  column?: number;
  approx?: boolean;
}

type BridgeMessage =
  | { type: 'ready' }
  | { type: 'escape' }
  | { type: 'unsupported'; reason: 'no-source' | 'not-text' }
  | { type: 'selected'; id: number; source: BridgeSource | null; tag: string; text: string; html: string }
  | { type: 'deselected'; id: number }
  | { type: 'text-edit'; source: BridgeSource | null; oldText: string; newText: string; tag: string };

/*
 * Only a real location object counts. Previews still running the old bridge send the string
 * 'sitara-preview' in this field (it doubled as the message marker) — treat that as "unknown",
 * which falls back to finding the element by its text.
 */
export function toSource(source: unknown): PreviewSource | undefined {
  if (!source || typeof source !== 'object' || typeof (source as BridgeSource).file !== 'string') {
    return undefined;
  }

  const { file, line, column, approx } = source as BridgeSource;

  return { file: toProjectRelative(file), line: Number(line) || 1, column, approx };
}

/** Where to write the edit: next to the element's JSX if known, else the one file containing the text. */
function locateTextEdit(source: PreviewSource | undefined, oldText: string, newText: string) {
  const files = workbenchStore.files.get();

  if (source) {
    const filePath = `${WORK_DIR}/${source.file}`;
    const file = files[filePath];

    if (file?.type === 'file' && !file.isBinary) {
      // React 19's line is only a hint: then the text must occur exactly once in that file.
      const content = source.approx
        ? replaceTextInProject({ [filePath]: file }, oldText, newText)?.content
        : replaceTextNearLine(file.content, source.line, oldText, newText);

      if (content !== undefined) {
        return { filePath, content };
      }
    }
  }

  return replaceTextInProject(files, oldText, newText);
}

async function applyTextEdit(message: Extract<BridgeMessage, { type: 'text-edit' }>) {
  const source = toSource(message.source);
  const edit = locateTextEdit(source, message.oldText, message.newText);

  if (edit) {
    await workbenchStore.saveVisualEdit(edit.filePath, edit.content);
    toast.success(`Updated text in ${edit.filePath.slice(WORK_DIR.length + 1)}`);

    return;
  }

  // Not literal JSX text (a variable, prop, data file…): hand it to the AI with the location.
  addSelection({ id: -Date.now(), source, tag: message.tag, text: message.oldText, html: '' });
  pendingChatPrompt.set(`Change the text "${message.oldText.trim()}" to "${message.newText.trim()}".`);
  toast.info(
    "That text isn't written directly in this component — send the prepared message and the AI will change it.",
  );
}

/**
 * Connects the preview iframe's bridge to the builder: forwards the edit mode into the page and
 * handles selections (→ chat context) and text edits (→ direct source change).
 */
export function usePreviewVisualEdit(iframeRef: RefObject<HTMLIFrameElement>) {
  const mode = useStore(previewEditMode);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sitara:mode', mode }, '*');
  }, [mode, iframeRef]);

  // Chip ✕, "Clear all" and sending the message remove selections: drop their boxes in the page too.
  useEffect(() => {
    let previous = selectedPreviewElements.get().map((s) => s.id);

    return selectedPreviewElements.listen((selections) => {
      const ids = selections.map((s) => s.id);
      const target = iframeRef.current?.contentWindow;

      if (!ids.length) {
        target?.postMessage({ type: 'sitara:clear-selection' }, '*');
      } else {
        previous
          .filter((id) => !ids.includes(id))
          .forEach((id) => target?.postMessage({ type: 'sitara:remove-selection', id }, '*'));
      }

      previous = ids;
    });
  }, [iframeRef]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as (BridgeMessage & { from?: unknown; source?: unknown }) | undefined;

      // `from` is the marker; previews started before the fix still mark messages via `source`.
      const fromBridge = data?.from === 'sitara-preview' || data?.source === 'sitara-preview';

      if (event.source !== iframeRef.current?.contentWindow || !fromBridge) {
        return;
      }

      const message = data as BridgeMessage;

      switch (message.type) {
        case 'ready':
          // New page load (navigation, hot reload, restart): restore the current mode.
          iframeRef.current?.contentWindow?.postMessage({ type: 'sitara:mode', mode: previewEditMode.get() }, '*');
          break;

        case 'escape':
          previewEditMode.set('off');
          break;

        case 'selected':
          addSelection({
            id: message.id,
            source: toSource(message.source),
            tag: message.tag,
            text: message.text,
            html: message.html,
          });
          document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
          break;

        case 'deselected':
          removeSelection(message.id);
          break;

        case 'text-edit':
          void applyTextEdit(message).catch((error) => toast.error(`Couldn't save the change: ${error.message}`));
          break;

        case 'unsupported':
          toast.info(
            message.reason === 'not-text'
              ? 'Click directly on a piece of text to edit it.'
              : "Couldn't find where this element is defined. Try selecting the section instead.",
          );
          break;
      }
    };

    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef]);
}
