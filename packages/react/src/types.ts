import type { ReactNode, Dispatch } from 'react';

export interface ElementOverride {
  hidden?: boolean;
  text?: string;
  style?: Record<string, string>;
  childOrder?: string[];
}

export type MorphConfig = Record<string, ElementOverride>;

export type MorphMode = 'view' | 'edit';

export interface MorphProps {
  userId: string;
  viewId?: string;
  apiUrl?: string;
  mode?: MorphMode;
  editable?: boolean;
  onSave?: (config: MorphConfig) => void;
  onError?: (error: Error) => void;
  fallback?: ReactNode;
  children: ReactNode;
}

export type ConfigAction =
  | { type: 'SET_CONFIG'; payload: MorphConfig }
  | { type: 'SET_OVERRIDE'; payload: { path: string; override: ElementOverride } }
  | { type: 'REMOVE_OVERRIDE'; payload: { path: string } }
  | { type: 'RESET_CONFIG' }
  | { type: 'REORDER_CHILDREN'; payload: { parentPath: string; childOrder: string[] } };

export interface MorphContextValue {
  config: MorphConfig;
  dispatch: Dispatch<ConfigAction>;
  mode: MorphMode;
  editable: boolean;
  toggleMode: (() => void) | null;
  selectedPath: string | null;
  selectElement: (path: string | null) => void;
  saveConfig: () => Promise<boolean>;
}

export interface StorageAdapter {
  getConfig(userId: string, viewId: string): Promise<MorphConfig>;
  saveConfig(userId: string, viewId: string, config: MorphConfig): Promise<MorphConfig>;
}
