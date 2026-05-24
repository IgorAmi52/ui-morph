import { useRef, useEffect } from 'react';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Describe a change…',
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [value]);

  return (
    <div className={`morph-chat-composer${disabled ? ' morph-chat-composer--disabled' : ''}`}>
      <div className="morph-chat-composer__box">
        <textarea
          ref={textareaRef}
          className="morph-chat-composer__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!disabled && value.trim()) onSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Message"
        />
        <button
          type="button"
          className="morph-chat-composer__send"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3.4 20.4l17.45-7.6a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.3 1.2l2.1 6.3a1 1 0 00.95.7H12a.5.5 0 010 1H4.15a1 1 0 00-.95.7l-2.1 6.3a1 1 0 001.3 1.2z" />
          </svg>
        </button>
      </div>
      <p className="morph-chat-composer__hint">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
