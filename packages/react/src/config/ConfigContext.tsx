import { createContext, useContext, useReducer, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { MorphContextValue, MorphMode, MorphConfig, StorageAdapter, ConfigAction, DispatchOptions } from '../types';
import { configReducer, initialConfig } from './configReducer';
import {
  cloneConfig,
  createEmptyHistory,
  isRecordableAction,
  pushHistory,
  redoHistory,
  undoHistory,
  type ConfigHistoryStacks,
} from './configHistory';

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

function configsEqual(a: MorphConfig, b: MorphConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
  const savedConfigRef = useRef<MorphConfig>(cloneConfig(initial ?? initialConfig));
  const historyRef = useRef<ConfigHistoryStacks>(createEmptyHistory());
  const transactionBaselineRef = useRef<MorphConfig | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const bumpHistory = useCallback(() => {
    setHistoryVersion((v) => v + 1);
  }, []);

  const applyConfig = useCallback((next: MorphConfig) => {
    configRef.current = next;
    reducerDispatch({ type: 'SET_CONFIG', payload: next });
  }, []);

  const resetToSaved = useCallback((saved: MorphConfig) => {
    savedConfigRef.current = cloneConfig(saved);
    historyRef.current = createEmptyHistory();
    applyConfig(cloneConfig(saved));
    bumpHistory();
  }, [applyConfig, bumpHistory]);

  const dispatch = useCallback((action: ConfigAction, options?: DispatchOptions) => {
    const present = configRef.current;
    const next = configReducer(present, action);
    if (configsEqual(present, next)) return;

    const inTransaction = transactionBaselineRef.current !== null;
    if (!options?.skipHistory && !inTransaction && isRecordableAction(action)) {
      historyRef.current = pushHistory(historyRef.current, present);
      bumpHistory();
    }

    configRef.current = next;
    reducerDispatch(action);
  }, [bumpHistory]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    resetToSaved(initial ?? initialConfig);
  }, [initial, resetToSaved]);

  const selectElement = useCallback((path: string | null) => {
    setSelectedPath(path);
  }, []);

  const beginHistoryTransaction = useCallback(() => {
    transactionBaselineRef.current = cloneConfig(configRef.current);
  }, []);

  const commitHistoryTransaction = useCallback(() => {
    const baseline = transactionBaselineRef.current;
    transactionBaselineRef.current = null;
    if (!baseline) return;
    if (!configsEqual(baseline, configRef.current)) {
      historyRef.current = pushHistory(historyRef.current, baseline);
      bumpHistory();
    }
  }, [bumpHistory]);

  const undo = useCallback(() => {
    const result = undoHistory(historyRef.current, configRef.current);
    if (!result.config) return;
    historyRef.current = result.stacks;
    applyConfig(result.config);
    bumpHistory();
  }, [applyConfig, bumpHistory]);

  const redo = useCallback(() => {
    const result = redoHistory(historyRef.current, configRef.current);
    if (!result.config) return;
    historyRef.current = result.stacks;
    applyConfig(result.config);
    bumpHistory();
  }, [applyConfig, bumpHistory]);

  const discardChanges = useCallback(() => {
    resetToSaved(savedConfigRef.current);
  }, [resetToSaved]);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    try {
      const latestConfig = configRef.current;
      const savedConfig = await adapter.saveConfig(userId, viewId, latestConfig);
      resetToSaved(savedConfig);
      onSave?.(savedConfig);
      return true;
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [adapter, userId, viewId, resetToSaved, onSave, onError]);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  void historyVersion;

  const value: MorphContextValue = {
    config,
    dispatch,
    mode,
    editable,
    toggleMode,
    selectedPath,
    selectElement,
    saveConfig,
    discardChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    beginHistoryTransaction,
    commitHistoryTransaction,
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
