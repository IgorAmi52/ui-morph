import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useMorphContext } from '../config/ConfigContext';
import { getParentPath, getSegment } from '../tree/domDecorator';
import type { MorphConfig } from '../types';
import { getDisabledCapabilities, isCapabilityEnabled } from './capabilities';
import { DropIndicator } from './DropIndicator';

interface DndSortManagerProps {
  active: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  onDragActiveChange: (active: boolean) => void;
}

interface DragState {
  activePath: string;
  parentPath: string;
  siblingPaths: string[];
  snapshot: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

interface DropTarget {
  rect: DOMRect;
  position: 'before' | 'after';
  axis: 'x' | 'y';
}

interface DragCandidate {
  path: string;
  startX: number;
  startY: number;
}

interface OverlayPosition {
  x: number;
  y: number;
}

const DRAG_ACTIVATION_DISTANCE = 6;

function getSiblingPaths(
  container: HTMLElement,
  parentPath: string,
  config: MorphConfig,
): string[] {
  const paths: string[] = [];
  const allEls = container.querySelectorAll<HTMLElement>('[data-morph-path]');
  for (const el of allEls) {
    const p = el.getAttribute('data-morph-path')!;
    if (getParentPath(p) === parentPath) paths.push(p);
  }

  const childOrder = config[parentPath]?.childOrder;
  if (!childOrder || childOrder.length === 0) return paths;

  const bySegment = new Map(paths.map((path) => [getSegment(path), path]));
  const ordered: string[] = [];

  for (const segment of childOrder) {
    const path = bySegment.get(segment);
    if (path) {
      ordered.push(path);
      bySegment.delete(segment);
    }
  }

  ordered.push(...bySegment.values());
  return ordered;
}

function computeDropTarget(
  container: HTMLElement,
  siblingPaths: string[],
  activePath: string,
  pointerX: number,
  pointerY: number,
): { index: number; target: DropTarget } | null {
  const rects: { path: string; rect: DOMRect }[] = [];
  for (const p of siblingPaths) {
    if (p === activePath) continue;

    const el = container.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(p)}"]`,
    );
    if (el) rects.push({ path: p, rect: el.getBoundingClientRect() });
  }

  if (rects.length === 0) return null;

  let closestIndex = 0;
  let closestDistance = Infinity;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i].rect;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(pointerX - centerX, pointerY - centerY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  const closest = rects[closestIndex];
  const overlapsRow = rects.some(({ rect }, index) => (
    index !== closestIndex &&
    rect.top < closest.rect.bottom &&
    rect.bottom > closest.rect.top
  ));
  const axis = overlapsRow ? 'x' : 'y';
  const midpoint = axis === 'x'
    ? closest.rect.left + closest.rect.width / 2
    : closest.rect.top + closest.rect.height / 2;
  const pointerPosition = axis === 'x' ? pointerX : pointerY;
  const position: DropTarget['position'] = pointerPosition < midpoint ? 'before' : 'after';
  const closestSiblingIndex = siblingPaths.indexOf(closest.path);
  const index = closestSiblingIndex + (position === 'after' ? 1 : 0);

  return { index, target: { rect: closest.rect, position, axis } };
}

function getPointerDragPath(container: HTMLElement, target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;

  const handle = target.closest<HTMLElement>('[data-morph-drag-handle]');
  if (handle) {
    const path = handle.getAttribute('data-morph-drag-handle');
    if (!path) return null;
    const el = container.querySelector<HTMLElement>(`[data-morph-path="${CSS.escape(path)}"]`);
    if (!el || !isCapabilityEnabled(getDisabledCapabilities(el), 'reorder')) return null;
    return path;
  }

  if (target.closest('[data-morph-editor]')) return null;

  const morphEl = target.closest<HTMLElement>('[data-morph-path]');
  if (!morphEl || !isCapabilityEnabled(getDisabledCapabilities(morphEl), 'reorder')) return null;
  return morphEl?.getAttribute('data-morph-path') ?? null;
}

export function DndSortManager({
  active,
  containerRef,
  children,
  onDragActiveChange,
}: DndSortManagerProps) {
  const { config, dispatch } = useMorphContext();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(null);
  const candidateRef = useRef<DragCandidate | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  const resetDrag = useCallback(() => {
    candidateRef.current = null;
    dragStateRef.current = null;
    dropIndexRef.current = null;
    setDragState(null);
    setDropTarget(null);
    setOverlayPosition(null);
    onDragActiveChange(false);
  }, [onDragActiveChange]);

  const beginDrag = useCallback(
    (path: string, event: PointerEvent): DragState | null => {
      const parent = getParentPath(path);
      if (!parent || !containerRef.current) return null;

      const siblings = getSiblingPaths(containerRef.current, parent, config);
      if (siblings.length < 2) return null;

      const el = containerRef.current.querySelector<HTMLElement>(
        `[data-morph-path="${CSS.escape(path)}"]`,
      );
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const snapshot = el.outerHTML;
      const next: DragState = {
        activePath: path,
        parentPath: parent,
        siblingPaths: siblings,
        snapshot,
        width: rect.width,
        height: rect.height,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };

      dragStateRef.current = next;
      setDragState(next);
      setOverlayPosition({ x: event.clientX - next.offsetX, y: event.clientY - next.offsetY });
      onDragActiveChange(true);
      return next;
    },
    [config, containerRef, onDragActiveChange],
  );

  const updateDropTarget = useCallback((event: PointerEvent, state: DragState) => {
    if (!containerRef.current) return;

    const result = computeDropTarget(
      containerRef.current,
      state.siblingPaths,
      state.activePath,
      event.clientX,
      event.clientY,
    );

    if (result) {
      dropIndexRef.current = result.index;
      setDropTarget(result.target);
    } else {
      dropIndexRef.current = null;
      setDropTarget(null);
    }
  }, [containerRef]);

  const finishDrag = useCallback(() => {
    const state = dragStateRef.current;
    if (state && dropIndexRef.current !== null) {
      const { parentPath, siblingPaths, activePath } = state;
      const currentIndex = siblingPaths.indexOf(activePath);
      const targetIndex = dropIndexRef.current;

      if (currentIndex !== -1 && currentIndex !== targetIndex && currentIndex !== targetIndex - 1) {
        const reordered = [...siblingPaths];
        reordered.splice(currentIndex, 1);
        const insertAt = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
        reordered.splice(insertAt, 0, activePath);

        const childOrder = reordered.map((p) => getSegment(p));
        dispatch({ type: 'REORDER_CHILDREN', payload: { parentPath, childOrder } });
      }
    }

    resetDrag();
  }, [dispatch, resetDrag]);

  useEffect(() => {
    if (!active) {
      resetDrag();
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const removeWindowListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
    };

    const addWindowListeners = () => {
      window.addEventListener('pointermove', handlePointerMove, true);
      window.addEventListener('pointerup', handlePointerUp, true);
      window.addEventListener('pointercancel', handlePointerCancel, true);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;

      const path = getPointerDragPath(container, event.target);
      if (!path) return;

      candidateRef.current = { path, startX: event.clientX, startY: event.clientY };
      addWindowListeners();

      if ((event.target as Element | null)?.closest?.('[data-morph-drag-handle]')) {
        event.preventDefault();
      }
      event.stopPropagation();
    };

    function handlePointerMove(event: PointerEvent) {
      const active = dragStateRef.current;
      if (active) {
        event.preventDefault();
        event.stopPropagation();
        setOverlayPosition({
          x: event.clientX - active.offsetX,
          y: event.clientY - active.offsetY,
        });
        updateDropTarget(event, active);
        return;
      }

      const candidate = candidateRef.current;
      if (!candidate) return;

      const distance = Math.hypot(
        event.clientX - candidate.startX,
        event.clientY - candidate.startY,
      );
      if (distance < DRAG_ACTIVATION_DISTANCE) return;

      event.preventDefault();
      event.stopPropagation();

      const next = beginDrag(candidate.path, event);
      if (next) {
        updateDropTarget(event, next);
      } else {
        candidateRef.current = null;
        removeWindowListeners();
      }
    }

    function handlePointerUp(event: PointerEvent) {
      if (dragStateRef.current) {
        event.preventDefault();
        event.stopPropagation();
        finishDrag();
      } else {
        candidateRef.current = null;
      }
      removeWindowListeners();
    }

    function handlePointerCancel() {
      resetDrag();
      removeWindowListeners();
    }

    container.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, true);
      removeWindowListeners();
    };
  }, [active, beginDrag, containerRef, finishDrag, resetDrag, updateDropTarget]);

  return (
    <>
      {children}
      {active && <DropIndicator target={dropTarget} />}
      {active && dragState && overlayPosition && (
        <div
          data-morph-editor
          className="morph-editor-drag-overlay"
          style={{
            position: 'fixed',
            top: overlayPosition.y,
            left: overlayPosition.x,
            width: dragState.width,
            minHeight: dragState.height,
          }}
          dangerouslySetInnerHTML={{ __html: dragState.snapshot }}
        />
      )}
    </>
  );
}
