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

interface SelectionOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

interface ResizeBounds {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

interface ResizeState extends ResizeBounds {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const MIN_RESIZE_SIZE = 16;
const MAX_RESIZE_SIZE = 4000;
const COLLISION_GAP = 4;

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

function getResizeBounds(el: HTMLElement, rect: DOMRect): ResizeBounds {
  const computed = getComputedStyle(el);
  const parent = el.parentElement;
  const minWidth = Math.max(MIN_RESIZE_SIZE, parsePixelValue(computed.minWidth) ?? 0);
  const minHeight = Math.max(MIN_RESIZE_SIZE, parsePixelValue(computed.minHeight) ?? 0);
  let maxWidth = Math.min(MAX_RESIZE_SIZE, window.innerWidth - rect.left);
  let maxHeight = Math.min(MAX_RESIZE_SIZE, window.innerHeight - rect.top);

  if (parent) {
    const parentRect = parent.getBoundingClientRect();
    const parentStyle = getComputedStyle(parent);
    if (parentRect.right > rect.left) {
      maxWidth = Math.min(maxWidth, parentRect.right - rect.left);
    }
    if (parentStyle.overflowY !== 'visible' && parentRect.bottom > rect.top) {
      maxHeight = Math.min(maxHeight, parentRect.bottom - rect.top);
    }

    if (computed.position !== 'static') {
      Array.from(parent.children).forEach((sibling) => {
        if (!(sibling instanceof HTMLElement) || sibling === el) return;
        if (sibling.hasAttribute('data-morph-editor')) return;
        const siblingRect = sibling.getBoundingClientRect();
        if (siblingRect.width === 0 && siblingRect.height === 0) return;
        if (siblingRect.left >= rect.left + minWidth &&
          overlaps(rect.top, rect.bottom, siblingRect.top, siblingRect.bottom)) {
          maxWidth = Math.min(maxWidth, siblingRect.left - rect.left - COLLISION_GAP);
        }
        if (siblingRect.top >= rect.top + minHeight &&
          overlaps(rect.left, rect.right, siblingRect.left, siblingRect.right)) {
          maxHeight = Math.min(maxHeight, siblingRect.top - rect.top - COLLISION_GAP);
        }
      });
    }
  }

  return {
    minWidth,
    minHeight,
    maxWidth: Math.max(minWidth, maxWidth),
    maxHeight: Math.max(minHeight, maxHeight),
  };
}

export function SelectionOverlay({ containerRef }: SelectionOverlayProps) {
  const { selectedPath, config, dispatch } = useMorphContext();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [canResize, setCanResize] = useState(false);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateRect = useCallback(() => {
    if (!selectedPath || !containerRef.current) {
      setRect(null);
      setCanResize(false);
      return;
    }
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(selectedPath)}"]`,
    );
    if (el) {
      setRect(el.getBoundingClientRect());
      setCanResize(
        supportsBoxResize(el) &&
        isCapabilityEnabled(getDisabledCapabilities(el), 'resize'),
      );
    } else {
      setRect(null);
      setCanResize(false);
    }
  }, [selectedPath, containerRef]);

  const updateSelectedSize = useCallback((width: number, height: number) => {
    if (!selectedPath) return;
    dispatch({
      type: 'SET_OVERRIDE',
      payload: {
        path: selectedPath,
        override: {
          style: {
            ...(config[selectedPath]?.style ?? {}),
            width: `${width}px`,
            height: `${height}px`,
          },
        },
      },
    });
  }, [config, dispatch, selectedPath]);

  const flushPendingSize = useCallback(() => {
    frameRef.current = null;
    const pending = pendingSizeRef.current;
    pendingSizeRef.current = null;
    if (pending) updateSelectedSize(pending.width, pending.height);
  }, [updateSelectedSize]);

  const scheduleSelectedSize = useCallback((width: number, height: number) => {
    pendingSizeRef.current = { width, height };
    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(flushPendingSize);
    }
  }, [flushPendingSize]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedPath || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-morph-path="${CSS.escape(selectedPath)}"]`,
    );
    if (!el || !supportsBoxResize(el)) return;

    event.preventDefault();
    event.stopPropagation();

    const startRect = el.getBoundingClientRect();
    const bounds = getResizeBounds(el, startRect);
    resizeStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: startRect.width,
      startHeight: startRect.height,
      ...bounds,
    };

    const previousCursor = document.documentElement.style.cursor;
    const previousUserSelect = document.documentElement.style.userSelect;
    document.documentElement.style.cursor = 'nwse-resize';
    document.documentElement.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;
      moveEvent.preventDefault();

      const width = Math.round(clamp(
        resizeState.startWidth + moveEvent.clientX - resizeState.startX,
        resizeState.minWidth,
        resizeState.maxWidth,
      ));
      const height = Math.round(clamp(
        resizeState.startHeight + moveEvent.clientY - resizeState.startY,
        resizeState.minHeight,
        resizeState.maxHeight,
      ));

      scheduleSelectedSize(width, height);
    };

    const finishResize = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const pending = pendingSizeRef.current;
      pendingSizeRef.current = null;
      if (pending) updateSelectedSize(pending.width, pending.height);
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
  }, [containerRef, scheduleSelectedSize, selectedPath, updateSelectedSize]);

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
  }, []);

  if (!rect) return null;

  return (
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
      {canResize && (
        <button
          type="button"
          className="morph-editor-resize-handle"
          onPointerDown={startResize}
          aria-label="Resize element"
          title="Resize element"
        />
      )}
    </div>
  );
}
