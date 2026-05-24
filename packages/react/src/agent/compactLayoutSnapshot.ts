import type { LayoutNode, LayoutSnapshot } from '../types';

const MAX_SUGGESTION_NODES = 48;
const TEXT_MAX = 48;

function compactNode(node: LayoutNode, depth: number, state: { count: number }): LayoutNode | null {
  if (state.count >= MAX_SUGGESTION_NODES) return null;
  state.count++;

  const text =
    node.text && node.text.length > TEXT_MAX
      ? `${node.text.slice(0, TEXT_MAX)}…`
      : node.text;

  const children: LayoutNode[] = [];
  if (depth < 4) {
    for (const child of node.children) {
      const compact = compactNode(child, depth + 1, state);
      if (compact) children.push(compact);
      if (state.count >= MAX_SUGGESTION_NODES) break;
    }
  }

  return {
    path: node.path,
    tag: node.tag,
    segment: node.segment,
    role: node.role,
    name: node.name,
    text,
    textLeaf: node.textLeaf,
    hidden: node.hidden,
    children,
  };
}

/** Smaller snapshot for fast suggestion requests (no styles/overrides/computed). */
export function compactLayoutSnapshot(snapshot: LayoutSnapshot): LayoutSnapshot {
  const state = { count: 0 };
  const nodes: LayoutNode[] = [];

  for (const node of snapshot.nodes) {
    const compact = compactNode(node, 0, state);
    if (compact) nodes.push(compact);
    if (state.count >= MAX_SUGGESTION_NODES) break;
  }

  return {
    viewId: snapshot.viewId,
    rootPath: snapshot.rootPath,
    selectedPath: snapshot.selectedPath,
    truncated: snapshot.truncated || state.count >= MAX_SUGGESTION_NODES,
    nodeCount: state.count,
    nodes,
  };
}
