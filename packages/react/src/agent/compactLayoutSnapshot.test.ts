import { describe, expect, it } from 'vitest';
import { compactLayoutSnapshot } from './compactLayoutSnapshot';
import type { LayoutSnapshot } from '../types';

const snapshot: LayoutSnapshot = {
  viewId: 'dashboard',
  rootPath: 'morph',
  nodeCount: 2,
  nodes: [
    {
      path: 'morph.section:0',
      tag: 'section',
      segment: 'section:0',
      text: 'Recent claims',
      textLeaf: true,
      hidden: false,
      computed: { color: 'red', fontSize: '16px', backgroundColor: '#fff' },
      override: { style: { color: 'blue' } },
      children: [],
    },
  ],
};

describe('compactLayoutSnapshot', () => {
  it('strips computed styles and overrides', () => {
    const compact = compactLayoutSnapshot(snapshot);
    expect(compact.nodes[0]?.computed).toBeUndefined();
    expect(compact.nodes[0]?.override).toBeUndefined();
    expect(compact.nodes[0]?.text).toBe('Recent claims');
  });
});
