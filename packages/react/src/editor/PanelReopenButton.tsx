import { SparklesIcon } from './SparklesIcon';

interface PanelReopenButtonProps {
  onClick: () => void;
}

export function PanelReopenButton({ onClick }: PanelReopenButtonProps) {
  return (
    <button
      type="button"
      data-morph-editor
      className="morph-editor-panel-reopen"
      onClick={onClick}
      aria-label="Open assistant panel"
    >
      <SparklesIcon />
      <span>Assistant</span>
    </button>
  );
}
