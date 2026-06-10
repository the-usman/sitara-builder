import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { userTemplatesStore, deleteUserTemplate, type UserTemplate } from '~/lib/stores/templates';
import { TemplateCustomizeModal } from './TemplateCustomizeModal';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

export function UserTemplates() {
  const templates = useStore(userTemplatesStore);
  const [selected, setSelected] = useState<UserTemplate | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  if (templates.length === 0) {
    return null;
  }

  const handleUse = (t: UserTemplate) => {
    setSelected(t);
    setCustomizeOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    deleteUserTemplate(id);
    toast.success(`Template "${name}" deleted`);
  };

  return (
    <>
      <div className="w-full max-w-chat mx-auto mt-6 px-4 lg:px-0">
        <p className="text-sm text-bolt-elements-textSecondary mb-3 flex items-center gap-2">
          <div className="i-ph:stack-duotone text-purple-400" />
          My Templates
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group relative flex flex-col gap-2 p-4 rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-purple-500/50 hover:bg-bolt-elements-background-depth-1 transition-all cursor-pointer"
              onClick={() => handleUse(t)}
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, t.id, t.name)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-bolt-elements-textTertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete template"
              >
                <div className="i-ph:trash text-sm" />
              </button>

              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <div className="i-ph:stack-duotone text-purple-400 text-lg" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-bolt-elements-textPrimary truncate">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-bolt-elements-textTertiary mt-0.5 line-clamp-2">{t.description}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-bolt-elements-textTertiary">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-purple-400 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  Use template <div className="i-ph:arrow-right text-xs" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TemplateCustomizeModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        template={selected}
      />
    </>
  );
}
