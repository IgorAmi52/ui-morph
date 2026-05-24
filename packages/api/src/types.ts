export interface ElementOverride {
  hidden?: boolean;
  text?: string;
  style?: Record<string, string>;
  childOrder?: string[];
}

export type MorphConfig = Record<string, ElementOverride>;

export interface OverrideRequest {
  userId: string;
  viewId: string;
  path: string;
  type: 'manual' | 'ai_prompt';
  changes?: ElementOverride;
  prompt?: string;
}

/** Aligned with @ui-morph/react — keep in sync. */
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
  role: 'user' | 'assistant';
  content: string;
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
