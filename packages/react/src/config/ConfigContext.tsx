import { createContext, useContext, useReducer, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { MorphContextValue, MorphMode, MorphConfig, StorageAdapter } from '../types';
import { configReducer, initialConfig } from './configReducer';

const MorphContext = createContext<MorphContextValue | null>(null);

interface ConfigProviderProps {
  mode: MorphMode;
  editable: boolean;
  toggleMode: (() => void) | null;
  initial?: MorphConfig;
  adapter: StorageAdapter;
  userId: string;
  viewId: string;
  onSave?: (config: MorphConfig) => void;
  onError?: (error: Error) => void;
  children: ReactNode;
}

export function ConfigProvider({
  mode,
  editable,
  toggleMode,
  initial,
  adapter,
  userId,
  viewId,
  onSave,
  onError,
  children,
}: ConfigProviderProps) {
  const [config, dispatch] = useReducer(configReducer, initial ?? initialConfig);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectElement = useCallback((path: string | null) => {
    setSelectedPath(path);
  }, []);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    try {
      await adapter.saveConfig(userId, viewId, config);
      onSave?.(config);
      return true;
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [adapter, userId, viewId, config, onSave, onError]);

  const value: MorphContextValue = {
    config,
    dispatch,
    mode,
    editable,
    toggleMode,
    selectedPath,
    selectElement,
    saveConfig,
  };

  return <MorphContext.Provider value={value}>{children}</MorphContext.Provider>;
}

export function useMorphContext(): MorphContextValue {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error('useMorphContext must be used within a <Morph> component');
  return ctx;
}
