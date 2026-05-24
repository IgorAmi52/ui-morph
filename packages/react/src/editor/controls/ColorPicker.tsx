import { useState, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string | undefined;
  onChange: (color: string) => void;
  onClear: () => void;
}

const FALLBACK_COLOR = '#ffffff';
const FULL_HEX_RE = /^#[0-9a-fA-F]{6}$/;
const SHORT_HEX_RE = /^#[0-9a-fA-F]{3}$/;

function normalizeHex(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (FULL_HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  if (SHORT_HEX_RE.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function ColorPicker({ label, value, onChange, onClear }: ColorPickerProps) {
  const initialHex = normalizeHex(value) ?? FALLBACK_COLOR;
  const [draftHex, setDraftHex] = useState(initialHex);
  const [swatchHex, setSwatchHex] = useState(initialHex);

  useEffect(() => {
    const nextHex = normalizeHex(value) ?? FALLBACK_COLOR;
    setDraftHex(nextHex);
    setSwatchHex(nextHex);
  }, [value]);

  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">{label}</span>
      <div className="morph-editor-color">
        <input
          type="color"
          className="morph-editor-color__swatch"
          value={swatchHex}
          onChange={(e) => {
            setDraftHex(e.target.value);
            setSwatchHex(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          type="text"
          className="morph-editor-input"
          value={draftHex}
          onChange={(e) => {
            const nextHex = e.target.value;
            const normalizedHex = normalizeHex(nextHex);
            setDraftHex(nextHex);
            if (normalizedHex) {
              setDraftHex(normalizedHex);
              setSwatchHex(normalizedHex);
              onChange(normalizedHex);
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
