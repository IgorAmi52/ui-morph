import { describe, expect, it } from 'vitest';
import type { LayoutSnapshot } from '../types.js';
import { summarizeConfigChanges } from './configDiff.js';

const snapshot: LayoutSnapshot = {
  viewId: 'dashboard',
  nodeCount: 4,
  nodes: [
    {
      path: 'morph.div:0',
      tag: 'div',
      segment: 'motion.div:0',
      textLeaf: false,
      hidden: false,
      children: [
        {
          path: 'morph.div:0.h3:0',
          tag: 'h3',
          segment: 'h3:0',
          textLeaf: true,
          hidden: false,
          text: 'Active policies',
          children: [],
        },
        {
          path: 'morph.div:0.p:0',
          tag: 'p',
          segment: 'p:0',
          textLeaf: true,
          hidden: false,
          text: 'Summary text',
          children: [],
        },
      ],
    },
    {
      path: 'morph.div:1',
      tag: 'div',
      segment: 'motion.div:1',
      textLeaf: false,
      hidden: false,
      children: [
        {
          path: 'morph.div:1.h1:0',
          tag: 'h1',
          segment: 'h1:0',
          textLeaf: true,
          hidden: false,
          text: 'Welcome back',
          children: [],
        },
      ],
    },
  ],
};

describe('summarizeConfigChanges', () => {
  it('uses visible text instead of paths for style changes', () => {
    const changes = summarizeConfigChanges(
      {},
      { 'morph.div:1.h1:0': { style: { color: 'red' } } },
      snapshot,
    );
    expect(changes[0].label).toBe('Welcome back — text color updated');
    expect(changes[0].label).not.toMatch(/morph\./);
  });

  it('describes hide in plain language', () => {
    const changes = summarizeConfigChanges(
      {},
      { 'morph.div:0': { hidden: true } },
      snapshot,
    );
    expect(changes[0].label).toBe('Active policies hidden');
  });

  it('describes restore in plain language', () => {
    const changes = summarizeConfigChanges(
      { 'morph.div:0': { hidden: true } },
      {},
      snapshot,
    );
    expect(changes[0].label).toBe('Active policies restored to original');
  });

  it('describes reorder with child label', () => {
    const changes = summarizeConfigChanges(
      { 'morph.div:0': { childOrder: ['h3:0', 'p:0'] } },
      { 'morph.div:0': { childOrder: ['p:0', 'h3:0'] } },
      snapshot,
    );
    expect(changes[0].label).toMatch(/Summary text moved/);
    expect(changes[0].label).not.toMatch(/h3:0|morph\./);
  });
});
