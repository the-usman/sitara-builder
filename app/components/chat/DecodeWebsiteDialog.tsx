import { memo } from 'react';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';

interface DecodeWebsiteDialogProps {
  open: boolean;
  onDecode: () => void;
  onDismiss: () => void;
}

/**
 * Shown when a chat was pulled from the server instead of this browser's own history
 * (e.g. opened on a different device). The chat's file snapshot is held back until the
 * user confirms here, rather than silently writing it into the workbench on load.
 */
export const DecodeWebsiteDialog = memo(({ open, onDecode, onDismiss }: DecodeWebsiteDialogProps) => {
  return (
    <DialogRoot open={open}>
      <Dialog onBackdrop={onDismiss} onClose={onDismiss}>
        <div className="p-6 bg-white dark:bg-gray-950">
          <DialogTitle className="text-gray-900 dark:text-white">Decode this website?</DialogTitle>
          <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
            This chat was opened from another device. Its project files are stored compressed on the server — decode
            them to load the website into the editor and preview.
          </DialogDescription>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <DialogButton type="secondary" onClick={onDismiss}>
            Not now
          </DialogButton>
          <DialogButton type="primary" onClick={onDecode}>
            Decode
          </DialogButton>
        </div>
      </Dialog>
    </DialogRoot>
  );
});
