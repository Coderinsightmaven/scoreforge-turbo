import React from 'react';
import { ScoreboardComponent } from '../../../../types/scoreboard';

interface TextStyleSectionProps {
  /** The component being edited */
  component: ScoreboardComponent;
  /** Callback when style changes */
  onStyleChange: (property: string, value: string | number | boolean | Record<string, unknown>) => void;
}

/**
 * TextStyleSection displays controls for editing text-related styles.
 * 
 * Features:
 * - Font size slider (8-72px)
 * - Text color picker
 * - Text alignment (left, center, right)
 * - Font weight (normal, bold, light)
 */
export const TextStyleSection: React.FC<TextStyleSectionProps> = ({
  component,
  onStyleChange,
}) => {
  return (
    <div className="border-t border-gray-200 pt-4">
      <h5 className="text-sm font-medium text-gray-900 mb-2">Text Style</h5>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Font Size: {component.style.fontSize || 16}px
          </label>
          <input
            type="range"
            min="8"
            max="72"
            value={component.style.fontSize || 16}
            onChange={(e) => onStyleChange('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Text Color
          </label>
          <input
            type="color"
            value={component.style.textColor || '#ffffff'}
            onChange={(e) => onStyleChange('textColor', e.target.value)}
            className="w-full h-8 rounded border border-gray-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Text Align
          </label>
          <select
            value={component.style.textAlign || 'center'}
            onChange={(e) => onStyleChange('textAlign', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Font Weight
          </label>
          <select
            value={component.style.fontWeight || 'normal'}
            onChange={(e) => onStyleChange('fontWeight', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Light</option>
          </select>
        </div>
      </div>
    </div>
  );
};
