import React, { useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import type { UserTemplate } from '~/lib/stores/templates';

const INDUSTRY_PRESETS = [
  'Pizza Restaurant',
  'Automation Agency',
  'Portfolio',
  'E-commerce Store',
  'SaaS Product',
  'Fitness Studio',
  'Law Firm',
  'Real Estate',
  'Coffee Shop',
  'Tech Startup',
];

const COLOR_PRESETS = [
  { label: 'Warm Orange', value: 'warm orange and red', bg: 'bg-orange-500' },
  { label: 'Ocean Blue', value: 'ocean blue and cyan', bg: 'bg-blue-500' },
  { label: 'Forest Green', value: 'forest green and emerald', bg: 'bg-green-600' },
  { label: 'Deep Purple', value: 'deep purple and violet', bg: 'bg-purple-600' },
  { label: 'Rose Pink', value: 'rose pink and coral', bg: 'bg-pink-500' },
  { label: 'Slate Gray', value: 'slate gray and charcoal', bg: 'bg-slate-600' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  template: UserTemplate | null;
}

export function TemplateCustomizeModal({ open, onClose, template }: Props) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [industry, setIndustry] = useState('');
  const [brandName, setBrandName] = useState('');
  const [colorPreset, setColorPreset] = useState(COLOR_PRESETS[0].value);

  if (!template) {
    return null;
  }

  const buildPrompt = () => {
    return template.basePrompt
      .replace(/\{THEME\}/g, `${theme} theme`)
      .replace(/\{INDUSTRY\}/g, industry || 'business')
      .replace(/\{BRAND_NAME\}/g, brandName || 'My Brand')
      .replace(/\{PRIMARY_COLOR\}/g, colorPreset);
  };

  const handleGenerate = () => {
    const prompt = buildPrompt();
    navigate(`/?prompt=${encodeURIComponent(prompt)}`);
    onClose();
  };

  const handleClose = () => {
    setTheme('light');
    setIndustry('');
    setBrandName('');
    setColorPreset(COLOR_PRESETS[0].value);
    onClose();
  };

  const previewPrompt = buildPrompt();

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog className="!max-w-[580px]" showCloseButton onClose={handleClose}>
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div>
            <DialogTitle>
              <div className="i-ph:magic-wand-duotone text-purple-400 text-2xl" />
              Customize Template
            </DialogTitle>
            <p className="text-sm text-bolt-elements-textSecondary mt-1 ml-8">
              <span className="text-bolt-elements-textPrimary font-medium">{template.name}</span>
              {template.description && ` — ${template.description}`}
            </p>
          </div>

          {/* Theme */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={classNames(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors',
                    theme === t
                      ? 'bg-purple-500/20 border-purple-500 text-bolt-elements-textPrimary'
                      : 'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400',
                  )}
                >
                  <div className={t === 'light' ? 'i-ph:sun-duotone text-yellow-400' : 'i-ph:moon-duotone text-blue-400'} />
                  {t.charAt(0).toUpperCase() + t.slice(1)} Theme
                </button>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Industry / Purpose</label>
            <input
              type="text"
              className="w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="e.g. Pizza Restaurant, SaaS Tool, Photography Portfolio…"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setIndustry(p)}
                  className={classNames(
                    'px-2.5 py-1 rounded-full text-xs border transition-colors',
                    industry === p
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-transparent border-bolt-elements-borderColor text-bolt-elements-textTertiary hover:border-purple-400 hover:text-bolt-elements-textSecondary',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Brand / Company Name</label>
            <input
              type="text"
              className="w-full rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="e.g. Bella Napoli, AutoFlow Pro, John Doe Studio"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Primary Color</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColorPreset(c.value)}
                  className={classNames(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors',
                    colorPreset === c.value
                      ? 'border-purple-500 bg-purple-500/10 text-bolt-elements-textPrimary'
                      : 'border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:border-purple-400',
                  )}
                >
                  <div className={classNames('w-3 h-3 rounded-full shrink-0', c.bg)} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Preview */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-bolt-elements-textSecondary">Prompt preview</label>
            <div className="rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor px-3 py-2 text-xs text-bolt-elements-textSecondary font-mono leading-relaxed max-h-24 overflow-y-auto">
              {previewPrompt}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-bolt-elements-borderColor">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 rounded-lg text-sm bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2"
            >
              <div className="i-ph:rocket-launch text-base" />
              Generate Website
            </button>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
