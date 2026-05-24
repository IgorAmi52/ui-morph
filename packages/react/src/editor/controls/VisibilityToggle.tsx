interface VisibilityToggleProps {
  hidden: boolean;
  onChange: (hidden: boolean) => void;
}

export function VisibilityToggle({ hidden, onChange }: VisibilityToggleProps) {
  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">Visibility</span>
      <div
        className="morph-editor-toggle"
        onClick={() => onChange(!hidden)}
        role="switch"
        aria-checked={!hidden}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(!hidden); }}
      >
        <div className={`morph-editor-toggle__switch${hidden ? '' : ' morph-editor-toggle__switch--on'}`}>
          <div className="morph-editor-toggle__knob" />
        </div>
        <span className="morph-editor-toggle__text">{hidden ? 'Hidden' : 'Visible'}</span>
      </div>
    </div>
  );
}
