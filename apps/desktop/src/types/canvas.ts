// src/types/canvas.ts
export interface DragData {
  componentId: string;
  startPosition: { x: number; y: number };
  offset: { x: number; y: number };
  isMultiSelect: boolean;
  selectedIds: string[];
}

export interface ResizeData {
  componentId: string;
  handle: ResizeHandle;
  startSize: { width: number; height: number };
  startPosition: { x: number; y: number };
  aspectRatio?: number;
}

export const enum ResizeHandle {
  TOP_LEFT = 'tl',
  TOP_CENTER = 'tc',
  TOP_RIGHT = 'tr',
  MIDDLE_LEFT = 'ml',
  MIDDLE_RIGHT = 'mr',
  BOTTOM_LEFT = 'bl',
  BOTTOM_CENTER = 'bc',
  BOTTOM_RIGHT = 'br',
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  snapToGrid: boolean;
  showGrid: boolean;
  color: string;
  opacity: number;
}

export interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface PointerEvent {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
}

export interface CanvasHistory {
  past: CanvasSnapshot[];
  present: CanvasSnapshot;
  future: CanvasSnapshot[];
}

export interface CanvasSnapshot {
  components: Record<string, unknown>[];
  canvasSize: { width: number; height: number };
  timestamp: number;
  description: string;
} 