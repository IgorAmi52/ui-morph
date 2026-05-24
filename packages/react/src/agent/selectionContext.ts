import type { AgentEditScope, LayoutNode, LayoutSnapshot } from '../types';
import { MORPH_ROOT_PATH } from './serializeLayoutSnapshot';

const MAX_SUBTREE_NODES = 40;

function cloneCapped(node: LayoutNode, state: { count: number }): LayoutNode {
  state.count++;
  const children: LayoutNode[] = [];
  for (const child of node.children) {
    if (state.count >= MAX_SUBTREE_NODES) break;
    children.push(cloneCapped(child, state));
  }
  return { ...node, children };
}

function findNode(nodes: LayoutNode[], path: string): LayoutNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    const found = findNode(node.children, path);
    if (found) return found;
  }
  return undefined;
}

export function extractSelectionSubtree(
  nodes: LayoutNode[],
  selectedPath: string,
): LayoutNode | undefined {
  const match = findNode(nodes, selectedPath);
  if (!match) return undefined;
  const state = { count: 0 };
  return cloneCapped(match, state);
}

function collectScopePaths(
  node: LayoutNode,
  allowedPaths: string[],
  allowedParentPaths: string[],
): void {
  allowedPaths.push(node.path);
  if (node.children.length > 0) allowedParentPaths.push(node.path);
  for (const child of node.children) {
    collectScopePaths(child, allowedPaths, allowedParentPaths);
  }
}

function collectPageScope(snapshot: LayoutSnapshot): AgentEditScope {
  const allowedPaths: string[] = [];
  const allowedParentPaths = [snapshot.rootPath ?? MORPH_ROOT_PATH];

  for (const node of snapshot.nodes) {
    collectScopePaths(node, allowedPaths, allowedParentPaths);
  }

  return {
    rootPath: snapshot.rootPath ?? MORPH_ROOT_PATH,
    allowedPaths,
    allowedParentPaths,
    mode: 'page',
  };
}

export function deriveAgentEditScope(
  snapshot: LayoutSnapshot,
  selectionSubtree?: LayoutNode,
): AgentEditScope {
  if (!selectionSubtree) return collectPageScope(snapshot);

  const allowedPaths: string[] = [];
  const allowedParentPaths: string[] = [];
  collectScopePaths(selectionSubtree, allowedPaths, allowedParentPaths);

  return {
    rootPath: snapshot.rootPath ?? MORPH_ROOT_PATH,
    allowedPaths,
    allowedParentPaths,
    mode: 'selected-subtree',
  };
}

export function selectionLabelFromPath(path: string): string {
  const el = document.querySelector<HTMLElement>(`[data-morph-path="${CSS.escape(path)}"]`);
  const text = el?.textContent?.replace(/\s+/g, ' ').trim();
  if (text && text.length > 0) {
    return text.length > 36 ? `${text.slice(0, 35)}…` : text;
  }
  const aria = el?.getAttribute('aria-label');
  if (aria?.trim()) return aria.trim();
  return 'Selected element';
}
