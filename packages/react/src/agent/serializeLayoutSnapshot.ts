import type { LayoutNode, LayoutSnapshot, MorphConfig } from '../types';
import { getSegment } from '../tree/domDecorator';
import { getDisabledCapabilities, isCapabilityEnabled } from '../editor/capabilities';
import { getGridItemResizeContext } from '../editor/gridItemResize';

const MAX_NODES = 200;
const TEXT_TRUNCATE = 80;

function isTextLeaf(el: HTMLElement): boolean {
  for (let i = 0; i < el.childNodes.length; i++) {
    if (el.childNodes[i].nodeType === Node.ELEMENT_NODE) return false;
  }
  return el.childNodes.length > 0;
}

function truncateText(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= TEXT_TRUNCATE) return trimmed;
  return `${trimmed.slice(0, TEXT_TRUNCATE)}…`;
}

function readComputed(el: HTMLElement): LayoutNode['computed'] {
  const style = getComputedStyle(el);
  return {
    color: style.color,
    fontSize: style.fontSize,
    backgroundColor: style.backgroundColor,
  };
}

function readLayout(el: HTMLElement): LayoutNode['layout'] {
  const style = getComputedStyle(el);
  const gridItem = getGridItemResizeContext(el);

  return {
    display: style.display,
    isGridItem: Boolean(gridItem),
    gridColumn: style.gridColumn,
    gridRow: style.gridRow,
    columnSpan: gridItem?.columnSpan,
    maxColumnSpan: gridItem?.maxColumnSpan,
  };
}

function readBounds(el: HTMLElement): LayoutNode['bounds'] {
  const rect = el.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function readCapabilities(el: HTMLElement, textLeaf: boolean): LayoutNode['capabilities'] {
  const disabled = getDisabledCapabilities(el);
  return {
    visibility: isCapabilityEnabled(disabled, 'visibility'),
    text: textLeaf,
    style: isCapabilityEnabled(disabled, 'textColor') ||
      isCapabilityEnabled(disabled, 'background') ||
      isCapabilityEnabled(disabled, 'resize'),
    resize: isCapabilityEnabled(disabled, 'resize'),
    reorder: isCapabilityEnabled(disabled, 'reorder'),
  };
}

function accessibleName(el: HTMLElement): string | undefined {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl?.textContent) return truncateText(labelEl.textContent);
  }
  return undefined;
}

interface BuildState {
  count: number;
  truncated: boolean;
}

function buildNode(
  el: HTMLElement,
  config: MorphConfig,
  state: BuildState,
): LayoutNode | null {
  if (state.count >= MAX_NODES) {
    state.truncated = true;
    return null;
  }

  const path = el.getAttribute('data-morph-path');
  if (!path) return null;

  state.count++;

  const override = config[path];
  const textLeaf = isTextLeaf(el);
  const rawText = textLeaf ? el.textContent ?? '' : '';
  const text = rawText ? truncateText(rawText) : undefined;

  const childElements = Array.from(el.children).filter(
    (ch): ch is HTMLElement =>
      ch instanceof HTMLElement &&
      ch.hasAttribute('data-morph-path') &&
      !ch.hasAttribute('data-morph-editor'),
  );

  const children: LayoutNode[] = [];
  for (const child of childElements) {
    const node = buildNode(child, config, state);
    if (node) children.push(node);
    if (state.truncated && state.count >= MAX_NODES) break;
  }

  return {
    path,
    tag: el.tagName.toLowerCase(),
    segment: getSegment(path),
    role: el.getAttribute('role') ?? undefined,
    name: accessibleName(el),
    text,
    textLeaf,
    hidden: override?.hidden ?? false,
    override: override ? { ...override } : undefined,
    computed: readComputed(el),
    layout: readLayout(el),
    bounds: readBounds(el),
    capabilities: readCapabilities(el, textLeaf),
    children,
  };
}

export const MORPH_ROOT_PATH = 'morph';

export function serializeLayoutSnapshot(
  container: HTMLElement,
  options: {
    viewId: string;
    config: MorphConfig;
    selectedPath?: string | null;
  },
): LayoutSnapshot {
  const state: BuildState = { count: 0, truncated: false };
  const nodes: LayoutNode[] = [];

  const rootChildren = Array.from(container.children).filter(
    (ch): ch is HTMLElement =>
      ch instanceof HTMLElement &&
      ch.hasAttribute('data-morph-path') &&
      !ch.hasAttribute('data-morph-editor'),
  );

  for (const el of rootChildren) {
    const node = buildNode(el, options.config, state);
    if (node) nodes.push(node);
    if (state.truncated) break;
  }

  return {
    viewId: options.viewId,
    rootPath: MORPH_ROOT_PATH,
    selectedPath: options.selectedPath ?? undefined,
    truncated: state.truncated,
    nodeCount: state.count,
    nodes,
  };
}
