import { describe, expect, it } from 'vitest';
import { childSegments, indexSnapshot } from './snapshotIndex.js';
import type { LayoutSnapshot } from '../types.js';

const snapshot: LayoutSnapshot = {
  viewId: 'dashboard',
  nodeCount: 2,
  nodes: [
    {
      path: 'morph.div:0',
      tag: 'div',
      segment: 'motion.div:0',
      textLeaf: false,
      hidden: false,
      children: [
        {
          path: 'morph.div:0.h1:0',
          tag: 'h1',
          segment: 'h1:0',
          textLeaf: true,
          hidden: false,
          text: 'Title',
          children: [],
        },
      ],
    },
  ],
};

describe('indexSnapshot', () => {
  it('indexes all node paths', () => {
    const { paths, nodesByPath } = indexSnapshot(snapshot);
    expect(paths).toEqual(new Set(['morph.div:0', 'morph.div:0.h1:0']));
    expect(nodesByPath.get('morph.div:0.h1:0')?.text).toBe('Title');
  });
});

describe('childSegments', () => {
  it('returns direct child segments', () => {
    expect(childSegments(snapshot.nodes[0])).toEqual(['h1:0']);
  });
});
