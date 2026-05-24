import { useEffect, useState } from 'react';

interface GridSpanControlProps {
  columnSpan: number;
  maxColumnSpan: number;
  isOverridden: boolean;
  onChange: (columnSpan: number) => void;
  onClear: () => void;
}

export function GridSpanControl({
  columnSpan,
  maxColumnSpan,
  isOverridden,
  onChange,
  onClear,
}: GridSpanControlProps) {
  const [value, setValue] = useState(String(columnSpan));

  useEffect(() => {
    setValue(String(columnSpan));
  }, [columnSpan]);

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    const parsed = Number(nextValue);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= maxColumnSpan) {
      onChange(parsed);
    }
  };

  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">Grid columns</span>
      <div className="morph-editor-control__row">
        <input
          type="number"
          className="morph-editor-input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          min={1}
          max={maxColumnSpan}
          style={{ width: 80 }}
          aria-label="Grid column span"
        />
        <span className="morph-editor-control__unit">of {maxColumnSpan}</span>
        {isOverridden && (
          <button type="button" className="morph-editor-panel__close" onClick={onClear} title="Clear">
            x
          </button>
        )}
      </div>
    </div>
  );
}
