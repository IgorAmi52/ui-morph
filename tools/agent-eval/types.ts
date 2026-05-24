import type {
  AgentMessageRequest,
  AgentMessageResponse,
  ElementOverride,
  LayoutSnapshot,
  MorphConfig,
} from '../../packages/api/src/types.js';

export type ScenarioSplit = 'train' | 'val';

export interface ScenarioExpect {
  /** No tool returned success: false. */
  toolsSucceeded?: boolean;
  appliedToolsIncludes?: string[];
  appliedToolsExcludes?: string[];
  /** Subset match per path (deep partial for override fields). */
  configHas?: Record<string, Partial<ElementOverride>>;
  /** Proposed config must include these paths. */
  configPathKeys?: string[];
  childOrderAt?: { path: string; order: string[] };
  /** Agent must not propose config changes. */
  noProposedConfig?: boolean;
  /** Case-insensitive substrings that must not appear in reply. */
  replyMustNotMatch?: string[];
  /** Case-insensitive substrings that must appear in reply. */
  replyMustMatch?: string[];
  /** At least one of these phrases must appear in the reply. */
  replyMustMatchAny?: string[];
  /** Minimum number of tool invocations recorded in appliedTools. */
  minAppliedTools?: number;
}

export interface AgentScenario {
  id: string;
  split: ScenarioSplit;
  description?: string;
  userId?: string;
  viewId?: string;
  message: string;
  config: MorphConfig;
  snapshot: LayoutSnapshot;
  selectedPath?: string;
  selectionLabel?: string;
  expect: ScenarioExpect;
}

export interface ScenarioScore {
  scenarioId: string;
  score: number;
  passed: number;
  total: number;
  feedback: string;
}

export interface EvalResult {
  version: string;
  split: string;
  meanScore: number;
  scenarios: ScenarioScore[];
  feedback: string;
}

export type ScenarioRunInput = Omit<AgentMessageRequest, 'userId' | 'viewId'> & {
  userId?: string;
  viewId?: string;
};

export interface ScenarioRunResult {
  request: AgentMessageRequest;
  response: AgentMessageResponse;
}
