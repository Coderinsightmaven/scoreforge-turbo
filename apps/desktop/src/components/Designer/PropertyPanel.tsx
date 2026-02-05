import React, { useState } from 'react';
import { useScoreboardStore } from '../../stores/useScoreboardStore';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { ComponentType } from '../../types/scoreboard';
import { ImageManager } from '../ui/ImageManager';
import { VideoManager } from '../ui/VideoManager';
import { ComponentsList } from './PropertyPanel/ComponentsList';
import { PositionSizeSection } from './PropertyPanel/shared/PositionSizeSection';
import {
  BackgroundEditor,
  LogoEditor,
  TextEditor,
  VideoEditor,
  TennisPlayerNameEditor,
  TennisDoublesEditor,
  TennisAdaptiveDisplayEditor,
  TennisTeamNamesEditor,
  TennisGameScoreEditor,
  TennisSetScoreEditor,
  TennisMatchScoreEditor,
  TennisDetailedSetScoreEditor,
  TennisServingEditor,
} from './PropertyPanel/editors';

/**
 * PropertyPanel displays and allows editing of component properties.
 *
 * Features:
 * - Shows component list when no component is selected
 * - Shows property editor when exactly one component is selected
 * - Supports editing position, size, style, and component-specific data
 * - Integrates with ImageManager and VideoManager for asset selection
 *
 * Component-specific property editors are rendered based on component type.
 */
export const PropertyPanel: React.FC = () => {
  const {
    components,
    updateComponentData,
    updateComponentStyle,
    updateComponentPosition,
    updateComponentSize,
    removeComponent,
  } = useScoreboardStore();
  const { selectedComponents, selectComponent, clearSelection } = useCanvasStore();
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isVideoManagerOpen, setIsVideoManagerOpen] = useState(false);

  // Get the selected component (only show properties if exactly one is selected)
  const selectedComponent =
    selectedComponents.size === 1
      ? components.find((c) => c.id === Array.from(selectedComponents)[0])
      : null;

  // Show components list when no component is selected
  if (!selectedComponent) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <ComponentsList
          components={components}
          onSelectComponent={selectComponent}
          onDeleteComponent={(id) => {
            if (confirm('Are you sure you want to delete this component?')) {
              removeComponent(id);
            }
          }}
          onToggleVisibility={(id) => {
            const component = components.find((c) => c.id === id);
            if (component) {
              updateComponentData(id, { visible: !component.visible });
            }
          }}
          onClearSelection={clearSelection}
          onDeleteAll={() => {
            components.forEach((c) => removeComponent(c.id));
          }}
        />
      </div>
    );
  }

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    updateComponentPosition(selectedComponent.id, {
      ...selectedComponent.position,
      [axis]: value,
    });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    updateComponentSize(selectedComponent.id, {
      ...selectedComponent.size,
      [dimension]: Math.max(10, value),
    });
  };

  const handleStyleChange = (property: string, value: string | number | boolean | Record<string, unknown>) => {
    updateComponentStyle(selectedComponent.id, { [property]: value });
  };

  const handleDataChange = (property: string, value: string | number | boolean | Record<string, unknown>) => {
    updateComponentData(selectedComponent.id, { [property]: value });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      removeComponent(selectedComponent.id);
    }
  };

  const editorProps = {
    component: selectedComponent,
    onDataChange: handleDataChange,
    onStyleChange: handleStyleChange,
    onOpenImageManager: () => setIsImageManagerOpen(true),
    onOpenVideoManager: () => setIsVideoManagerOpen(true),
  };

  const renderDataProperties = () => {
    switch (selectedComponent.type) {
      case ComponentType.BACKGROUND:
        return <BackgroundEditor {...editorProps} />;
      case ComponentType.LOGO:
        return <LogoEditor {...editorProps} />;
      case ComponentType.TEXT:
        return <TextEditor {...editorProps} />;
      case ComponentType.VIDEO:
        return <VideoEditor {...editorProps} />;
      case ComponentType.TENNIS_PLAYER_NAME:
        return <TennisPlayerNameEditor {...editorProps} />;
      case ComponentType.TENNIS_DOUBLES_PLAYER_NAME:
        return <TennisDoublesEditor {...editorProps} />;
      case ComponentType.TENNIS_TEAM_NAMES:
        return <TennisTeamNamesEditor {...editorProps} />;
      case ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY:
        return <TennisAdaptiveDisplayEditor {...editorProps} />;
      case ComponentType.TENNIS_GAME_SCORE:
        return <TennisGameScoreEditor {...editorProps} />;
      case ComponentType.TENNIS_SET_SCORE:
        return <TennisSetScoreEditor {...editorProps} />;
      case ComponentType.TENNIS_MATCH_SCORE:
        return <TennisMatchScoreEditor {...editorProps} />;
      case ComponentType.TENNIS_DETAILED_SET_SCORE:
        return <TennisDetailedSetScoreEditor {...editorProps} />;
      case ComponentType.TENNIS_SERVING_INDICATOR:
        return <TennisServingEditor {...editorProps} />;
      default:
        return <div className="text-sm text-gray-500">No properties available</div>;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedComponent.type
              ? selectedComponent.type
                  .replace(/_/g, ' ')
                  .toLowerCase()
                  .replace(/\b\w/g, (l: string) => l.toUpperCase())
              : 'Component'}{' '}
            Properties
          </h3>
          <button onClick={handleDelete} className="text-red-600 hover:text-red-800 text-sm">
            Delete
          </button>
        </div>

        {/* Position and Size */}
        <PositionSizeSection
          component={selectedComponent}
          onPositionChange={handlePositionChange}
          onSizeChange={handleSizeChange}
        />

        {/* Style */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Style</h4>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Background Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={
                  selectedComponent.style.backgroundColor === 'transparent'
                    ? '#ffffff'
                    : selectedComponent.style.backgroundColor || '#ffffff'
                }
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-16 h-8 rounded border border-gray-300"
              />
              <button
                onClick={() => handleStyleChange('backgroundColor', 'transparent')}
                className={`px-3 py-1 text-xs rounded border ${
                  selectedComponent.style.backgroundColor === 'transparent'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                Transparent
              </button>
            </div>
            {selectedComponent.style.backgroundColor === 'transparent' && (
              <div className="text-xs text-gray-500 mt-1">Background is transparent</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Border Width</label>
            <input
              type="number"
              min="0"
              value={selectedComponent.style.borderWidth || 0}
              onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Border Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={
                  selectedComponent.style.borderColor === 'transparent'
                    ? '#000000'
                    : selectedComponent.style.borderColor || '#000000'
                }
                onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                className="w-16 h-8 rounded border border-gray-300"
                disabled={selectedComponent.style.borderColor === 'transparent'}
              />
              <button
                onClick={() =>
                  handleStyleChange(
                    'borderColor',
                    selectedComponent.style.borderColor === 'transparent'
                      ? '#000000'
                      : 'transparent'
                  )
                }
                className={`px-3 py-1 text-xs rounded border ${
                  selectedComponent.style.borderColor === 'transparent'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {selectedComponent.style.borderColor === 'transparent' ? 'Visible' : 'Transparent'}
              </button>
            </div>
            {selectedComponent.style.borderColor === 'transparent' && (
              <div className="text-xs text-gray-500 mt-1">Border is transparent</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius</label>
            <input
              type="number"
              min="0"
              value={selectedComponent.style.borderRadius || 0}
              onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={selectedComponent.style.opacity || 1}
              onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {Math.round((selectedComponent.style.opacity || 1) * 100)}%
            </div>
          </div>
        </div>

        {/* Component Data Properties */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Component Data</h4>
          {renderDataProperties()}
        </div>
      </div>

      {isImageManagerOpen && (
        <ImageManager
          isOpen={isImageManagerOpen}
          onClose={() => setIsImageManagerOpen(false)}
          selectMode={true}
          onSelectImage={(image) => {
            updateComponentData(selectedComponent.id, { imageId: image.id });
            setIsImageManagerOpen(false);
          }}
        />
      )}

      {isVideoManagerOpen && (
        <VideoManager
          isOpen={isVideoManagerOpen}
          onClose={() => setIsVideoManagerOpen(false)}
          selectMode={true}
          onSelectVideo={(video) => {
            updateComponentData(selectedComponent.id, { videoId: video.id });
            setIsVideoManagerOpen(false);
          }}
        />
      )}
    </div>
  );
};
