export const MIN_GRID_FR = 0.15;
export const ROW_TOLERANCE_PX = 8;

export interface GridSplitHandle {
  boundaryIndex: number;
  top: number;
  left: number;
  height: number;
}

export interface GridSplitContext {
  parentPath: string;
  tracks: number[];
  handles: GridSplitHandle[];
  parentWidth: number;
}

function getMorphChildren(parent: HTMLElement): HTMLElement[] {
  return Array.from(parent.children).filter(
    (ch): ch is HTMLElement => ch instanceof HTMLElement && ch.hasAttribute('data-morph-path'),
  );
}

export function isSupportedGridTemplate(value: string): boolean {
  const lower = value.toLowerCase();
  if (!lower.trim()) return false;
  if (lower.includes('auto-fit') || lower.includes('auto-fill')) return false;
  if (lower.includes('minmax(')) return false;
  if (lower.includes('repeat(')) return false;
  return true;
}

export function parseFrTracks(value: string): number[] | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const tracks: number[] = [];
  for (const part of parts) {
    const match = part.match(/^([\d.]+)fr$/i);
    if (!match) return null;
    const weight = parseFloat(match[1]);
    if (!Number.isFinite(weight) || weight <= 0) return null;
    tracks.push(weight);
  }
  return tracks;
}

export function parseResolvedTrackWidths(value: string): number[] | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const widths: number[] = [];
  for (const part of parts) {
    const match = part.match(/^([\d.]+)px$/i);
    if (!match) return null;
    const width = parseFloat(match[1]);
    if (!Number.isFinite(width) || width <= 0) return null;
    widths.push(width);
  }
  return widths;
}

export function formatFrTracks(tracks: number[]): string {
  return tracks
    .map((track) => {
      const rounded = Math.round(track * 1000) / 1000;
      return `${rounded}fr`;
    })
    .join(' ');
}

export function applyBoundaryDelta(
  tracks: number[],
  boundaryIndex: number,
  weightDelta: number,
  minFr: number = MIN_GRID_FR,
): number[] | null {
  if (boundaryIndex < 0 || boundaryIndex >= tracks.length - 1) return null;

  const next = [...tracks];
  const left = next[boundaryIndex] + weightDelta;
  const right = next[boundaryIndex + 1] - weightDelta;
  if (left < minFr || right < minFr) return null;

  next[boundaryIndex] = left;
  next[boundaryIndex + 1] = right;
  return next;
}

function getRowSiblings(el: HTMLElement, parent: HTMLElement): HTMLElement[] {
  const morphChildren = getMorphChildren(parent);
  const elTop = el.getBoundingClientRect().top;

  return morphChildren
    .filter((child) => Math.abs(child.getBoundingClientRect().top - elTop) < ROW_TOLERANCE_PX)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
}

function boundaryHandle(
  leftEl: HTMLElement,
  rightEl: HTMLElement,
  boundaryIndex: number,
): GridSplitHandle | null {
  const leftRect = leftEl.getBoundingClientRect();
  const rightRect = rightEl.getBoundingClientRect();
  const top = Math.max(leftRect.top, rightRect.top);
  const bottom = Math.min(leftRect.bottom, rightRect.bottom);
  const height = bottom - top;
  if (height < 16) return null;

  return {
    boundaryIndex,
    top,
    left: (leftRect.right + rightRect.left) / 2,
    height,
  };
}

export function resolveGridColumnTracks(
  parent: HTMLElement,
  parentStyleOverride?: Record<string, string>,
  measureEl?: HTMLElement,
): number[] | null {
  const configured =
    parentStyleOverride?.gridTemplateColumns ??
    parentStyleOverride?.['grid-template-columns'];
  if (configured) {
    const parsed = parseFrTracks(configured);
    if (parsed) return parsed;
  }

  const computedTemplate = getComputedStyle(parent).gridTemplateColumns;
  if (isSupportedGridTemplate(computedTemplate)) {
    const parsedFr = parseFrTracks(computedTemplate);
    if (parsedFr) return parsedFr;

    const resolvedWidths = parseResolvedTrackWidths(computedTemplate);
    if (resolvedWidths) return resolvedWidths;
  }

  const probe = measureEl ?? (parent.firstElementChild instanceof HTMLElement ? parent.firstElementChild : null);
  if (probe) {
    const rowSiblings = getRowSiblings(probe, parent);
    if (rowSiblings.length >= 2) {
      return rowSiblings.map((child) => child.getBoundingClientRect().width);
    }
  }

  return null;
}

export function getGridSplitContext(
  el: HTMLElement,
  parentStyleOverride?: Record<string, string>,
): GridSplitContext | null {
  const parent = el.parentElement;
  if (!parent) return null;

  const parentPath = parent.getAttribute('data-morph-path');
  if (!parentPath) return null;

  const parentStyle = getComputedStyle(parent);
  if (!parentStyle.display.includes('grid')) return null;

  const templateSource =
    parentStyleOverride?.gridTemplateColumns ??
    parentStyleOverride?.['grid-template-columns'] ??
    parentStyle.gridTemplateColumns;
  if (!isSupportedGridTemplate(templateSource)) return null;

  const tracks = resolveGridColumnTracks(parent, parentStyleOverride, el);
  if (!tracks || tracks.length < 2) return null;

  const rowSiblings = getRowSiblings(el, parent);
  if (rowSiblings.length < 2) return null;

  const colIndex = rowSiblings.indexOf(el);
  if (colIndex === -1) return null;

  const handles: GridSplitHandle[] = [];

  if (colIndex > 0) {
    const handle = boundaryHandle(rowSiblings[colIndex - 1], rowSiblings[colIndex], colIndex - 1);
    if (handle) handles.push(handle);
  }

  if (colIndex < rowSiblings.length - 1 && colIndex < tracks.length - 1) {
    const handle = boundaryHandle(rowSiblings[colIndex], rowSiblings[colIndex + 1], colIndex);
    if (handle) handles.push(handle);
  }

  if (handles.length === 0) return null;

  return {
    parentPath,
    tracks,
    handles,
    parentWidth: parent.getBoundingClientRect().width,
  };
}
