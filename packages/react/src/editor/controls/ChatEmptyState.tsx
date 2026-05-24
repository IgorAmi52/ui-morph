import { SparklesIcon } from '../SparklesIcon';

interface ChatEmptyStateProps {
  suggestions: string[];
  refreshing?: boolean;
  onSuggestion: (text: string) => void;
  disabled?: boolean;
}

export function ChatEmptyState({
  suggestions,
  refreshing = false,
  onSuggestion,
  disabled,
}: ChatEmptyStateProps) {
  return (
    <div className="morph-chat-empty">
      <div className="morph-chat-empty__icon" aria-hidden>
        <SparklesIcon />
      </div>
      <h3 className="morph-chat-empty__title">Layout assistant</h3>
      <p className="morph-chat-empty__desc">
        Ask questions or describe changes. Edits preview on the page — you approve before anything is saved.
      </p>
      <div
        className={`morph-chat-empty__chips${refreshing ? ' morph-chat-empty__chips--refreshing' : ''}`}
      >
        {suggestions.length === 0
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="morph-chat-empty__chip morph-chat-empty__chip--loading" />
            ))
          : suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="morph-chat-empty__chip"
                disabled={disabled}
                onClick={() => onSuggestion(s)}
              >
                {s}
              </button>
            ))}
      </div>
    </div>
  );
}
