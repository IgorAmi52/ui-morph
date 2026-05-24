import type { LayoutNode, LayoutSnapshot } from '../types.js';

export interface SnapshotIndex {
  paths: Set<string>;
  nodesByPath: Map<string, LayoutNode>;
}

export function getRootPath(snapshot: LayoutSnapshot): string {
  return snapshot.rootPath?.trim() || 'morph';
}

export function isRootPath(snapshot: LayoutSnapshot, path: string): boolean {
  return path === getRootPath(snapshot);
}

export function rootChildSegments(snapshot: LayoutSnapshot): string[] {
  return snapshot.nodes.map((n) => n.segment);
}

export function indexSnapshot(snapshot: LayoutSnapshot): SnapshotIndex {
  const paths = new Set<string>();
  const nodesByPath = new Map<string, LayoutNode>();

  function walk(nodes: LayoutNode[]) {
    for (const node of nodes) {
      paths.add(node.path);
      nodesByPath.set(node.path, node);
      walk(node.children);
    }
  }

  walk(snapshot.nodes);
  return { paths, nodesByPath };
}

export function childSegments(parent: LayoutNode): string[] {
  return parent.children.map((c) => c.segment);
}
