import type { ElementOverride, LayoutNode, LayoutSnapshot, MorphConfig } from '../types.js';
import { childSegments, indexSnapshot, isRootPath } from './snapshotIndex.js';

export interface ConfigChangeSummary {
  path: string;
  label: string;
}

const STYLE_PHRASES: Record<string, string> = {
  color: 'text color',
  backgroundColor: 'background',
  background: 'background',
  fontSize: 'text size',
  fontWeight: 'text weight',
  fontStyle: 'text style',
  opacity: 'opacity',
  padding: 'spacing',
  margin: 'spacing',
  borderRadius: 'corners',
  textAlign: 'alignment',
};

function truncate(text: string, max = 48): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function findFirstTextLabel(node: LayoutNode): string | null {
  if (node.text?.trim()) return truncate(node.text);
  if (node.name?.trim()) return truncate(node.name);
  for (const child of node.children) {
    const label = findFirstTextLabel(child);
    if (label) return label;
  }
  return null;
}

function getElementLabel(node: LayoutNode | undefined): string {
  if (!node) return 'Part of the page';
  const direct = findFirstTextLabel(node);
  if (direct) return direct;
  return 'Part of the page';
}

function childLabel(parent: LayoutNode | undefined, segment: string): string {
  const child = parent?.children.find((c) => c.segment === segment);
  return child ? getElementLabel(child) : 'Item';
}

function describeStyleChange(override: ElementOverride): string {
  if (!override.style) return 'appearance updated';
  const keys = Object.keys(override.style);
  if (keys.length === 0) return 'appearance updated';
  if (keys.length === 1) {
    const phrase = STYLE_PHRASES[keys[0]] ?? 'appearance';
    return `${phrase} updated`;
  }
  return 'appearance updated';
}

function findMovedSegment(from: string[], to: string[]): string | null {
  for (const seg of to) {
    if (from.indexOf(seg) !== to.indexOf(seg)) return seg;
  }
  return null;
}

function describeReorder(
  parent: LayoutNode | undefined,
  beforeOrder: string[] | undefined,
  afterOrder: string[],
  rootSections?: LayoutNode[],
): string {
  const defaultOrder = parent
    ? childSegments(parent)
    : (rootSections?.map((n) => n.segment) ?? []);
  const from = beforeOrder ?? defaultOrder;
  const moved = findMovedSegment(from, afterOrder);
  if (moved) {
    const name = parent
      ? childLabel(parent, moved)
      : getElementLabel(rootSections?.find((n) => n.segment === moved));
    const newIndex = afterOrder.indexOf(moved);
    if (newIndex === 0) return `${name} moved to the top`;
    if (newIndex === afterOrder.length - 1) return `${name} moved to the bottom`;
    return `${name} relocated`;
  }
  const group = parent ? getElementLabel(parent) : 'Page sections';
  return `${group} — items reordered`;
}

function describeChange(
  path: string,
  snapshot: LayoutSnapshot,
  node: LayoutNode | undefined,
  prev: ElementOverride | undefined,
  next: ElementOverride,
): string {
  const name = isRootPath(snapshot, path) ? 'Page sections' : getElementLabel(node);

  if (prev && !next) {
    return `${name} restored to original`;
  }

  if (next.hidden) {
    return `${name} hidden`;
  }

  if (next.text !== undefined) {
    const preview = truncate(next.text, 36);
    return `${name} — text updated to “${preview}”`;
  }

  if (next.childOrder) {
    return describeReorder(
      node,
      prev?.childOrder,
      next.childOrder,
      isRootPath(snapshot, path) ? snapshot.nodes : undefined,
    );
  }

  if (next.style) {
    const stylePhrase = describeStyleChange(next);
    if (stylePhrase === 'text color updated' && next.style.color) {
      return `${name} — text color updated`;
    }
    if (stylePhrase === 'text size updated' && next.style.fontSize) {
      return `${name} — text size updated`;
    }
    if (stylePhrase === 'background updated' && next.style.backgroundColor) {
      return `${name} — background updated`;
    }
    return `${name} — ${stylePhrase}`;
  }

  return `${name} updated`;
}

function overridesEqual(a: ElementOverride, b: ElementOverride): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function summarizeConfigChanges(
  before: MorphConfig,
  after: MorphConfig,
  snapshot: LayoutSnapshot,
): ConfigChangeSummary[] {
  const { nodesByPath } = indexSnapshot(snapshot);
  const changes: ConfigChangeSummary[] = [];
  const allPaths = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const path of allPaths) {
    const prev = before[path];
    const next = after[path];
    const node = nodesByPath.get(path);

    if (!prev && next) {
      changes.push({ path, label: describeChange(path, snapshot, node, prev, next) });
      continue;
    }

    if (prev && !next) {
      changes.push({
        path,
        label: `${getElementLabel(node)} restored to original`,
      });
      continue;
    }

    if (prev && next && !overridesEqual(prev, next)) {
      changes.push({ path, label: describeChange(path, snapshot, node, prev, next) });
    }
  }

  return changes;
}
