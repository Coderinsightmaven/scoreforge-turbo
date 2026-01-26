import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './Dialog';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../utils/cn';

interface CreateScoreboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateScoreboard: (name: string, width: number, height: number) => void;
}

interface PresetSize {
  name: string;
  label: string;
  width: number;
  height: number;
  aspect?: string;
}

const presetSizes: PresetSize[] = [
  { name: 'small', label: 'Small', width: 512, height: 256, aspect: '2:1' },
  { name: 'medium', label: 'Medium', width: 896, height: 512, aspect: '7:4' },
  { name: 'large', label: 'Large', width: 1024, height: 896, aspect: '8:7' },
  { name: 'hd', label: 'HD Ready', width: 1280, height: 720, aspect: '16:9' },
  { name: 'fullhd', label: 'Full HD', width: 1920, height: 1080, aspect: '16:9' },
  { name: '4:3', label: 'Standard', width: 800, height: 600, aspect: '4:3' },
];

export const CreateScoreboardDialog: React.FC<CreateScoreboardDialogProps> = ({
  isOpen,
  onClose,
  onCreateScoreboard,
}) => {
  const [name, setName] = useState('New Scoreboard');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [selectedPreset, setSelectedPreset] = useState<string>('hd');

  const handlePresetSelect = (preset: PresetSize) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setSelectedPreset(preset.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && width > 0 && height > 0) {
      onCreateScoreboard(name.trim(), width, height);
      onClose();
    }
  };

  const handleCustomDimensions = () => {
    setSelectedPreset('custom');
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <DialogHeader onClose={onClose}>Create New Scoreboard</DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <div className="space-y-6">
            {/* Name input */}
            <Input
              label="Scoreboard Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scoreboard name"
              required
            />

            {/* Preset sizes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Canvas Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presetSizes.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                      'hover:border-indigo-300 dark:hover:border-indigo-600',
                      selectedPreset === preset.name
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    )}
                  >
                    {/* Preview box */}
                    <div
                      className={cn(
                        'w-12 h-8 rounded mb-2 border',
                        selectedPreset === preset.name
                          ? 'bg-indigo-200 border-indigo-300 dark:bg-indigo-800 dark:border-indigo-600'
                          : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                      )}
                      style={{
                        aspectRatio: `${preset.width} / ${preset.height}`,
                        height: 'auto',
                        maxHeight: '32px',
                      }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {preset.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {preset.width} x {preset.height}
                    </span>
                    {preset.aspect && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {preset.aspect}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom dimensions */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleCustomDimensions}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    selectedPreset === 'custom'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  Custom dimensions
                </button>
                {selectedPreset !== 'custom' && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    (click to customize)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Width (px)"
                  type="number"
                  value={width}
                  onChange={(e) => {
                    setWidth(parseInt(e.target.value) || 0);
                    setSelectedPreset('custom');
                  }}
                  min={100}
                  max={7680}
                  required
                />
                <Input
                  label="Height (px)"
                  type="number"
                  value={height}
                  onChange={(e) => {
                    setHeight(parseInt(e.target.value) || 0);
                    setSelectedPreset('custom');
                  }}
                  min={100}
                  max={4320}
                  required
                />
              </div>

              {/* Aspect ratio info */}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Aspect ratio:{' '}
                {width && height ? (width / height).toFixed(2) : '--'}
              </p>
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Scoreboard</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
