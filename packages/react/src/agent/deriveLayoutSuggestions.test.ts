import { describe, expect, it } from 'vitest';
import { deriveLayoutSuggestions } from './deriveLayoutSuggestions';
import type { LayoutSnapshot } from '../types';

const snapshot: LayoutSnapshot = {
  viewId: 'dashboard',
  nodeCount: 3,
  nodes: [
    {
      path: 'morph.div:0',
      tag: 'motion.div',
      segment: 'div:0',
      textLeaf: false,
      hidden: false,
      children: [
        {
          path: 'morph.div:0.h1:0',
          tag: 'h1',
          segment: 'h1:0',
          text: 'Welcome back',
          textLeaf: true,
          hidden: false,
          children: [],
        },
      ],
    },
    {
      path: 'morph.section:0',
      tag: 'section',
      segment: 'section:0',
      name: 'Stats row',
      textLeaf: false,
      hidden: false,
      children: [
        {
          path: 'morph.section:0.div:0',
          tag: 'div',
          segment: 'motion.div:0',
          textLeaf: false,
          hidden: false,
          children: [],
        },
        {
          path: 'morph.section:0.div:1',
          tag: 'div',
          segment: 'div:1',
          textLeaf: false,
          hidden: false,
          children: [],
        },
      ],
    },
  ],
};

describe('deriveLayoutSuggestions', () => {
  it('uses heading and section labels from the snapshot', () => {
    const suggestions = deriveLayoutSuggestions(snapshot);
    expect(suggestions.some((s) => s.includes('Welcome back'))).toBe(true);
    expect(suggestions.some((s) => s.includes('Stats row'))).toBe(true);
  });

  it('prioritizes selected element prompt', () => {
    const suggestions = deriveLayoutSuggestions(snapshot, 'morph.div:0.h1:0');
    expect(suggestions[0]).toContain('selected element');
  });
});
