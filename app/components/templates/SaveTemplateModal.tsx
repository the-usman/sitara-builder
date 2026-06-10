import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { toast } from 'react-toastify';
import { saveUserTemplate } from '~/lib/stores/templates';
import { classNames } from '~/utils/classNames';
import type { Message } from 'ai';
import type { ProviderInfo } from '~/types/model';

interface Props {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  model: string;
  provider: ProviderInfo;
}

export function SaveTemplateModal({ open, onClose, messages, model, provider }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'form' | 'generating' | 'preview'>('form');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!name.trim()) {
      return;
    }

    setStep('generating');
    setError('');

    try {
      const res = await fetch('/api/template-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, provider }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = (await res.json()) as any;
      setGeneratedPrompt(json.templatePrompt);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to generate template');
      setStep('form');
    }
  };

  const handleSave = () => {
    saveUserTemplate({ name: name.trim(), description: description.trim(), basePrompt: generatedPrompt });
    toast.success(`Template "${name}" saved!`);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setStep('form');
    setGeneratedPrompt('');
    setError('');
    onClose();
  };

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog className="!max-w-[520px]" showCloseButton onClose={handleClose}>
        <div className="p-6 flex flex-col gap-5">
          <DialogTitle>
            <div className="i-ph:floppy-disk-duotone text-purple-400 text-2xl" />
            Save as Template
          </DialogTitle>

          {step === 'form' && (
            <>
              <p className="text-sm text-bolt-elements-textSecondary">
                The AI will analyze your project and generate a reusable template prompt with customizable placeholders
                for theme, industry, brand name, and colors.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-bolt-elements-textSecondary">Template name *</label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. Pizza Restaurant Landing Page"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-bolt-elements-textSecondary">Description (optional)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. Full-page restaurant site with hero, menu, and contact"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1 border-t border-bolt-elements-borderColor">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!name.trim()}
                  className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
                >
                  <div className="i-ph:sparkle text-base" />
                  Generate Template
                </button>
              </div>
            </>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="i-svg-spinners:90-ring-with-bg text-purple-400 text-4xl animate-spin" />
              <p className="text-bolt-elements-textSecondary text-sm">AI is analyzing your project…</p>
            </div>
          )}

          {step === 'preview' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-bolt-elements-textSecondary">Generated template prompt</label>
                <textarea
                  className="w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary px-3 py-2 text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors font-mono"
                  rows={8}
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                />
                <p className="text-xs text-bolt-elements-textTertiary">
                  You can edit this prompt. The <span className="text-purple-400 font-mono">{'{'}</span>THEME
                  <span className="text-purple-400 font-mono">{'}'}</span>,{' '}
                  <span className="text-purple-400 font-mono">{'{'}</span>INDUSTRY
                  <span className="text-purple-400 font-mono">{'}'}</span>,{' '}
                  <span className="text-purple-400 font-mono">{'{'}</span>BRAND_NAME
                  <span className="text-purple-400 font-mono">{'}'}</span>, and{' '}
                  <span className="text-purple-400 font-mono">{'{'}</span>PRIMARY_COLOR
                  <span className="text-purple-400 font-mono">{'}'}</span> will be replaced when used.
                </p>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-bolt-elements-borderColor">
                <button
                  onClick={() => setStep('form')}
                  className="px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors"
                >
                  ← Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2"
                  >
                    <div className="i-ph:check-bold text-base" />
                    Save Template
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </DialogRoot>
  );
}
