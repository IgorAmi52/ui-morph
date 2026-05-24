import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { useMorphContext } from '../config/ConfigContext';
import { getParentPath, getSegment } from '../tree/domDecorator';
import { DropIndicator } from './DropIndicator';

interface DndSortManagerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  onDragActiveChange: (active: boolean) => void;
}

interface DragState {
  activePath: string;
  parentPath: string;
  siblingPaths: string[];
  snapshot: string;
}

interface DropTarget {
  rect: DOMRect;
  position: 'before' | 'after';
}

function getSiblingPaths(container: HTMLElement, parentPath: string): string[] {
  const paths: string[] = [];
  const allEls = container.querySelectorAll<HTMLElement>('[data-morph-path]');
  for (const el of allEls) {
    const p = el.getAttribute('data-morph-path')!;
    if (getParentPath(p) === parentPath) paths.push(p);
  }
  return paths;
}

function computeDropTarget(
  container: HTMLElement,
  siblingPaths: string[],
  activePath: string,
  pointerY: number,
): { index: number; target: DropTarget } | null {
  const rects: { path: string; rect: DOMRect }[] = [];
  for (const p of siblingPaths) {
    const el = container.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(p)}"]`,
    );
    if (el) rects.push({ path: p, rect: el.getBoundingClientRect() });
  }

  if (rects.length < 2) return null;

  for (let i = 0; i < rects.length; i++) {
    const midY = rects[i].rect.top + rects[i].rect.height / 2;
    if (pointerY < midY && rects[i].path !== activePath) {
      return { index: i, target: { rect: rects[i].rect, position: 'before' } };
    }
  }

  const last = rects[rects.length - 1];
  if (last.path !== activePath) {
    return {
      index: rects.length,
      target: { rect: last.rect, position: 'after' },
    };
  }
  return null;
}

export function DndSortManager({
  containerRef,
  children,
  onDragActiveChange,
}: DndSortManagerProps) {
  const { dispatch } = useMorphContext();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const pointerYRef = useRef(0);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => { pointerYRef.current = e.clientY; };
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const path = String(event.active.id);
      const parent = getParentPath(path);
      if (!parent || !containerRef.current) return;

      const siblings = getSiblingPaths(containerRef.current, parent);
      if (siblings.length < 2) return;

      const el = containerRef.current.querySelector<HTMLElement>(
        `[data-morph-path="${CSS.escape(path)}"]`,
      );
      const snapshot = el ? el.outerHTML : '';

      setDragState({ activePath: path, parentPath: parent, siblingPaths: siblings, snapshot });
      onDragActiveChange(true);
    },
    [containerRef, onDragActiveChange],
  );

  const handleDragMove = useCallback(
    (_event: DragMoveEvent) => {
      if (!dragState || !containerRef.current) return;
      const pointerY = pointerYRef.current;

      const result = computeDropTarget(
        containerRef.current,
        dragState.siblingPaths,
        dragState.activePath,
        pointerY,
      );

      if (result) {
        dropIndexRef.current = result.index;
        setDropTarget(result.target);
      } else {
        dropIndexRef.current = null;
        setDropTarget(null);
      }
    },
    [dragState, containerRef],
  );

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      if (dragState && dropIndexRef.current !== null) {
        const { parentPath, siblingPaths, activePath } = dragState;
        const currentIndex = siblingPaths.indexOf(activePath);
        let targetIndex = dropIndexRef.current;

        if (currentIndex !== -1 && currentIndex !== targetIndex && currentIndex !== targetIndex - 1) {
          const reordered = [...siblingPaths];
          reordered.splice(currentIndex, 1);
          const insertAt = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
          reordered.splice(insertAt, 0, activePath);

          const childOrder = reordered.map((p) => getSegment(p));
          dispatch({ type: 'REORDER_CHILDREN', payload: { parentPath, childOrder } });
        }
      }

      setDragState(null);
      setDropTarget(null);
      dropIndexRef.current = null;
      onDragActiveChange(false);
    },
    [dragState, dispatch, onDragActiveChange],
  );

  const handleDragCancel = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
    dropIndexRef.current = null;
    onDragActiveChange(false);
  }, [onDragActiveChange]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DropIndicator target={dropTarget} />
      <DragOverlay dropAnimation={null}>
        {dragState && (
          <div
            data-morph-editor
            className="morph-editor-drag-overlay"
            dangerouslySetInnerHTML={{ __html: dragState.snapshot }}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
