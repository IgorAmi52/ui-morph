import type { LayoutNode, LayoutSnapshot } from '../types';

function walkNodes(nodes: LayoutNode[], visit: (node: LayoutNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walkNodes(node.children, visit);
  }
}

function findHeading(snapshot: LayoutSnapshot): LayoutNode | undefined {
  let match: LayoutNode | undefined;
  walkNodes(snapshot.nodes, (node) => {
    if (match) return;
    if (/^h[1-3]$/.test(node.tag) && node.text) match = node;
  });
  return match;
}

function findSection(snapshot: LayoutSnapshot): LayoutNode | undefined {
  return snapshot.nodes.find((node) => node.children.length >= 2);
}

/** Client-side fallback when the suggestions API is unavailable. */
export function deriveLayoutSuggestions(snapshot: LayoutSnapshot, selectedPath?: string | null): string[] {
  const suggestions: string[] = [];

  if (selectedPath) {
    suggestions.push('Make the selected element stand out more');
  }

  const heading = findHeading(snapshot);
  if (heading?.text) {
    suggestions.push(`Make "${heading.text}" larger and bolder`);
  }

  const section = findSection(snapshot);
  if (section?.name || section?.text) {
    const label = section.name ?? section.text ?? 'the main section';
    suggestions.push(`Hide ${label}`);
  } else if (snapshot.nodes.length > 0) {
    suggestions.push('What sections are on this page?');
  }

  if (suggestions.length < 3) {
    suggestions.push('Summarize the layout of this page');
  }

  return suggestions.slice(0, 3);
}
