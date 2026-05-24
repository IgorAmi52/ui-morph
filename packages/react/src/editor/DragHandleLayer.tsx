import { useState, useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';

interface HandlePosition {
  path: string;
  top: number;
  left: number;
  height: number;
}

interface DragHandleLayerProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

const GRIP_SVG = `<svg viewBox="0 0 12 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <circle cx="3.5" cy="3" r="1.5"/><circle cx="8.5" cy="3" r="1.5"/>
  <circle cx="3.5" cy="8" r="1.5"/><circle cx="8.5" cy="8" r="1.5"/>
  <circle cx="3.5" cy="13" r="1.5"/><circle cx="8.5" cy="13" r="1.5"/>
  <circle cx="3.5" cy="18" r="1.5"/><circle cx="8.5" cy="18" r="1.5"/>
</svg>`;

export function DragHandleLayer({ containerRef }: DragHandleLayerProps) {
  const [handles, setHandles] = useState<HandlePosition[]>([]);
  const rafRef = useRef(0);

  const updateHandles = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (!containerRef.current) return;

      const els = containerRef.current.querySelectorAll<HTMLElement>('[data-morph-path]');
      const next: HandlePosition[] = [];
      for (const el of els) {
        if (el.closest('[data-morph-editor]')) continue;
        const path = el.getAttribute('data-morph-path');
        if (!path) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        next.push({ path, top: rect.top, left: rect.left, height: rect.height });
      }
      setHandles(next);
    });
  }, [containerRef]);

  useEffect(() => {
    updateHandles();

    window.addEventListener('scroll', updateHandles, true);
    window.addEventListener('resize', updateHandles);

    const observer = new MutationObserver(updateHandles);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      window.removeEventListener('scroll', updateHandles, true);
      window.removeEventListener('resize', updateHandles);
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateHandles, containerRef]);

  return (
    <>
      {handles.map((h) => (
        <DragHandle key={h.path} path={h.path} top={h.top} left={h.left} height={h.height} />
      ))}
    </>
  );
}

interface DragHandleProps {
  path: string;
  top: number;
  left: number;
  height: number;
}

function DragHandle({ path, top, left, height }: DragHandleProps) {
  return (
    <div
      data-morph-editor
      data-morph-drag-handle={path}
      className="morph-editor-drag-handle"
      role="button"
      tabIndex={0}
      aria-label="Move element"
      style={{
        position: 'fixed',
        top: top + height / 2 - 10,
        left: left - 24,
      }}
      dangerouslySetInnerHTML={{ __html: GRIP_SVG }}
    />
  );
}
