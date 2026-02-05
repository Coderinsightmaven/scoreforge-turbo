// src/types/tauri.ts
export interface MonitorInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  is_primary: boolean;
  scale_factor: number;
  work_area_width: number;
  work_area_height: number;
  work_area_x: number;
  work_area_y: number;
}

export interface WindowConfig {
  label: string;
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  decorations?: boolean;
  alwaysOnTop?: boolean;
  fullscreen?: boolean;
  maximized?: boolean;
  minimized?: boolean;
  visible?: boolean;
}

export interface TauriCommand<T = unknown> {
  command: string;
  payload?: Record<string, unknown>;
  response?: T;
}

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveFileResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface LoadFileResult {
  path: string;
  content: string;
  success: boolean;
  error?: string;
}

export interface TauriError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoSave: boolean;
  autoSaveInterval: number;
  recentFiles: string[];
  lastOpenDirectory: string;
  gridDefaults: {
    size: number;
    enabled: boolean;
    snapToGrid: boolean;
  };
  canvasDefaults: {
    width: number;
    height: number;
    backgroundColor: string;
  };
} 