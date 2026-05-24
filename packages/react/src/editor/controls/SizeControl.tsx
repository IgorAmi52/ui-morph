import { useState, useEffect } from 'react';

interface SizeControlProps {
  fontSize: string | undefined;
  onChange: (fontSize: string) => void;
  onClear: () => void;
}

export function SizeControl({ fontSize, onChange, onClear }: SizeControlProps) {
  const numericValue = fontSize ? parseInt(fontSize, 10) : 16;
  const [value, setValue] = useState(String(numericValue));

  useEffect(() => {
    setValue(String(fontSize ? parseInt(fontSize, 10) : 16));
  }, [fontSize]);

  const handleChange = (v: string) => {
    setValue(v);
    const num = parseInt(v, 10);
    if (!isNaN(num) && num > 0 && num <= 200) {
      onChange(`${num}px`);
    }
  };

  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">Font size</span>
      <div className="morph-editor-control__row">
        <input
          type="number"
          className="morph-editor-input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          min={1}
          max={200}
          style={{ width: 80 }}
        />
        <span style={{ fontSize: 13, color: '#64748b' }}>px</span>
        {fontSize !== undefined && (
          <button className="morph-editor-panel__close" onClick={onClear} title="Clear">
            x
          </button>
        )}
      </div>
    </div>
  );
}
