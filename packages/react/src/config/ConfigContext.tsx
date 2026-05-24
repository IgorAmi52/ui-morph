import { createContext, useContext, useReducer, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { MorphContextValue, MorphMode, MorphConfig, StorageAdapter, ConfigAction } from '../types';
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
  apiUrl?: string;
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
  apiUrl,
  onSave,
  onError,
  children,
}: ConfigProviderProps) {
  const [config, reducerDispatch] = useReducer(configReducer, initial ?? initialConfig);
  const configRef = useRef(config);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const dispatch = useCallback((action: ConfigAction) => {
    configRef.current = configReducer(configRef.current, action);
    reducerDispatch(action);
  }, []);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    dispatch({ type: 'SET_CONFIG', payload: initial ?? initialConfig });
  }, [dispatch, initial]);

  const selectElement = useCallback((path: string | null) => {
    setSelectedPath(path);
  }, []);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    try {
      const latestConfig = configRef.current;
      const savedConfig = await adapter.saveConfig(userId, viewId, latestConfig);
      dispatch({ type: 'SET_CONFIG', payload: savedConfig });
      onSave?.(savedConfig);
      return true;
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [adapter, userId, viewId, dispatch, onSave, onError]);

  const value: MorphContextValue = {
    config,
    dispatch,
    mode,
    editable,
    toggleMode,
    selectedPath,
    selectElement,
    saveConfig,
    userId,
    viewId,
    apiUrl,
    onError,
  };

  return <MorphContext.Provider value={value}>{children}</MorphContext.Provider>;
}

export function useMorphContext(): MorphContextValue {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error('useMorphContext must be used within a <Morph> component');
  return ctx;
}
