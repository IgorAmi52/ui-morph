import type { ReactNode } from 'react';

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
  sessionId?: string;
  routeId?: string;
  apiUrl?: string;
  storageAdapter?: StorageAdapter;
  mode?: MorphMode;
  editable?: boolean;
  onShare?: (payload: MorphSharePayload) => void | Promise<void>;
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

export interface DispatchOptions {
  /** Skip undo history (initial load, save baseline, undo/redo). */
  skipHistory?: boolean;
}

export interface MorphContextValue {
  config: MorphConfig;
  dispatch: (action: ConfigAction, options?: DispatchOptions) => void;
  mode: MorphMode;
  editable: boolean;
  toggleMode: (() => void) | null;
  selectedPath: string | null;
  selectElement: (path: string | null) => void;
  saveConfig: () => Promise<boolean>;
  discardChanges: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  beginHistoryTransaction: () => void;
  commitHistoryTransaction: () => void;
  userId: string;
  viewId: string;
  sessionId: string;
  routeId: string;
  apiUrl?: string;
  onError?: (error: Error) => void;
}

export interface StorageAdapter {
  getConfig(
    userId: string,
    viewId: string,
    sessionId?: string,
    routeId?: string,
  ): Promise<MorphConfig>;
  saveConfig(
    userId: string,
    viewId: string,
    config: MorphConfig,
    sessionId?: string,
    routeId?: string,
  ): Promise<MorphConfig>;
}

export interface MorphSharePayload {
  userId: string;
  viewId: string;
  sessionId: string;
  routeId: string;
  config: MorphConfig;
  sourcePath?: string;
}

export interface ShareMetadata {
  shareId: string;
  userId: string;
  viewId: string;
  sessionId: string;
  routeId: string;
  sourcePath?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateSharePayload = MorphSharePayload;

/** Compact tree sent to the layout agent (shared contract with @ui-morph/api). */
export interface LayoutNode {
  path: string;
  tag: string;
  segment: string;
  role?: string;
  name?: string;
  text?: string;
  textLeaf: boolean;
  hidden: boolean;
  override?: ElementOverride;
  computed?: {
    color?: string;
    fontSize?: string;
    backgroundColor?: string;
  };
  children: LayoutNode[];
}

export interface LayoutSnapshot {
  viewId: string;
  /** Virtual root path for top-level reorder (default "morph"). */
  rootPath?: string;
  selectedPath?: string;
  truncated?: boolean;
  nodeCount: number;
  nodes: LayoutNode[];
}

export interface ConfigChangeSummary {
  path: string;
  label: string;
}

export interface AgentChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  proposal?: {
    id: string;
    status: 'pending' | 'accepted' | 'discarded';
    beforeConfig: MorphConfig;
    proposedConfig: MorphConfig;
    changes: ConfigChangeSummary[];
  };
  /** Loaded from storage — no live config blobs */
  proposalSummary?: {
    status: 'accepted' | 'discarded' | 'expired';
    changes: ConfigChangeSummary[];
  };
}

export interface AgentMessageRequest {
  userId: string;
  viewId: string;
  message: string;
  selectedPath?: string;
  selectionLabel?: string;
  selectionSubtree?: LayoutNode;
  snapshot: LayoutSnapshot;
  config: MorphConfig;
  history?: AgentChatMessage[];
}

export interface AgentMessageResponse {
  reply: string;
  /** @deprecated use proposedConfig — kept for older clients */
  config?: MorphConfig;
  proposedConfig?: MorphConfig;
  changes?: ConfigChangeSummary[];
  appliedTools?: string[];
}

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  proposal?: {
    status: 'accepted' | 'discarded' | 'expired';
    changes: ConfigChangeSummary[];
  };
}

export interface ChatHistoryResponse {
  messages: StoredChatMessage[];
}

export interface AgentSuggestionsRequest {
  userId: string;
  viewId: string;
  selectedPath?: string;
  snapshot: LayoutSnapshot;
  config: MorphConfig;
}

export interface AgentSuggestionsResponse {
  suggestions: string[];
}
