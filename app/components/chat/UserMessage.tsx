/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { Markdown } from './Markdown';
import { SELECTION_BLOCK_RE } from '~/lib/stores/visual-edit';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
}

export function UserMessage({ content }: UserMessageProps) {
  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    const { selection, text: textContent } = splitSelection(stripMetadata(textItem?.text || ''));
    const images = content.filter((item) => item.type === 'image' && item.image);

    return (
      <div className="overflow-hidden flex items-center">
        <div className="flex flex-col gap-4">
          {selection && <SelectionCard {...selection} />}
          {textContent && <Markdown html>{textContent}</Markdown>}
          {images.map((item, index) => (
            <img
              key={index}
              src={item.image}
              alt={`Image ${index + 1}`}
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: '512px', objectFit: 'contain' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const { selection, text: textContent } = splitSelection(stripMetadata(content));

  return (
    <div className="overflow-hidden pt-[4px] flex flex-col gap-3">
      {selection && <SelectionCard {...selection} />}
      <Markdown html>{textContent}</Markdown>
    </div>
  );
}

interface SelectionInfo {
  tag: string;
  file: string;
  line: string;
}

/** Pulls out the preview selection block (see withSelectedElementContext) so it shows as a card. */
function splitSelection(content: string): { selection?: SelectionInfo; text: string } {
  const match = content.match(SELECTION_BLOCK_RE);

  if (!match) {
    return { text: content };
  }

  const attr = (name: string) => match[1].match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';

  return {
    selection: { tag: attr('tag'), file: attr('file'), line: attr('line') },
    text: content.replace(SELECTION_BLOCK_RE, '').replace(/^\s*REQUEST:\s*/, ''),
  };
}

function SelectionCard({ tag, file, line }: SelectionInfo) {
  return (
    <div className="flex items-center gap-2 self-start rounded-md border border-accent-500/40 bg-accent-500/10 px-2.5 py-1.5 text-xs">
      <span className="i-ph:cursor-click text-accent-500 shrink-0" />
      <span className="text-bolt-elements-textSecondary shrink-0">Selected section</span>
      <code className="text-bolt-elements-textPrimary truncate">
        &lt;{tag}&gt;{file ? ` · ${file}${line ? ':' + line : ''}` : ''}
      </code>
    </div>
  );
}

function stripMetadata(content: string) {
  const artifactRegex = /<boltArtifact\s+[^>]*>[\s\S]*?<\/boltArtifact>/gm;
  return content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').replace(artifactRegex, '');
}
