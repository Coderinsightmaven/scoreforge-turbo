import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './Dialog';
import { Button } from './button';
import { Input } from './input';

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

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  const handleQuickSave = () => {
    onSave(currentName);
    onClose();
  };

  const isNameChanged = name.trim() !== currentName;

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
                isNameChanged
                  ? 'This will save as a new scoreboard'
                  : 'Change the name to save as a copy'
              }
              required
            />
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
            >
              {isNameChanged ? 'Save as New' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
