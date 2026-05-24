import { useState, useEffect } from 'react';

interface TextEditorProps {
  text: string | undefined;
  placeholder?: string;
  onChange: (text: string) => void;
  onClear: () => void;
}

export function TextEditor({ text, placeholder, onChange, onClear }: TextEditorProps) {
  const [value, setValue] = useState(text ?? '');

  useEffect(() => {
    setValue(text ?? '');
  }, [text]);

  return (
    <div data-morph-editor className="morph-editor-control">
      <span className="morph-editor-control__label">Text content</span>
      <textarea
        className="morph-editor-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== (text ?? '')) onChange(value);
        }}
        placeholder={placeholder || 'Override text content...'}
        rows={3}
      />
      {text !== undefined && (
        <button
          className="morph-editor-btn morph-editor-btn--danger"
          onClick={onClear}
          style={{ marginTop: 6, fontSize: 12 }}
        >
          Clear text override
        </button>
      )}
    </div>
  );
}
