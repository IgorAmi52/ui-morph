import type { MorphConfig, ConfigAction } from '../types';

export const initialConfig: MorphConfig = {};

export function configReducer(state: MorphConfig, action: ConfigAction): MorphConfig {
  switch (action.type) {
    case 'SET_CONFIG':
      return action.payload;
    case 'SET_OVERRIDE': {
      const { path, override } = action.payload;
      const existing = state[path];
      return {
        ...state,
        [path]: existing ? { ...existing, ...override } : override,
      };
    }
    case 'REMOVE_OVERRIDE': {
      const { [action.payload.path]: _, ...rest } = state;
      return rest;
    }
    case 'RESET_CONFIG':
      return initialConfig;
    case 'REORDER_CHILDREN': {
      const { parentPath, childOrder } = action.payload;
      const existing = state[parentPath];
      return {
        ...state,
        [parentPath]: existing ? { ...existing, childOrder } : { childOrder },
      };
    }
  }
}
