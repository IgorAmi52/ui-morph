interface DropTarget {
  rect: DOMRect;
  position: 'before' | 'after';
}

interface DropIndicatorProps {
  target: DropTarget | null;
}

export function DropIndicator({ target }: DropIndicatorProps) {
  if (!target) return null;

  const top =
    target.position === 'before'
      ? target.rect.top - 1
      : target.rect.bottom + 1;

  return (
    <div
      data-morph-editor
      className="morph-editor-drop-indicator"
      style={{
        position: 'fixed',
        top,
        left: target.rect.left,
        width: target.rect.width,
      }}
    />
  );
}
