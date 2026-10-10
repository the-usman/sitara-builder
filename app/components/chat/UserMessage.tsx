/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { Markdown } from './Markdown';
import { SELECTION_BLOCK_RE, SELECTION_TARGET_RE } from '~/lib/stores/visual-edit';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
}

export function UserMessage({ content }: UserMessageProps) {
  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    const { targets, text: textContent } = splitSelection(stripMetadata(textItem?.text || ''));
    const images = content.filter((item) => item.type === 'image' && item.image);

    return (
      <div className="overflow-hidden flex items-center">
        <div className="flex flex-col gap-4">
          {targets.length > 0 && <SelectionCard targets={targets} />}
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

  const { targets, text: textContent } = splitSelection(stripMetadata(content));

  return (
    <div className="overflow-hidden pt-[4px] flex flex-col gap-3">
      {targets.length > 0 && <SelectionCard targets={targets} />}
      <Markdown html>{textContent}</Markdown>
    </div>
  );
}

interface SelectionTarget {
  n: string;
  tag: string;
  file: string;
  line: string;
}

/** Pulls out the preview selection block (see withSelectedElementContext) so it shows as a card. */
function splitSelection(content: string): { targets: SelectionTarget[]; text: string } {
  const match = content.match(SELECTION_BLOCK_RE);

  if (!match) {
    return { targets: [], text: content };
  }

  const targets = [...match[0].matchAll(SELECTION_TARGET_RE)].map(([, n, tag, file, line]) => ({ n, tag, file, line }));

  // Messages from before multi-select carried one target as attributes on the block itself.
  if (!targets.length) {
    const attr = (name: string) => match[1].match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
    targets.push({ n: '1', tag: attr('tag'), file: attr('file'), line: attr('line') });
  }

  return {
    targets,
    text: content.replace(SELECTION_BLOCK_RE, '').replace(/^\s*REQUEST:\s*/, ''),
  };
}

function SelectionCard({ targets }: { targets: SelectionTarget[] }) {
  return (
    <div className="flex flex-col gap-1 self-start rounded-md border border-accent-500/40 bg-accent-500/10 px-2.5 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="i-ph:cursor-click text-accent-500 shrink-0" />
        <span className="text-bolt-elements-textSecondary">
          {targets.length === 1 ? 'Selected section' : `${targets.length} selected sections`}
        </span>
      </div>
      {targets.map((target) => (
        <div key={target.n} className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 rounded bg-accent-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {target.n}
          </span>
          <code className="text-bolt-elements-textPrimary truncate">
            &lt;{target.tag}&gt;{target.file ? ` · ${target.file}${target.line ? ':' + target.line : ''}` : ''}
          </code>
        </div>
      ))}
    </div>
  );
}

function stripMetadata(content: string) {
  const artifactRegex = /<boltArtifact\s+[^>]*>[\s\S]*?<\/boltArtifact>/gm;
  return content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').replace(artifactRegex, '');
}
