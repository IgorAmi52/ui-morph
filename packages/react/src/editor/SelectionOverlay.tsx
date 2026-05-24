import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useMorphContext } from '../config/ConfigContext';
import { getDisabledCapabilities, isCapabilityEnabled } from './capabilities';
import {
  applyBoundaryDelta,
  formatFrTracks,
  getGridSplitContext,
  type GridSplitContext,
  type GridSplitHandle,
} from './gridSplitResize';

interface SelectionOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

interface ResizeBounds {
  minWidth: number;
  minHeight: number;
  maxWidthEast: number;
  maxWidthWest: number;
  maxHeightSouth: number;
  maxHeightNorth: number;
}

interface ResizeState extends ResizeBounds {
  direction: ResizeDirection;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  horizontalOffsetProp: 'left' | 'marginLeft';
  verticalOffsetProp: 'top' | 'marginTop';
  startHorizontalOffset: number;
  startVerticalOffset: number;
}

type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type PendingBoxStyle = Record<string, string>;

const MIN_RESIZE_SIZE = 16;
const MAX_RESIZE_SIZE = 4000;
const COLLISION_GAP = 4;
const RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function parsePixelValue(value: string): number | null {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function supportsBoxResize(el: HTMLElement): boolean {
  return getComputedStyle(el).display !== 'inline';
}

function getBoxResizeDirections(el: HTMLElement, inFluidGrid: boolean): ResizeDirection[] {
  if (inFluidGrid) return [];
  if (!supportsBoxResize(el)) return [];
  if (!isCapabilityEnabled(getDisabledCapabilities(el), 'resize')) return [];
  return RESIZE_DIRECTIONS;
}

function getResizeCursor(direction: ResizeDirection): string {
  if (direction === 'n' || direction === 's') return 'ns-resize';
  if (direction === 'e' || direction === 'w') return 'ew-resize';
  if (direction === 'ne' || direction === 'sw') return 'nesw-resize';
  return 'nwse-resize';
}

function getNumericStyleValue(value: string, fallback: number): number {
  return parsePixelValue(value) ?? fallback;
}

function getResizeBounds(el: HTMLElement, rect: DOMRect): ResizeBounds {
  const computed = getComputedStyle(el);
  const parent = el.parentElement;
  const minWidth = Math.max(MIN_RESIZE_SIZE, parsePixelValue(computed.minWidth) ?? 0);
  const minHeight = Math.max(MIN_RESIZE_SIZE, parsePixelValue(computed.minHeight) ?? 0);
  const isPositioned = computed.position !== 'static';
  let maxWidthEast = Math.min(MAX_RESIZE_SIZE, window.innerWidth - rect.left);
  let maxWidthWest = Math.min(MAX_RESIZE_SIZE, rect.right);
  let maxHeightSouth = Math.min(MAX_RESIZE_SIZE, window.innerHeight - rect.top);
  let maxHeightNorth = Math.min(MAX_RESIZE_SIZE, rect.bottom);

  if (parent) {
    const parentRect = parent.getBoundingClientRect();
    const parentStyle = getComputedStyle(parent);
    if (parentRect.right > rect.left) {
      maxWidthEast = Math.min(maxWidthEast, parentRect.right - rect.left);
    }
    maxWidthWest = Math.min(
      maxWidthWest,
      isPositioned
        ? rect.right - parentRect.left
        : rect.width + Math.max(0, getNumericStyleValue(computed.marginLeft, 0)),
    );

    if (parentStyle.overflowY !== 'visible' && parentRect.bottom > rect.top) {
      maxHeightSouth = Math.min(maxHeightSouth, parentRect.bottom - rect.top);
      maxHeightNorth = Math.min(
        maxHeightNorth,
        isPositioned
          ? rect.bottom - parentRect.top
          : rect.height + Math.max(0, getNumericStyleValue(computed.marginTop, 0)),
      );
    } else if (!isPositioned) {
      maxHeightNorth = Math.min(
        maxHeightNorth,
        rect.height + Math.max(0, getNumericStyleValue(computed.marginTop, 0)),
      );
    }

    if (isPositioned) {
      Array.from(parent.children).forEach((sibling) => {
        if (!(sibling instanceof HTMLElement) || sibling === el) return;
        if (sibling.hasAttribute('data-morph-editor')) return;
        const siblingRect = sibling.getBoundingClientRect();
        if (siblingRect.width === 0 && siblingRect.height === 0) return;
        if (siblingRect.left >= rect.left + minWidth &&
          overlaps(rect.top, rect.bottom, siblingRect.top, siblingRect.bottom)) {
          maxWidthEast = Math.min(maxWidthEast, siblingRect.left - rect.left - COLLISION_GAP);
        }
        if (siblingRect.right <= rect.right - minWidth &&
          overlaps(rect.top, rect.bottom, siblingRect.top, siblingRect.bottom)) {
          maxWidthWest = Math.min(maxWidthWest, rect.right - siblingRect.right - COLLISION_GAP);
        }
        if (siblingRect.top >= rect.top + minHeight &&
          overlaps(rect.left, rect.right, siblingRect.left, siblingRect.right)) {
          maxHeightSouth = Math.min(maxHeightSouth, siblingRect.top - rect.top - COLLISION_GAP);
        }
        if (siblingRect.bottom <= rect.bottom - minHeight &&
          overlaps(rect.left, rect.right, siblingRect.left, siblingRect.right)) {
          maxHeightNorth = Math.min(maxHeightNorth, rect.bottom - siblingRect.bottom - COLLISION_GAP);
        }
      });
    }
  }

  return {
    minWidth,
    minHeight,
    maxWidthEast: Math.max(minWidth, maxWidthEast),
    maxWidthWest: Math.max(minWidth, maxWidthWest),
    maxHeightSouth: Math.max(minHeight, maxHeightSouth),
    maxHeightNorth: Math.max(minHeight, maxHeightNorth),
  };
}

interface GridSplitDragState {
  boundaryIndex: number;
  parentPath: string;
  startX: number;
  startTracks: number[];
  totalWeight: number;
  parentWidth: number;
}

export function SelectionOverlay({ containerRef }: SelectionOverlayProps) {
  const { selectedPath, config, dispatch, beginHistoryTransaction, commitHistoryTransaction } = useMorphContext();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [resizeDirections, setResizeDirections] = useState<ResizeDirection[]>([]);
  const [gridSplit, setGridSplit] = useState<GridSplitContext | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const gridSplitDragRef = useRef<GridSplitDragState | null>(null);
  const pendingBoxStyleRef = useRef<PendingBoxStyle | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingGridTracksRef = useRef<number[] | null>(null);
  const gridFrameRef = useRef<number | null>(null);

  const updateRect = useCallback(() => {
    if (!selectedPath || !containerRef.current) {
      setRect(null);
      setResizeDirections([]);
      setGridSplit(null);
      return;
    }
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(selectedPath)}"]`,
    );
    if (el) {
      setRect(el.getBoundingClientRect());
      const parent = el.parentElement;
      const parentPath = parent?.getAttribute('data-morph-path') ?? undefined;
      const parentStyleOverride = parentPath ? config[parentPath]?.style : undefined;
      const splitContext = isCapabilityEnabled(getDisabledCapabilities(el), 'resize')
        ? getGridSplitContext(el, parentStyleOverride)
        : null;
      setGridSplit(splitContext);
      setResizeDirections(getBoxResizeDirections(el, Boolean(splitContext)));
    } else {
      setRect(null);
      setResizeDirections([]);
      setGridSplit(null);
    }
  }, [selectedPath, containerRef, config]);

  const updateSelectedBox = useCallback((style: PendingBoxStyle) => {
    if (!selectedPath) return;
    dispatch({
      type: 'SET_OVERRIDE',
      payload: {
        path: selectedPath,
        override: {
          style: {
            ...(config[selectedPath]?.style ?? {}),
            ...style,
          },
        },
      },
    });
  }, [config, dispatch, selectedPath]);

  const flushPendingBoxStyle = useCallback(() => {
    frameRef.current = null;
    const pending = pendingBoxStyleRef.current;
    pendingBoxStyleRef.current = null;
    if (pending) updateSelectedBox(pending);
  }, [updateSelectedBox]);

  const scheduleSelectedBox = useCallback((style: PendingBoxStyle) => {
    pendingBoxStyleRef.current = style;
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(flushPendingBoxStyle);
    }
  }, [flushPendingBoxStyle]);

  const updateParentGridTracks = useCallback((parentPath: string, tracks: number[]) => {
    dispatch({
      type: 'SET_OVERRIDE',
      payload: {
        path: parentPath,
        override: {
          style: {
            ...(config[parentPath]?.style ?? {}),
            gridTemplateColumns: formatFrTracks(tracks),
          },
        },
      },
    });
  }, [config, dispatch]);

  const flushPendingGridTracks = useCallback(() => {
    gridFrameRef.current = null;
    const pending = pendingGridTracksRef.current;
    const drag = gridSplitDragRef.current;
    pendingGridTracksRef.current = null;
    if (pending && drag) {
      updateParentGridTracks(drag.parentPath, pending);
    }
  }, [updateParentGridTracks]);

  const scheduleParentGridTracks = useCallback((tracks: number[]) => {
    pendingGridTracksRef.current = tracks;
    if (gridFrameRef.current === null) {
      gridFrameRef.current = window.requestAnimationFrame(flushPendingGridTracks);
    }
  }, [flushPendingGridTracks]);

  const startGridSplit = useCallback((handle: GridSplitHandle, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!gridSplit) return;

    event.preventDefault();
    event.stopPropagation();

    const startTracks = [...gridSplit.tracks];
    gridSplitDragRef.current = {
      boundaryIndex: handle.boundaryIndex,
      parentPath: gridSplit.parentPath,
      startX: event.clientX,
      startTracks,
      totalWeight: startTracks.reduce((sum, track) => sum + track, 0),
      parentWidth: gridSplit.parentWidth,
    };

    beginHistoryTransaction();

    const previousCursor = document.documentElement.style.cursor;
    const previousUserSelect = document.documentElement.style.userSelect;
    document.documentElement.style.cursor = 'col-resize';
    document.documentElement.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const drag = gridSplitDragRef.current;
      if (!drag) return;
      moveEvent.preventDefault();

      const dx = moveEvent.clientX - drag.startX;
      const weightDelta = drag.parentWidth > 0
        ? (dx / drag.parentWidth) * drag.totalWeight
        : 0;
      const nextTracks = applyBoundaryDelta(drag.startTracks, drag.boundaryIndex, weightDelta);
      if (nextTracks) scheduleParentGridTracks(nextTracks);
    };

    const finishGridSplit = () => {
      if (gridFrameRef.current !== null) {
        window.cancelAnimationFrame(gridFrameRef.current);
        gridFrameRef.current = null;
      }
      const pending = pendingGridTracksRef.current;
      const drag = gridSplitDragRef.current;
      pendingGridTracksRef.current = null;
      if (pending && drag) updateParentGridTracks(drag.parentPath, pending);
      commitHistoryTransaction();
      gridSplitDragRef.current = null;
      document.documentElement.style.cursor = previousCursor;
      document.documentElement.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishGridSplit);
      window.removeEventListener('pointercancel', finishGridSplit);
      updateRect();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishGridSplit);
    window.addEventListener('pointercancel', finishGridSplit);
  }, [
    beginHistoryTransaction,
    commitHistoryTransaction,
    gridSplit,
    scheduleParentGridTracks,
    updateParentGridTracks,
    updateRect,
  ]);

  const startResize = useCallback((direction: ResizeDirection, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedPath || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(selectedPath)}"]`,
    );
    if (!el || !getBoxResizeDirections(el, Boolean(gridSplit)).includes(direction)) return;

    event.preventDefault();
    event.stopPropagation();

    const startRect = el.getBoundingClientRect();
    const computed = getComputedStyle(el);
    const isPositioned = computed.position !== 'static';
    const bounds = getResizeBounds(el, startRect);
    resizeStateRef.current = {
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: startRect.width,
      startHeight: startRect.height,
      horizontalOffsetProp: isPositioned ? 'left' : 'marginLeft',
      verticalOffsetProp: isPositioned ? 'top' : 'marginTop',
      startHorizontalOffset: isPositioned
        ? getNumericStyleValue(computed.left, el.offsetLeft)
        : getNumericStyleValue(computed.marginLeft, 0),
      startVerticalOffset: isPositioned
        ? getNumericStyleValue(computed.top, el.offsetTop)
        : getNumericStyleValue(computed.marginTop, 0),
      ...bounds,
    };

    beginHistoryTransaction();

    const previousCursor = document.documentElement.style.cursor;
    const previousUserSelect = document.documentElement.style.userSelect;
    document.documentElement.style.cursor = getResizeCursor(direction);
    document.documentElement.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;
      moveEvent.preventDefault();

      const dx = moveEvent.clientX - resizeState.startX;
      const dy = moveEvent.clientY - resizeState.startY;
      const nextStyle: PendingBoxStyle = {};

      if (resizeState.direction.includes('e')) {
        const width = Math.round(clamp(
          resizeState.startWidth + dx,
          resizeState.minWidth,
          resizeState.maxWidthEast,
        ));
        nextStyle.width = `${width}px`;
      }

      if (resizeState.direction.includes('w')) {
        const width = Math.round(clamp(
          resizeState.startWidth - dx,
          resizeState.minWidth,
          resizeState.maxWidthWest,
        ));
        const appliedDelta = resizeState.startWidth - width;
        nextStyle.width = `${width}px`;
        nextStyle[resizeState.horizontalOffsetProp] = `${Math.round(
          resizeState.startHorizontalOffset + appliedDelta,
        )}px`;
      }

      if (resizeState.direction.includes('s')) {
        const height = Math.round(clamp(
          resizeState.startHeight + dy,
          resizeState.minHeight,
          resizeState.maxHeightSouth,
        ));
        nextStyle.height = `${height}px`;
      }

      if (resizeState.direction.includes('n')) {
        const height = Math.round(clamp(
          resizeState.startHeight - dy,
          resizeState.minHeight,
          resizeState.maxHeightNorth,
        ));
        const appliedDelta = resizeState.startHeight - height;
        nextStyle.height = `${height}px`;
        nextStyle[resizeState.verticalOffsetProp] = `${Math.round(
          resizeState.startVerticalOffset + appliedDelta,
        )}px`;
      }

      scheduleSelectedBox(nextStyle);
    };

    const finishResize = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const pending = pendingBoxStyleRef.current;
      pendingBoxStyleRef.current = null;
      if (pending) updateSelectedBox(pending);
      commitHistoryTransaction();
      resizeStateRef.current = null;
      document.documentElement.style.cursor = previousCursor;
      document.documentElement.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
  }, [containerRef, gridSplit, scheduleSelectedBox, selectedPath, updateSelectedBox, beginHistoryTransaction, commitHistoryTransaction]);

  useEffect(() => {
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    const observer = new MutationObserver(updateRect);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      observer.disconnect();
    };
  }, [updateRect, containerRef]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
    if (gridFrameRef.current !== null) {
      window.cancelAnimationFrame(gridFrameRef.current);
    }
  }, []);

  if (!rect) return null;

  return (
    <>
      <div
        data-morph-editor
        className="morph-editor-selection"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      >
        {resizeDirections.length > 0 && (
          resizeDirections.map((direction) => (
            <button
              key={direction}
              type="button"
              className={`morph-editor-resize-handle morph-editor-resize-handle--${direction}`}
              onPointerDown={(event) => startResize(direction, event)}
              aria-label={`Resize element ${direction}`}
              title="Resize element"
            />
          ))
        )}
      </div>
      {gridSplit?.handles.map((handle) => (
        <button
          key={handle.boundaryIndex}
          type="button"
          data-morph-editor
          className="morph-editor-split-handle"
          style={{
            top: handle.top,
            left: handle.left,
            height: handle.height,
          }}
          onPointerDown={(event) => startGridSplit(handle, event)}
          aria-label="Resize column split"
          title="Drag to resize columns"
        />
      ))}
    </>
  );
}
