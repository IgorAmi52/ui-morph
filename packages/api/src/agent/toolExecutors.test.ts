import { describe, expect, it } from 'vitest';
import type { LayoutSnapshot } from '../types.js';
import { ValidationError } from '../services/validationService.js';
import {
  executeReorderChildren,
  executeSetElementOverride,
  mergeOverride,
} from './toolExecutors.js';

const snapshot: LayoutSnapshot = {
  viewId: 'dashboard',
  nodeCount: 3,
  nodes: [
    {
      path: 'morph.div:0',
      tag: 'div',
      segment: 'div:0',
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
        {
          path: 'morph.div:0.p:0',
          tag: 'p',
          segment: 'p:0',
          textLeaf: true,
          hidden: false,
          text: 'Body',
          children: [],
        },
      ],
    },
  ],
};

describe('mergeOverride', () => {
  it('merges style without wiping childOrder', () => {
    const config = {
      'morph.div:0': { childOrder: ['p:0', 'h1:0'] },
    };
    const next = mergeOverride(config, 'morph.div:0', { style: { color: 'red' } });
    expect(next['morph.div:0']).toEqual({
      childOrder: ['p:0', 'h1:0'],
      style: { color: 'red' },
    });
  });
});

describe('executeSetElementOverride', () => {
  it('rejects unknown paths', () => {
    expect(() =>
      executeSetElementOverride({}, snapshot, { path: 'morph.missing:0', hidden: true }),
    ).toThrowError(ValidationError);
  });

  it('rejects text on non-text-leaf nodes', () => {
    expect(() =>
      executeSetElementOverride({}, snapshot, {
        path: 'morph.div:0',
        text: 'nope',
      }),
    ).toThrowError(/not a text leaf/);
  });

  it('updates text on text-leaf nodes', () => {
    const next = executeSetElementOverride({}, snapshot, {
      path: 'morph.div:0.h1:0',
      text: 'New title',
    });
    expect(next['morph.div:0.h1:0']).toEqual({ text: 'New title' });
  });
});

describe('executeReorderChildren', () => {
  it('accepts valid segment order', () => {
    const next = executeReorderChildren({}, snapshot, {
      parentPath: 'morph.div:0',
      childOrder: ['p:0', 'h1:0'],
    });
    expect(next['morph.div:0']?.childOrder).toEqual(['p:0', 'h1:0']);
  });

  it('reorders top-level sections via virtual morph root', () => {
    const pageSnapshot: LayoutSnapshot = {
      viewId: 'dashboard',
      rootPath: 'morph',
      nodeCount: 2,
      nodes: [
        {
          path: 'morph.section:0',
          tag: 'section',
          segment: 'section:0',
          textLeaf: false,
          hidden: false,
          children: [],
        },
        {
          path: 'morph.section:1',
          tag: 'section',
          segment: 'section:1',
          textLeaf: false,
          hidden: false,
          children: [],
        },
      ],
    };

    const next = executeReorderChildren({}, pageSnapshot, {
      parentPath: 'morph',
      childOrder: ['section:1', 'section:0'],
    });
    expect(next.morph?.childOrder).toEqual(['section:1', 'section:0']);
  });

  it('rejects full paths in childOrder', () => {
    expect(() =>
      executeReorderChildren({}, snapshot, {
        parentPath: 'morph.div:0',
        childOrder: ['morph.div:0.h1:0'],
      }),
    ).toThrowError(ValidationError);
  });
});
