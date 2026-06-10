import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import type { ProviderInfo } from '~/types/model';

// ── Provider / model config ──────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'fal',
    label: 'fal.ai',
    icon: 'i-ph:lightning-duotone',
    color: 'text-yellow-400',
    keyName: 'FAL_KEY',
    keyLink: 'https://fal.ai/dashboard/keys',
    models: [
      { id: 'fal-ai/flux/schnell', label: 'Flux Schnell', desc: 'Fastest — 4 steps' },
      { id: 'fal-ai/flux/dev', label: 'Flux Dev', desc: 'High quality' },
      { id: 'fal-ai/stable-diffusion-v3-medium', label: 'SD v3 Medium', desc: 'Stable Diffusion 3' },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini Imagen',
    icon: 'i-ph:google-logo-duotone',
    color: 'text-blue-400',
    keyName: 'GOOGLE_GENERATIVE_AI_API_KEY',
    keyLink: 'https://aistudio.google.com/app/apikey',
    models: [{ id: 'imagen-3.0-generate-001', label: 'Imagen 3', desc: 'Google Imagen 3' }],
  },
  {
    id: 'openai',
    label: 'DALL·E',
    icon: 'i-ph:openai-logo-duotone',
    color: 'text-green-400',
    keyName: 'OPENAI_API_KEY',
    keyLink: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'dall-e-3', label: 'DALL·E 3', desc: 'Best quality' },
      { id: 'dall-e-2', label: 'DALL·E 2', desc: 'Faster & cheaper' },
    ],
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]['id'];

const SIZES = [
  { label: 'Square 1:1', value: '1024x1024' },
  { label: 'Landscape 16:9', value: '1792x1024' },
  { label: 'Portrait 9:16', value: '1024x1792' },
];

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (list: string[]) => void;
  messages?: Array<{ role: string; content: any }>;
  chatModel?: string;
  chatProvider?: ProviderInfo;
}

export function ImageGenerateModal({
  open,
  onClose,
  uploadedFiles = [],
  setUploadedFiles,
  imageDataList = [],
  setImageDataList,
  messages,
  chatModel,
  chatProvider,
}: Props) {
  const [providerId, setProviderId] = useState<ProviderId>('fal');
  const [modelId, setModelId] = useState('fal-ai/flux/schnell');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [generated, setGenerated] = useState<{ data: string; filename: string } | null>(null);
  const [error, setError] = useState('');

  const hasContext = (messages?.length ?? 0) > 0 && chatModel && chatProvider;

  const handleAutoSuggest = async () => {
    if (!hasContext) {
      toast.info('Start a conversation first so AI can suggest a relevant prompt');
      return;
    }

    setSuggestLoading(true);

    try {
      const res = await fetch('/api/image-prompt-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: chatModel, provider: chatProvider }),
      });
      const data = (await res.json()) as any;

      if (data.prompt) {
        setPrompt(data.prompt);
        setSize(data.size || '1792x1024');
        setGenerated(null);
        setError('');
        toast.success('AI suggested a prompt for your website');
      } else {
        toast.error('Could not generate a suggestion');
      }
    } catch (e: any) {
      toast.error('Suggestion failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSuggestLoading(false);
    }
  };

  const provider = PROVIDERS.find((p) => p.id === providerId)!;

  const handleProviderChange = (id: ProviderId) => {
    setProviderId(id);
    const p = PROVIDERS.find((p) => p.id === id)!;
    setModelId(p.models[0].id);
    setGenerated(null);
    setError('');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setError('');
    setGenerated(null);

    try {
      const res = await fetch('/api/image-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, provider: providerId, model: modelId }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json() as any;
      setGenerated({ data: json.imageData, filename: json.filename });
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseImage = async () => {
    if (!generated) {
      return;
    }

    const { data, filename } = generated;
    const dataUrl = `data:image/png;base64,${data}`;
    const binary = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

    try {
      await workbenchStore.createFile(`${WORK_DIR}/public/${filename}`, binary);
      toast.success(`Image saved to public/${filename}`);
    } catch (e) {
      console.error('Failed to save image:', e);
    }

    const file = new File([binary], filename, { type: 'image/png' });
    setUploadedFiles?.([...uploadedFiles, file]);
    setImageDataList?.([...imageDataList, dataUrl]);

    handleClose();
  };

  const handleClose = () => {
    setPrompt('');
    setGenerated(null);
    setError('');
    onClose();
  };

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog className="!max-w-[560px]" showCloseButton onClose={handleClose}>
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <DialogTitle>
            <div className="i-ph:image-square-duotone text-purple-400 text-2xl" />
            Generate Image with AI
          </DialogTitle>

          {/* Provider tabs */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={classNames(
                    'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
                    providerId === p.id
                      ? 'bg-purple-500/20 border-purple-500 text-bolt-elements-textPrimary'
                      : 'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400',
                  )}
                >
                  <div className={classNames(p.icon, 'text-lg', p.color)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-bolt-elements-textSecondary">Model</label>
              <a
                href={provider.keyLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <div className="i-ph:key text-xs" />
                Get {provider.keyName}
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {provider.models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModelId(m.id)}
                  className={classNames(
                    'flex flex-col items-start px-3 py-2 rounded-lg text-xs border transition-colors',
                    modelId === m.id
                      ? 'bg-purple-500/20 border-purple-500 text-bolt-elements-textPrimary'
                      : 'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400',
                  )}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="text-bolt-elements-textTertiary">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-bolt-elements-textSecondary">Image description</label>
              <button
                onClick={handleAutoSuggest}
                disabled={suggestLoading || !hasContext}
                title={hasContext ? 'Let AI write a prompt based on your conversation' : 'Start a conversation first'}
                className={classNames(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all',
                  hasContext
                    ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                    : 'border-bolt-elements-borderColor text-bolt-elements-textTertiary opacity-40 cursor-not-allowed',
                )}
              >
                {suggestLoading ? (
                  <div className="i-svg-spinners:90-ring-with-bg text-purple-400 text-sm animate-spin" />
                ) : (
                  <div className="i-ph:magic-wand-duotone text-sm text-purple-400" />
                )}
                {suggestLoading ? 'Thinking…' : 'Suggest with AI'}
              </button>
            </div>
            <textarea
              className="w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary p-3 text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors"
              rows={3}
              placeholder="e.g. A pizza restaurant hero banner with warm sunset colors, rustic wood background, cinematic lighting"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleGenerate();
                }
              }}
            />
          </div>

          {/* Size selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Aspect ratio</label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    size === s.value
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
              <div className="i-ph:warning-circle mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="i-svg-spinners:90-ring-with-bg text-purple-400 text-4xl animate-spin" />
              <p className="text-bolt-elements-textSecondary text-sm">
                Generating with {provider.label}…
              </p>
            </div>
          )}

          {/* Preview */}
          {generated && !loading && (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-bolt-elements-textSecondary">Preview</label>
              <img
                src={`data:image/png;base64,${generated.data}`}
                alt="Generated"
                className="w-full rounded-lg border border-bolt-elements-borderColor object-cover max-h-72"
              />
              <p className="text-xs text-bolt-elements-textTertiary">
                Will be saved as{' '}
                <span className="text-purple-400 font-mono">public/{generated.filename}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-1 border-t border-bolt-elements-borderColor">
            <p className="text-xs text-bolt-elements-textTertiary">
              {!generated ? 'Ctrl+Enter to generate' : 'Saved to public/ and added to chat'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors"
              >
                Cancel
              </button>

              {generated && !loading ? (
                <>
                  <button
                    onClick={() => { setGenerated(null); setError(''); }}
                    className="px-4 py-2 rounded-lg text-sm border border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400 transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleUseImage}
                    className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2"
                  >
                    <div className="i-ph:check-bold text-base" />
                    Use Image
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || loading}
                  className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
                >
                  <div className="i-ph:magic-wand text-base" />
                  Generate
                </button>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
