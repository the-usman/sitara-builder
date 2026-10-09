import { useStore } from '@nanostores/react';
import { useEffect, type RefObject } from 'react';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import {
  pendingChatPrompt,
  previewEditMode,
  replaceTextInProject,
  replaceTextNearLine,
  selectedPreviewElement,
  toProjectRelative,
  type PreviewSource,
} from '~/lib/stores/visual-edit';
import { WORK_DIR } from '~/utils/constants';

interface BridgeSource {
  file: string;
  line: number;
  column?: number;
}

type BridgeMessage =
  | { type: 'ready' }
  | { type: 'escape' }
  | { type: 'unsupported'; reason: 'no-source' | 'not-text' }
  | { type: 'selected'; source: BridgeSource | null; tag: string; text: string; html: string }
  | { type: 'text-edit'; source: BridgeSource | null; oldText: string; newText: string; tag: string };

function toSource(source: BridgeSource | null): PreviewSource | undefined {
  return source ? { file: toProjectRelative(source.file), line: source.line, column: source.column } : undefined;
}

/** Where to write the edit: next to the element's JSX if known, else the one file containing the text. */
function locateTextEdit(source: PreviewSource | undefined, oldText: string, newText: string) {
  const files = workbenchStore.files.get();

  if (source) {
    const filePath = `${WORK_DIR}/${source.file}`;
    const file = files[filePath];

    if (file?.type === 'file' && !file.isBinary) {
      const content = replaceTextNearLine(file.content, source.line, oldText, newText);

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
  selectedPreviewElement.set({ source, tag: message.tag, text: message.oldText, html: '' });
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

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as (BridgeMessage & { source?: unknown }) | undefined;

      if (event.source !== iframeRef.current?.contentWindow || data?.source !== 'sitara-preview') {
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
          selectedPreviewElement.set({
            source: toSource(message.source),
            tag: message.tag,
            text: message.text,
            html: message.html,
          });
          document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
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
