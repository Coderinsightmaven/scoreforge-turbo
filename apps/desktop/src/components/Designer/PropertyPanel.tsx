import React, { useState } from 'react';
import { useScoreboardStore } from '../../stores/useScoreboardStore';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useImageStore } from '../../stores/useImageStore';
import { useVideoStore } from '../../stores/useVideoStore';
import { ComponentType } from '../../types/scoreboard';
import { ImageManager } from '../ui/ImageManager';
import { VideoManager } from '../ui/VideoManager';
import { ComponentsList } from './PropertyPanel/ComponentsList';
import { PositionSizeSection } from './PropertyPanel/shared/PositionSizeSection';
import { TextStyleSection } from './PropertyPanel/shared/TextStyleSection';

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
  const { components, updateComponentData, updateComponentStyle, updateComponentPosition, updateComponentSize, removeComponent } = useScoreboardStore();
  const { selectedComponents, selectComponent, clearSelection } = useCanvasStore();
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isVideoManagerOpen, setIsVideoManagerOpen] = useState(false);

  // Get the selected component (only show properties if exactly one is selected)
  const selectedComponent = selectedComponents.size === 1 
    ? components.find(c => c.id === Array.from(selectedComponents)[0])
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
            const component = components.find(c => c.id === id);
            if (component) {
              updateComponentData(id, { visible: !component.visible });
            }
          }}
          onClearSelection={clearSelection}
          onDeleteAll={() => {
            components.forEach(c => removeComponent(c.id));
          }}
        />
      </div>
    );
  }

  /**
   * Handles position changes for the selected component.
   * Updates the X or Y coordinate of the component.
   * 
   * @param axis - Either 'x' or 'y' to specify which coordinate to update
   * @param value - The new coordinate value
   */
  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    updateComponentPosition(selectedComponent.id, {
      ...selectedComponent.position,
      [axis]: value
    });
  };

  /**
   * Handles size changes for the selected component.
   * Updates the width or height, enforcing a minimum size of 10px.
   * 
   * @param dimension - Either 'width' or 'height' to specify which dimension to update
   * @param value - The new dimension value (will be clamped to minimum 10px)
   */
  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    updateComponentSize(selectedComponent.id, {
      ...selectedComponent.size,
      [dimension]: Math.max(10, value) // Minimum size of 10px
    });
  };

  /**
   * Handles style property changes for the selected component.
   * Updates any style property (backgroundColor, fontSize, etc.).
   * 
   * @param property - The style property name to update
   * @param value - The new value for the property
   */
  const handleStyleChange = (property: string, value: any) => {
    updateComponentStyle(selectedComponent.id, { [property]: value });
  };

  /**
   * Handles component data property changes.
   * Updates component-specific data (text, imageId, playerNumber, etc.).
   * 
   * @param property - The data property name to update
   * @param value - The new value for the property
   */
  const handleDataChange = (property: string, value: any) => {
    updateComponentData(selectedComponent.id, { [property]: value });
  };


  /**
   * Handles component deletion.
   * Shows a confirmation dialog before deleting the selected component.
   */
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      removeComponent(selectedComponent.id);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedComponent.type 
              ? selectedComponent.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) 
              : 'Component'} Properties
          </h3>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>

        {/* Position and Size - using shared component */}
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
                value={selectedComponent.style.backgroundColor === 'transparent' ? '#ffffff' : (selectedComponent.style.backgroundColor || '#ffffff')}
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
                value={selectedComponent.style.borderColor === 'transparent' ? '#000000' : (selectedComponent.style.borderColor || '#000000')}
                onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                className="w-16 h-8 rounded border border-gray-300"
                disabled={selectedComponent.style.borderColor === 'transparent'}
              />
              <button
                onClick={() => handleStyleChange('borderColor', selectedComponent.style.borderColor === 'transparent' ? '#000000' : 'transparent')}
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
            <div className="text-xs text-gray-500 text-center">{Math.round((selectedComponent.style.opacity || 1) * 100)}%</div>
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

  /**
   * Renders component-specific property editors based on component type.
   * Each component type has its own set of editable properties.
   * 
   * @returns JSX element for the appropriate property editor, or null if no editor exists
   */
  function renderDataProperties() {
    if (!selectedComponent) return null;

    switch (selectedComponent.type) {
      case ComponentType.BACKGROUND:
        return <BackgroundComponentProperties />;
      case ComponentType.LOGO:
        return <LogoComponentProperties />;
      case ComponentType.TEXT:
        return <TextComponentProperties />;
      case ComponentType.VIDEO:
        return <VideoComponentProperties />;
      case ComponentType.TENNIS_PLAYER_NAME:
        return <TennisPlayerNameProperties />;
      case ComponentType.TENNIS_DOUBLES_PLAYER_NAME:
        return <TennisDoublesPlayerNameProperties />;
      case ComponentType.TENNIS_TEAM_NAMES:
        return <TennisTeamNamesProperties />;
      case ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY:
        return <TennisAdaptiveTeamDisplayProperties />;
      case ComponentType.TENNIS_GAME_SCORE:
        return <TennisGameScoreProperties />;
      case ComponentType.TENNIS_SET_SCORE:
        return <TennisSetScoreProperties />;
      case ComponentType.TENNIS_MATCH_SCORE:
        return <TennisMatchScoreProperties />;
      case ComponentType.TENNIS_DETAILED_SET_SCORE:
        return <TennisDetailedSetScoreProperties />;
      case ComponentType.TENNIS_SERVING_INDICATOR:
        return <TennisServingIndicatorProperties />;
      default:
        return <div className="text-sm text-gray-500">No properties available</div>;
    }
  }

  function BackgroundComponentProperties() {
    const { images } = useImageStore();
    const selectedImage = images.find(img => img.id === selectedComponent?.data.imageId);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Image
          </label>
          {selectedImage ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <img 
                  src={selectedImage.thumbnail} 
                  alt={selectedImage.name}
                  className="w-12 h-12 object-cover rounded border"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{selectedImage.name}</div>
                  <div className="text-xs text-gray-500">Background Image</div>
                </div>
              </div>
              <button
                onClick={() => setIsImageManagerOpen(true)}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Change Background
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsImageManagerOpen(true)}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Select Background
            </button>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scale Mode
          </label>
          <select
            value={selectedComponent?.data.scaleMode || 'cover'}
            onChange={(e) => handleDataChange('scaleMode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cover">Cover (Fill entire area)</option>
            <option value="contain">Contain (Fit within area)</option>
            <option value="stretch">Stretch (Fill ignoring aspect ratio)</option>
            <option value="original">Original Size</option>
          </select>
        </div>
      </div>
    );
  }

  /**
   * LogoComponentProperties renders property editor for LOGO components.
   * Allows selecting a logo image and setting scale mode.
   */
  function LogoComponentProperties() {
    const { images } = useImageStore();
    const selectedImage = images.find(img => img.id === selectedComponent?.data.imageId);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Image
          </label>
          {selectedImage ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <img 
                  src={selectedImage.thumbnail} 
                  alt={selectedImage.name}
                  className="w-12 h-12 object-cover rounded border"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{selectedImage.name}</div>
                  <div className="text-xs text-gray-500">Logo Image</div>
                </div>
              </div>
              <button
                onClick={() => setIsImageManagerOpen(true)}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Change Logo
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsImageManagerOpen(true)}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Select Logo
            </button>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scale Mode
          </label>
          <select
            value={selectedComponent?.data.scaleMode || 'contain'}
            onChange={(e) => handleDataChange('scaleMode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cover">Cover (Fill entire area)</option>
            <option value="contain">Contain (Fit within area)</option>
            <option value="stretch">Stretch (Fill ignoring aspect ratio)</option>
            <option value="original">Original Size</option>
          </select>
        </div>
      </div>
    );
  }

  /**
   * TextComponentProperties renders property editor for TEXT components.
   * Allows editing text content, font size, color, alignment, and weight.
   */
  function TextComponentProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    // Update local state when selected component changes
    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    const handleTextKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleTextBlur();
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Content
          </label>
          <textarea
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter text... (Ctrl+Enter to apply immediately)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size: {selectedComponent?.style.fontSize || 16}px
          </label>
          <input
            type="range"
            min="8"
            max="72"
            value={selectedComponent?.style.fontSize || 16}
            onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Color
          </label>
          <input
            type="color"
            value={selectedComponent?.style.textColor || '#ffffff'}
            onChange={(e) => handleStyleChange('textColor', e.target.value)}
            className="w-full h-10 rounded border border-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Align
          </label>
          <select
            value={selectedComponent?.style.textAlign || 'center'}
            onChange={(e) => handleStyleChange('textAlign', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Weight
          </label>
          <select
            value={selectedComponent?.style.fontWeight || 'normal'}
            onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Light</option>
          </select>
        </div>
      </div>
    );
  }

  /**
   * VideoComponentProperties renders property editor for VIDEO components.
   * Allows selecting a video file and configuring playback settings
   * (autoplay, loop, muted, controls, volume, playback speed).
   */
  function VideoComponentProperties() {
    const { videos } = useVideoStore();
    const selectedVideo = videos.find(video => video.id === selectedComponent?.data.videoId);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File
          </label>
          {selectedVideo ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                  🎥
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{selectedVideo.originalName}</div>
                  <div className="text-xs text-gray-500">Video File</div>
                </div>
              </div>
              <button
                onClick={() => setIsVideoManagerOpen(true)}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Change Video
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsVideoManagerOpen(true)}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Select Video
            </button>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scale Mode
          </label>
          <select
            value={selectedComponent?.data.videoData?.scaleMode || 'cover'}
            onChange={(e) => handleDataChange('videoData', { 
              ...selectedComponent?.data.videoData, 
              scaleMode: e.target.value 
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cover">Cover (Fill entire area)</option>
            <option value="contain">Contain (Fit within area)</option>
            <option value="stretch">Stretch (Fill ignoring aspect ratio)</option>
            <option value="original">Original Size</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Playback Settings
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedComponent?.data.videoData?.autoplay || false}
                onChange={(e) => handleDataChange('videoData', { 
                  ...selectedComponent?.data.videoData, 
                  autoplay: e.target.checked 
                })}
                className="mr-2"
              />
              <span className="text-sm">Autoplay</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedComponent?.data.videoData?.loop || false}
                onChange={(e) => handleDataChange('videoData', { 
                  ...selectedComponent?.data.videoData, 
                  loop: e.target.checked 
                })}
                className="mr-2"
              />
              <span className="text-sm">Loop</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedComponent?.data.videoData?.muted !== false}
                onChange={(e) => handleDataChange('videoData', { 
                  ...selectedComponent?.data.videoData, 
                  muted: e.target.checked 
                })}
                className="mr-2"
              />
              <span className="text-sm">Muted</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedComponent?.data.videoData?.controls || false}
                onChange={(e) => handleDataChange('videoData', { 
                  ...selectedComponent?.data.videoData, 
                  controls: e.target.checked 
                })}
                className="mr-2"
              />
              <span className="text-sm">Show Controls</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {Math.round((selectedComponent?.data.videoData?.volume || 1) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedComponent?.data.videoData?.volume || 1}
            onChange={(e) => handleDataChange('videoData', { 
              ...selectedComponent?.data.videoData, 
              volume: parseFloat(e.target.value) 
            })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Playback Speed: {selectedComponent?.data.videoData?.playbackRate || 1}x
          </label>
          <select
            value={selectedComponent?.data.videoData?.playbackRate || 1}
            onChange={(e) => handleDataChange('videoData', { 
              ...selectedComponent?.data.videoData, 
              playbackRate: parseFloat(e.target.value) 
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x (Normal)</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>
    );
  }

  /**
   * TennisPlayerNameProperties renders property editor for TENNIS_PLAYER_NAME components.
   * Allows selecting player number (1 or 2) and setting fallback text.
   * Displays live player name from tennis API when connected.
   */
  function TennisPlayerNameProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Number
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Text
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Player Name"
          />
          <div className="text-xs text-gray-500 mt-1">
            Shown when no live data is available
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisDoublesPlayerNameProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Doubles Player
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Team 1 (Lastname / Lastname)</option>
            <option value={2}>Team 1 (Lastname / Lastname)</option>
            <option value={3}>Team 2 (Lastname / Lastname)</option>
            <option value={4}>Team 2 (Lastname / Lastname)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Name
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Lastname / Lastname"
          />
          <div className="text-xs text-gray-500 mt-1">
            Enter team names as "Lastname1 / Lastname2" format
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisAdaptiveTeamDisplayProperties() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team Selection
          </label>
          <select
            value={selectedComponent?.data.teamSelection || 0}
            onChange={(e) => handleDataChange('teamSelection', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Both Teams (Team 1 vs Team 2)</option>
            <option value={1}>Team 1 Only</option>
            <option value={2}>Team 2 Only</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Select which team(s) to display
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md">
          <div className="text-sm text-blue-800">
            <strong>Adaptive Display Logic:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• <strong>Doubles:</strong> Shows school name from sides[].note</li>
              <li>• <strong>Singles:</strong> Shows school name + player's last name</li>
              <li>• Example: "Georgia" (doubles) or "Georgia - Smith" (singles)</li>
            </ul>
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisTeamNamesProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');
    const [separator, setSeparator] = useState(selectedComponent?.data.separator || ' vs ');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
      setSeparator(selectedComponent?.data.separator || ' vs ');
    }, [selectedComponent?.id, selectedComponent?.data.text, selectedComponent?.data.separator]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    const handleSeparatorBlur = () => {
      if (separator !== selectedComponent?.data.separator) {
        handleDataChange('separator', separator);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Number
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1 (Team 1)</option>
            <option value={2}>Player 2 (Team 2)</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Select which player/team this component represents
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team Display
          </label>
          <select
            value={selectedComponent?.data.teamSelection || 0}
            onChange={(e) => handleDataChange('teamSelection', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>Both Teams (Team 1 vs Team 2)</option>
            <option value={1}>Team 1 Only</option>
            <option value={2}>Team 2 Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Separator (for both teams)
          </label>
          <input
            type="text"
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
            onBlur={handleSeparatorBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder=" vs "
          />
          <div className="text-xs text-gray-500 mt-1">
            Text to display between team names (e.g., " vs ", " - ", " | ")
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Text
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Team 1 vs Team 2"
          />
          <div className="text-xs text-gray-500 mt-1">
            Text to show when no live data is available
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisGameScoreProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Number
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Score
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <div className="text-xs text-gray-500 mt-1">
            Shown when no live data is available
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisSetScoreProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Number
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Score
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <div className="text-xs text-gray-500 mt-1">
            Shown when no live data is available
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisMatchScoreProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Number
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Score
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <div className="text-xs text-gray-500 mt-1">
            Shown when no live data is available
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }


  function TennisDetailedSetScoreProperties() {
    const [localText, setLocalText] = useState(selectedComponent?.data.text || '');

    React.useEffect(() => {
      setLocalText(selectedComponent?.data.text || '');
    }, [selectedComponent?.id, selectedComponent?.data.text]);

    const handleTextBlur = () => {
      if (localText !== selectedComponent?.data.text) {
        handleDataChange('text', localText);
      }
    };

    // Determine available sets based on live data
    const getAvailableSets = () => {
      // Since we're focused on tennis API, show all sets
      return [1, 2, 3];
    };

    const availableSets = getAvailableSets();
    const currentSetNumber = selectedComponent?.data.setNumber || 1;

    // If current selected set is not available anymore, reset to the highest available
    React.useEffect(() => {
      if (!availableSets.includes(currentSetNumber)) {
        const maxAvailableSet = Math.max(...availableSets);
        handleDataChange('setNumber', maxAvailableSet);
      }
    }, [availableSets, currentSetNumber]);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set Number
          </label>
          <select
            value={selectedComponent?.data.setNumber || 1}
            onChange={(e) => handleDataChange('setNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableSets.map(setNum => (
              <option key={setNum} value={setNum}>
                Set {setNum}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {availableSets.length < 3 ? 
              `Only shows sets that are in progress or completed (${availableSets.length} of 3 available)` :
              'All sets available (no live data connection)'
            }
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Number
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fallback Score
          </label>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <div className="text-xs text-gray-500 mt-1">
            Shown when no live data is available
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }

  function TennisServingIndicatorProperties() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player to Track
          </label>
          <select
            value={selectedComponent?.data.playerNumber || 1}
            onChange={(e) => handleDataChange('playerNumber', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Player 1</option>
            <option value={2}>Player 2</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            The tennis ball emoji will appear when this player is serving
          </div>
        </div>

        <TextStyleSection component={selectedComponent} onStyleChange={handleStyleChange} />
      </div>
    );
  }
};