interface DropTarget {
  rect: DOMRect;
  position: 'before' | 'after';
  axis: 'x' | 'y';
}

interface DropIndicatorProps {
  target: DropTarget | null;
}

export function DropIndicator({ target }: DropIndicatorProps) {
  if (!target) return null;

  const isHorizontal = target.axis === 'y';
  const top = isHorizontal
    ? target.position === 'before'
      ? target.rect.top - 1
      : target.rect.bottom + 1
    : target.rect.top;
  const left = isHorizontal
    ? target.rect.left
    : target.position === 'before'
      ? target.rect.left - 1
      : target.rect.right + 1;

  return (
    <div
      data-morph-editor
      className={`morph-editor-drop-indicator morph-editor-drop-indicator--${target.axis}`}
      style={{
        position: 'fixed',
        top,
        left,
        width: isHorizontal ? target.rect.width : 2,
        height: isHorizontal ? 2 : target.rect.height,
      }}
    />
  );
}
