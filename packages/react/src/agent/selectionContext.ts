import type { LayoutNode } from '../types';

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
