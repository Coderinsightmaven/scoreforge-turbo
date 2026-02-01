/**
 * DraggableComponent - Renders a draggable scoreboard component on the canvas.
 *
 * Features:
 * - Drag-and-drop support via @dnd-kit
 * - Resize handles (8 handles: corners and edges)
 * - Live tennis data integration
 * - Type-specific rendering (background, logo, text, video, tennis components)
 * - Selection state visualization
 * - Style application (colors, borders, fonts)
 */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ScoreboardComponent, ComponentType } from '../../../types/scoreboard';
import { ResizeHandle } from '../../../types/canvas';
import { ResizeHandles } from './ResizeHandles';
import { ImageComponent } from './ImageComponent';
import { VideoComponent } from './VideoComponent';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useLiveDataStore } from '../../../stores/useLiveDataStore';
import {
  TennisScoreRenderer,
  TennisNameRenderer,
  TennisServingRenderer,
} from './renderers';

interface DraggableComponentProps {
  component: ScoreboardComponent;
  onSelect?: (id: string) => void;
  onResizeStart?: (componentId: string, handle: ResizeHandle, event: React.MouseEvent) => void;
}

// Tennis component types for quick lookup
const TENNIS_NAME_TYPES = new Set([
  ComponentType.TENNIS_PLAYER_NAME,
  ComponentType.TENNIS_DOUBLES_PLAYER_NAME,
  ComponentType.TENNIS_TEAM_NAMES,
  ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY,
]);

const TENNIS_SCORE_TYPES = new Set([
  ComponentType.TENNIS_GAME_SCORE,
  ComponentType.TENNIS_SET_SCORE,
  ComponentType.TENNIS_MATCH_SCORE,
  ComponentType.TENNIS_DETAILED_SET_SCORE,
]);

export const DraggableComponent: React.FC<DraggableComponentProps> = ({
  component,
  onSelect,
  onResizeStart,
}) => {
  const { selectedComponents, isResizing } = useCanvasStore();
  const isSelected = selectedComponents.has(component.id);

  // Get live tennis data for tennis components - use proper selector for reactive updates
  const isTennisComponent = component.type.startsWith('tennis_') || component.type.startsWith('player');
  const tennisMatch = useLiveDataStore((state) => {
    if (!isTennisComponent) return null;
    const activeConnection = state.connections.find(
      (conn) => conn.provider === 'scoreforge' && conn.isActive
    );
    return activeConnection ? state.activeData[activeConnection.id] ?? null : null;
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: component.id,
    data: { type: 'component', component },
  });

  const handleResizeStart = (handle: ResizeHandle, event: React.MouseEvent) => {
    if (onResizeStart) {
      onResizeStart(component.id, handle, event);
    }
  };

  const handleComponentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(component.id);
    }
  };

  const transformStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : {};

  const getBackgroundColor = () => {
    if (component.style.rgbColor) {
      const { r, g, b, a = 1 } = component.style.rgbColor;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return component.style.backgroundColor || '#ffffff';
  };

  const renderComponentContent = () => {
    switch (component.type) {
      case ComponentType.BACKGROUND:
        if (!component.data.imageId) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
              No Background Selected
            </div>
          );
        }
        return (
          <ImageComponent
            imageId={component.data.imageId}
            alt="Background Image"
            scaleMode={component.data.scaleMode || 'cover'}
          />
        );

      case ComponentType.LOGO:
        if (!component.data.imageId) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 text-sm">
              No Logo Selected
            </div>
          );
        }
        return (
          <ImageComponent
            imageId={component.data.imageId}
            alt="Logo Image"
            scaleMode={component.data.scaleMode || 'contain'}
          />
        );

      case ComponentType.TEXT: {
        const textAlign = component.style.textAlign || 'center';
        const justifyClass =
          textAlign === 'left'
            ? 'justify-start'
            : textAlign === 'right'
              ? 'justify-end'
              : 'justify-center';
        const textAlignClass =
          textAlign === 'left'
            ? 'text-left'
            : textAlign === 'right'
              ? 'text-right'
              : 'text-center';

        return (
          <div
            className={`w-full h-full flex items-center ${justifyClass} ${textAlignClass} px-2`}
            style={{
              fontSize: `${component.style.fontSize || 16}px`,
              color: component.style.textColor || '#ffffff',
              fontWeight: component.style.fontWeight || 'normal',
              wordWrap: 'break-word',
              overflow: 'hidden',
            }}
          >
            {component.data.text || 'Sample Text'}
          </div>
        );
      }

      case ComponentType.VIDEO:
        if (!component.data.videoId) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 text-sm">
              <div className="text-center">
                <div className="text-2xl mb-2">🎥</div>
                <div>No Video Selected</div>
              </div>
            </div>
          );
        }
        return (
          <VideoComponent
            videoId={component.data.videoId}
            scaleMode={component.data.videoData?.scaleMode || 'cover'}
            autoplay={component.data.videoData?.autoplay || false}
            loop={component.data.videoData?.loop || false}
            muted={component.data.videoData?.muted !== false}
            controls={component.data.videoData?.controls || false}
            volume={component.data.videoData?.volume || 1}
            playbackRate={component.data.videoData?.playbackRate || 1}
          />
        );

      // Tennis serving indicator
      case ComponentType.TENNIS_SERVING_INDICATOR:
        return (
          <TennisServingRenderer
            componentData={component.data}
            componentStyle={component.style}
            componentId={component.id}
            tennisMatch={tennisMatch}
          />
        );

      default:
        // Tennis name components
        if (TENNIS_NAME_TYPES.has(component.type)) {
          return (
            <TennisNameRenderer
              componentType={component.type}
              componentData={component.data}
              componentStyle={component.style}
              componentId={component.id}
              tennisMatch={tennisMatch}
            />
          );
        }

        // Tennis score components
        if (TENNIS_SCORE_TYPES.has(component.type)) {
          return (
            <TennisScoreRenderer
              componentType={component.type}
              componentData={component.data}
              componentStyle={component.style}
              componentId={component.id}
              tennisMatch={tennisMatch}
            />
          );
        }

        // Unknown component
        return (
          <div className="w-full h-full flex items-center justify-center bg-red-200 text-red-700 text-sm">
            Unknown Component
          </div>
        );
    }
  };

  const isImageComponent =
    (component.type === ComponentType.BACKGROUND || component.type === ComponentType.LOGO) &&
    component.data.imageId;

  return (
    <div
      ref={setNodeRef}
      className={`component-item ${isSelected ? 'component-selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: component.position.x,
        top: component.position.y,
        width: component.size.width,
        height: component.size.height,
        backgroundColor: getBackgroundColor(),
        border: `${component.style.borderWidth || 0}px solid ${component.style.borderColor === 'transparent' ? 'transparent' : component.style.borderColor || '#000000'}`,
        borderRadius: `${component.style.borderRadius || 0}px`,
        display: 'flex',
        alignItems: isImageComponent ? 'stretch' : 'center',
        justifyContent: isImageComponent ? 'stretch' : 'center',
        textAlign: 'center',
        padding: isImageComponent ? 0 : 8,
        overflow: isImageComponent ? 'hidden' : 'visible',
        opacity: isDragging ? 0.5 : component.style.opacity || 1,
        zIndex: component.zIndex || 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        ...transformStyle,
      }}
      onClick={handleComponentClick}
      {...listeners}
      {...(!isResizing ? attributes : {})}
    >
      {renderComponentContent()}
      <ResizeHandles
        component={component}
        isSelected={isSelected}
        onResizeStart={handleResizeStart}
      />
    </div>
  );
};
