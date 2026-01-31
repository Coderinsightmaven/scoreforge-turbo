import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './Dialog';
import { Button } from './button';
import { Input } from './input';
import { TauriAPI } from '../../lib/tauri';

interface SaveScoreboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
}

export const SaveScoreboardDialog: React.FC<SaveScoreboardDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  currentName,
}) => {
  const [name, setName] = useState(currentName);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingSaveName, setPendingSaveName] = useState<string | null>(null);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  // Load existing scoreboard names when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadExistingNames();
      setShowOverwriteConfirm(false);
      setPendingSaveName(null);
    }
  }, [isOpen]);

  const loadExistingNames = async () => {
    try {
      const scoreboards = await TauriAPI.listScoreboards();
      const names = new Set(scoreboards.map((s) => s.name.toLowerCase()));
      setExistingNames(names);
    } catch (error) {
      console.error('Failed to load existing scoreboards:', error);
    }
  };

  const checkNameExists = (checkName: string): boolean => {
    // Check if name exists and it's different from the current name (case-insensitive)
    const normalizedCheck = checkName.trim().toLowerCase();
    const normalizedCurrent = currentName.toLowerCase();
    return (
      existingNames.has(normalizedCheck) &&
      normalizedCheck !== normalizedCurrent
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (checkNameExists(trimmedName)) {
      // Name exists - ask for confirmation
      setPendingSaveName(trimmedName);
      setShowOverwriteConfirm(true);
    } else {
      onSave(trimmedName);
      onClose();
    }
  };

  const handleQuickSave = () => {
    onSave(currentName);
    onClose();
  };

  const handleConfirmOverwrite = () => {
    if (pendingSaveName) {
      onSave(pendingSaveName);
      onClose();
    }
  };

  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
    setPendingSaveName(null);
  };

  const isNameChanged = name.trim() !== currentName;
  const nameWillOverwrite = checkNameExists(name.trim());

  // Overwrite confirmation dialog
  if (showOverwriteConfirm) {
    return (
      <Dialog isOpen={isOpen} onClose={handleCancelOverwrite} size="sm">
        <DialogHeader onClose={handleCancelOverwrite}>
          Overwrite Scoreboard?
        </DialogHeader>

        <DialogContent>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              A scoreboard named{' '}
              <span className="font-semibold">"{pendingSaveName}"</span> already
              exists.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Do you want to overwrite it? This action cannot be undone.
            </p>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancelOverwrite}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmOverwrite}>
            Overwrite
          </Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="sm">
      <DialogHeader onClose={onClose}>Save Scoreboard</DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <div className="space-y-4">
            {/* Current name info */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Current name
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {currentName}
              </div>
            </div>

            {/* New name input */}
            <Input
              label="Save as"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scoreboard name"
              hint={
                nameWillOverwrite
                  ? 'A scoreboard with this name already exists - saving will overwrite it'
                  : isNameChanged
                    ? 'This will save as a new scoreboard'
                    : 'Change the name to save as a copy'
              }
              required
            />

            {/* Warning for existing name */}
            {nameWillOverwrite && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ This will overwrite the existing scoreboard
                </p>
              </div>
            )}
          </div>
        </DialogContent>

        <DialogFooter className="flex-col sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickSave}
              className="flex-1 sm:flex-none"
            >
              Quick Save
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 sm:flex-none"
              variant={nameWillOverwrite ? 'destructive' : 'primary'}
            >
              {nameWillOverwrite
                ? 'Overwrite'
                : isNameChanged
                  ? 'Save as New'
                  : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
