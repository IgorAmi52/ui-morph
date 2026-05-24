import type { MorphConfig, ConfigAction } from '../types';

export interface ConfigHistoryStacks {
  past: MorphConfig[];
  future: MorphConfig[];
}

export function createEmptyHistory(): ConfigHistoryStacks {
  return { past: [], future: [] };
}

export function isRecordableAction(action: ConfigAction): boolean {
  switch (action.type) {
    case 'SET_OVERRIDE':
    case 'REMOVE_OVERRIDE':
    case 'REORDER_CHILDREN':
    case 'RESET_CONFIG':
      return true;
    case 'SET_CONFIG':
      return true;
    default:
      return false;
  }
}

export function cloneConfig(config: MorphConfig): MorphConfig {
  return structuredClone(config);
}

export function pushHistory(
  stacks: ConfigHistoryStacks,
  present: MorphConfig,
): ConfigHistoryStacks {
  return {
    past: [...stacks.past, cloneConfig(present)],
    future: [],
  };
}

export function undoHistory(
  stacks: ConfigHistoryStacks,
  present: MorphConfig,
): { stacks: ConfigHistoryStacks; config: MorphConfig | null } {
  if (stacks.past.length === 0) return { stacks, config: null };
  const previous = stacks.past[stacks.past.length - 1];
  return {
    stacks: {
      past: stacks.past.slice(0, -1),
      future: [cloneConfig(present), ...stacks.future],
    },
    config: previous,
  };
}

export function redoHistory(
  stacks: ConfigHistoryStacks,
  present: MorphConfig,
): { stacks: ConfigHistoryStacks; config: MorphConfig | null } {
  if (stacks.future.length === 0) return { stacks, config: null };
  const [next, ...rest] = stacks.future;
  return {
    stacks: {
      past: [...stacks.past, cloneConfig(present)],
      future: rest,
    },
    config: next,
  };
}
