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
  sessionId?: string;
  routeId?: string;
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
  /** Dev/eval only: replace static layout instructions (GEPA). */
  instructionsOverride?: string;
}

export interface AgentMessageResponse {
  reply: string;
  config?: MorphConfig;
  proposedConfig?: MorphConfig;
  changes?: ConfigChangeSummary[];
  appliedTools?: string[];
  /** Populated when a tool call returned success: false (eval / debugging). */
  toolErrors?: string[];
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

export interface GeneratedPageItem {
  id: string;
  label: string;
  text?: string;
  value?: string;
  kind: 'text' | 'metric' | 'list';
}

export interface GeneratedPageSection {
  id: string;
  title: string;
  sourceRouteId?: string;
  visualHtml?: string;
  items: GeneratedPageItem[];
}

export interface GeneratedPageDefinition {
  title: string;
  description?: string;
  sections: GeneratedPageSection[];
}

export interface GeneratedPageVisualFragment {
  id: string;
  label: string;
  routeId: string;
  path: string;
  html: string;
  text?: string;
}

export interface GeneratedPageSourceSnapshot {
  viewId: string;
  routeId: string;
  path: string;
  label: string;
  capturedAt: string;
  snapshot: LayoutSnapshot;
  visualFragments?: GeneratedPageVisualFragment[];
}

export interface GeneratedPageSourceSummary {
  viewId: string;
  routeId: string;
  path: string;
  label: string;
  capturedAt: string;
}

export interface AgentPageRequest {
  userId: string;
  viewId: string;
  sessionId: string;
  routeId: string;
  prompt: string;
  sources: GeneratedPageSourceSnapshot[];
}

export interface AgentPageResponse {
  definition: GeneratedPageDefinition;
}

export interface GeneratedPageMetadata {
  pageId: string;
  userId: string;
  sessionId: string;
  viewId: string;
  routeId: string;
  title: string;
  prompt: string;
  sources: GeneratedPageSourceSummary[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPage extends GeneratedPageMetadata {
  definition: GeneratedPageDefinition;
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
