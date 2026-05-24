import { parseResolvedTrackWidths } from './gridSplitResize';

export interface GridItemResizeContext {
  columnSpan: number;
  maxColumnSpan: number;
  columnStepPx: number;
}

function parsePixelValue(value: string): number | null {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGridSpan(value: string): number | null {
  const match = value.match(/\bspan\s+(\d+)\b/i);
  if (!match) return null;

  const span = Number(match[1]);
  return Number.isInteger(span) && span > 0 ? span : null;
}

function estimateColumnSpan(el: HTMLElement, tracks: number[], columnGap: number): number {
  const rect = el.getBoundingClientRect();
  const totalTrackWidth = tracks.reduce((sum, track) => sum + track, 0);
  const averageTrackWidth = totalTrackWidth / tracks.length;
  const step = averageTrackWidth + columnGap;

  if (step <= 0) return 1;
  return Math.max(1, Math.min(tracks.length, Math.round((rect.width + columnGap) / step)));
}

export function getGridItemResizeContext(el: HTMLElement): GridItemResizeContext | null {
  const parent = el.parentElement;
  if (!parent) return null;

  const parentStyle = getComputedStyle(parent);
  if (!parentStyle.display.includes('grid')) return null;

  const tracks = parseResolvedTrackWidths(parentStyle.gridTemplateColumns);
  if (!tracks || tracks.length < 2) return null;

  const computed = getComputedStyle(el);
  const columnSpan =
    parseGridSpan(el.style.gridColumn) ??
    parseGridSpan(el.style.gridColumnEnd) ??
    parseGridSpan(computed.gridColumn) ??
    parseGridSpan(computed.gridColumnEnd) ??
    estimateColumnSpan(el, tracks, parsePixelValue(parentStyle.columnGap) ?? 0);

  const averageTrackWidth = tracks.reduce((sum, track) => sum + track, 0) / tracks.length;
  const columnStepPx = Math.max(1, averageTrackWidth + (parsePixelValue(parentStyle.columnGap) ?? 0));

  return {
    columnSpan: Math.max(1, Math.min(columnSpan, tracks.length)),
    maxColumnSpan: tracks.length,
    columnStepPx,
  };
}

export function formatGridColumnSpan(span: number): string {
  return `span ${span}`;
}
