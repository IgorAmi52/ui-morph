import { useState, useEffect, useCallback, type RefObject } from 'react';
import { useMorphContext } from '../config/ConfigContext';

interface SelectionOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

export function SelectionOverlay({ containerRef }: SelectionOverlayProps) {
  const { selectedPath } = useMorphContext();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!selectedPath || !containerRef.current) {
      setRect(null);
      return;
    }
    const el = containerRef.current.querySelector(`[data-morph-path="${CSS.escape(selectedPath)}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [selectedPath, containerRef]);

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
      <span className="morph-editor-selection__label">{selectedPath}</span>
    </div>
  );
}
