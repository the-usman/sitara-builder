import React, { useRef, useState } from 'react';
import type { Message } from 'ai';
import JSZip from 'jszip';
import { toast } from 'react-toastify';
import { MAX_FILES, isBinaryFile, shouldIncludeFile } from '~/utils/fileUtils';
import { createChatFromFileContents } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs';
import { Button } from '~/components/ui/Button';
import { classNames } from '~/utils/classNames';

interface ImportZipButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

/** Zip tools add these; they are never part of the project. */
function isArchiveJunk(path: string): boolean {
  return path.startsWith('__MACOSX/') || path.split('/').pop() === '.DS_Store';
}

/**
 * The workbench's "Download" backup puts files at the zip root, but a zip made by hand or by GitHub
 * ("Download ZIP") wraps everything in one top-level folder. Strip that folder so paths match.
 */
function stripCommonRoot(paths: string[]): (path: string) => string {
  const roots = new Set(paths.map((path) => (path.includes('/') ? path.split('/')[0] : '')));
  const [root] = roots;

  // Only a wrapper if the project's own root files sit directly inside it — a lone `src/` folder is not one.
  const isWrapper = paths.some((path) => path === `${root}/package.json` || path === `${root}/index.html`);

  if (roots.size !== 1 || !root || !isWrapper) {
    return (path) => path;
  }

  return (path) => path.slice(root.length + 1);
}

/** Starts a new chat from a project backup zip (e.g. one saved with the workbench's Download button). */
export const ImportZipButton: React.FC<ImportZipButtonProps> = ({ className, importChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const zipFile = e.target.files?.[0];
    e.target.value = ''; // Allow picking the same file again.

    if (!zipFile) {
      return;
    }

    const projectName = zipFile.name.replace(/\.zip$/i, '') || 'Imported backup';
    setIsLoading(true);

    const loadingToast = toast.loading(`Importing ${projectName}...`);

    try {
      let zip: JSZip;

      try {
        zip = await JSZip.loadAsync(zipFile);
      } catch {
        toast.error('That file is not a valid zip archive');
        return;
      }

      const entries = Object.values(zip.files).filter((entry) => !entry.dir && !isArchiveJunk(entry.name));
      const toProjectPath = stripCommonRoot(entries.map((entry) => entry.name));
      const included = entries
        .map((entry) => ({ entry, path: toProjectPath(entry.name) }))
        .filter(({ path }) => path && shouldIncludeFile(path));

      if (included.length === 0) {
        toast.error('No project files found in that zip');
        return;
      }

      if (included.length > MAX_FILES) {
        toast.error(
          `This zip contains ${included.length.toLocaleString()} files. Please use a backup with fewer than ${MAX_FILES.toLocaleString()} files.`,
        );
        return;
      }

      const decoder = new TextDecoder();
      const textFiles: { path: string; content: string }[] = [];
      const binaryFilePaths: string[] = [];

      for (const { entry, path } of included) {
        const bytes = await entry.async('uint8array');

        if (await isBinaryFile(new File([bytes], path))) {
          binaryFilePaths.push(path);
        } else {
          textFiles.push({ path, content: decoder.decode(bytes) });
        }
      }

      if (textFiles.length === 0) {
        toast.error('No text files found in that zip');
        return;
      }

      if (binaryFilePaths.length > 0) {
        logStore.logWarning('Skipping binary files during zip import', {
          projectName,
          binaryCount: binaryFilePaths.length,
        });
        toast.info(`Skipping ${binaryFilePaths.length} binary files`);
      }

      const messages = await createChatFromFileContents(textFiles, binaryFilePaths, projectName, 'backup');

      if (importChat) {
        await importChat(projectName, messages);
      }

      logStore.logSystem('Backup zip imported successfully', {
        projectName,
        textFileCount: textFiles.length,
        binaryFileCount: binaryFilePaths.length,
      });
      toast.success('Backup imported as a new chat');
    } catch (error) {
      logStore.logError('Failed to import backup zip', error, { projectName });
      console.error('Failed to import backup zip:', error);
      toast.error('Failed to import that backup');
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" accept=".zip,application/zip" onChange={handleFileChange} />
      <Button
        onClick={() => inputRef.current?.click()}
        title="Start a new chat from a backup zip"
        variant="default"
        size="lg"
        className={classNames(
          'gap-2 bg-bolt-elements-background-depth-1',
          'text-bolt-elements-textPrimary',
          'hover:bg-bolt-elements-background-depth-2',
          'border border-bolt-elements-borderColor',
          'h-10 px-4 py-2 min-w-[120px] justify-center',
          'transition-all duration-200 ease-in-out',
          className,
        )}
        disabled={isLoading}
      >
        <span className="i-ph:file-zip w-4 h-4" />
        {isLoading ? 'Importing...' : 'Import Zip'}
      </Button>
    </>
  );
};
