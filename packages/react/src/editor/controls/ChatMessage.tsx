import type { AgentChatMessage } from '../../types';
import { SparklesIcon } from '../SparklesIcon';
import { ChangeApprovalCard } from './ChangeApprovalCard';
import { ChatMarkdown } from './ChatMarkdown';

interface ChatMessageProps {
  message: AgentChatMessage;
  index: number;
  onAccept: () => void;
  onDiscard: () => void;
  approvalBusy: boolean;
  streaming?: boolean;
}

function formatTime(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatMessage({
  message,
  index,
  onAccept,
  onDiscard,
  approvalBusy,
  streaming = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`morph-chat-msg morph-chat-msg--${message.role}${streaming ? ' morph-chat-msg--streaming' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {!isUser && (
        <div className="morph-chat-msg__avatar" aria-hidden>
          <SparklesIcon />
        </div>
      )}
      <div className="morph-chat-msg__content">
        <div className="morph-chat-msg__meta">
          <span className="morph-chat-msg__author">{isUser ? 'You' : 'Assistant'}</span>
          <span className="morph-chat-msg__time">{formatTime(message.createdAt)}</span>
        </div>
        <div className="morph-chat-msg__bubble">
          {isUser ? (
            <p className="morph-chat-msg__text">{message.content}</p>
          ) : (
            <ChatMarkdown content={message.content} />
          )}
        </div>
        {message.proposal?.status === 'pending' && (
          <ChangeApprovalCard
            changes={message.proposal.changes}
            allPaths={message.proposal.changes.map((c) => c.path)}
            onAccept={onAccept}
            onDiscard={onDiscard}
            busy={approvalBusy}
          />
        )}
        {message.proposal?.status === 'accepted' && (
          <p className="morph-chat-msg__status morph-chat-msg__status--ok">Changes saved</p>
        )}
        {message.proposal?.status === 'discarded' && (
          <p className="morph-chat-msg__status">Changes discarded</p>
        )}
        {message.proposalSummary && (
          <div className="morph-chat-msg__proposal-summary">
            <p className="morph-chat-msg__status">
              {message.proposalSummary.status === 'expired'
                ? 'Proposal expired'
                : message.proposalSummary.status === 'accepted'
                  ? 'Changes saved'
                  : 'Changes discarded'}
            </p>
            <ul className="morph-chat-msg__change-list">
              {message.proposalSummary.changes.map((c) => (
                <li key={c.path}>{c.label}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
