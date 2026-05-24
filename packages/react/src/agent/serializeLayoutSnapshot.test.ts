// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import type { LayoutNode } from '../types';
import { decoratePaths } from '../tree/domDecorator';
import { serializeLayoutSnapshot } from './serializeLayoutSnapshot';

function buildFixture(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <div><h1>Title</h1><p>Body text</p></div>
    <section data-morph-editor><span>ignored</span></section>
  `;
  decoratePaths(container, 'morph');
  return container;
}

describe('serializeLayoutSnapshot', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('builds a nested tree with morph paths', () => {
    const container = buildFixture();
    const snapshot = serializeLayoutSnapshot(container, {
      viewId: 'dashboard',
      config: {},
    });

    expect(snapshot.viewId).toBe('dashboard');
    expect(snapshot.nodeCount).toBeGreaterThan(0);
    expect(snapshot.nodes[0]?.path).toMatch(/^morph\./);
    expect(snapshot.rootPath).toBe('morph');
    expect(snapshot.nodes[0]?.children.length).toBeGreaterThan(0);
  });

  it('marks text leaves and includes config overrides', () => {
    const container = buildFixture();
    const h1Path = container.querySelector('h1')?.getAttribute('data-morph-path');
    expect(h1Path).toBeTruthy();

    const snapshot = serializeLayoutSnapshot(container, {
      viewId: 'v',
      config: { [h1Path!]: { style: { color: 'red' } } },
      selectedPath: h1Path,
    });

    expect(snapshot.selectedPath).toBe(h1Path);
    const h1Node = findNode(snapshot.nodes, h1Path!);
    expect(h1Node?.textLeaf).toBe(true);
    expect(h1Node?.text).toContain('Title');
    expect(h1Node?.override?.style?.color).toBe('red');
  });

  it('skips data-morph-editor subtrees', () => {
    const container = buildFixture();
    const snapshot = serializeLayoutSnapshot(container, {
      viewId: 'v',
      config: {},
    });

    const paths = flattenPaths(snapshot.nodes);
    expect(paths.some((p) => p.includes('section'))).toBe(false);
  });
});

function findNode(nodes: LayoutNode[], path: string): LayoutNode | undefined {
  for (const n of nodes) {
    if (n.path === path) return n;
    const found = findNode(n.children, path);
    if (found) return found;
  }
  return undefined;
}

function flattenPaths(nodes: LayoutNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    out.push(n.path);
    out.push(...flattenPaths(n.children));
  }
  return out;
}
