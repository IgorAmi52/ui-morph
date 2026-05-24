import { useState, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string | undefined;
  onChange: (color: string) => void;
  onClear: () => void;
}

export function ColorPicker({ label, value, onChange, onClear }: ColorPickerProps) {
  const [hex, setHex] = useState(value ?? '#000000');

  useEffect(() => {
    setHex(value ?? '#000000');
  }, [value]);

  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">{label}</span>
      <div className="morph-editor-color">
        <input
          type="color"
          className="morph-editor-color__swatch"
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          type="text"
          className="morph-editor-input"
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          style={{ flex: 1 }}
        />
        {value !== undefined && (
          <button className="morph-editor-panel__close" onClick={onClear} title="Clear">
            x
          </button>
        )}
      </div>
    </div>
  );
}
