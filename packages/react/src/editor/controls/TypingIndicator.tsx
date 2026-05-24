import { SparklesIcon } from '../SparklesIcon';

export function TypingIndicator() {
  return (
    <div className="morph-chat-msg morph-chat-msg--assistant morph-chat-msg--typing">
      <div className="morph-chat-msg__avatar" aria-hidden>
        <SparklesIcon />
      </div>
      <div className="morph-chat-msg__content">
        <div className="morph-chat-msg__bubble morph-chat-msg__bubble--typing">
          <span className="morph-chat-typing">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </div>
  );
}
