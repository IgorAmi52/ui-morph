import { describe, expect, it } from 'vitest';
import type { LayoutSnapshot } from '../types.js';
import { ValidationError } from '../services/validationService.js';
import {
  deriveEditScope,
  executeApplyScopedOverrides,
  executeReorderChildren,
  executeResizeBox,
  executeResizeGridItem,
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
        {
          path: 'morph.div:0.article:0',
          tag: 'article',
          segment: 'article:0',
          textLeaf: false,
          hidden: false,
          layout: {
            display: 'block',
            isGridItem: true,
            gridColumn: 'span 3',
            gridRow: 'auto',
            columnSpan: 3,
            maxColumnSpan: 12,
          },
          capabilities: {
            visibility: true,
            text: false,
            style: true,
            resize: true,
            reorder: true,
          },
          children: [],
        },
      ],
    },
    {
      path: 'morph.aside:0',
      tag: 'aside',
      segment: 'aside:0',
      textLeaf: true,
      hidden: false,
      text: 'Sidebar',
      children: [],
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

  it('rejects paths outside selected edit scope', () => {
    const selectionSubtree = snapshot.nodes[0];
    const scope = deriveEditScope(snapshot, selectionSubtree);

    expect(() =>
      executeSetElementOverride({}, snapshot, {
        path: 'morph.aside:0',
        text: 'Nope',
      }, scope),
    ).toThrowError(/outside the current edit scope/);
  });
});

describe('executeApplyScopedOverrides', () => {
  it('applies several changes inside scope', () => {
    const scope = deriveEditScope(snapshot, snapshot.nodes[0]);
    const next = executeApplyScopedOverrides({}, snapshot, {
      changes: [
        { path: 'morph.div:0.h1:0', text: 'Updated title' },
        { path: 'morph.div:0.p:0', style: { color: 'red' } },
      ],
    }, scope);

    expect(next['morph.div:0.h1:0']).toEqual({ text: 'Updated title' });
    expect(next['morph.div:0.p:0']).toEqual({ style: { color: 'red' } });
  });
});

describe('semantic resize tools', () => {
  it('resizes grid items by column span', () => {
    const scope = deriveEditScope(snapshot, snapshot.nodes[0]);
    const next = executeResizeGridItem({}, snapshot, {
      path: 'morph.div:0.article:0',
      columnSpan: 6,
    }, scope);

    expect(next['morph.div:0.article:0']).toEqual({
      style: { gridColumn: 'span 6' },
    });
  });

  it('resizes boxes by pixel dimensions', () => {
    const scope = deriveEditScope(snapshot, snapshot.nodes[0]);
    const next = executeResizeBox({}, snapshot, {
      path: 'morph.div:0.article:0',
      height: 220,
    }, scope);

    expect(next['morph.div:0.article:0']).toEqual({
      style: { height: '220px' },
    });
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

  it('rejects reorder outside selected edit scope', () => {
    const scope = deriveEditScope(snapshot, snapshot.nodes[0]);
    expect(() =>
      executeReorderChildren({}, snapshot, {
        parentPath: 'morph',
        childOrder: ['aside:0', 'div:0'],
      }, scope),
    ).toThrowError(/outside the current edit scope/);
  });
});
