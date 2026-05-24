import type { AgentChatMessage, ConfigChangeSummary } from '../types';

export interface StoredChatProposal {
  status: 'accepted' | 'discarded' | 'expired';
  changes: ConfigChangeSummary[];
}

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  proposal?: StoredChatProposal;
}

export function newChatMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toStoredMessages(messages: AgentChatMessage[]): StoredChatMessage[] {
  return messages.map((msg) => {
    const stored: StoredChatMessage = {
      id: msg.id ?? newChatMessageId(),
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt ?? new Date().toISOString(),
    };

    if (msg.proposal) {
      if (msg.proposal.status === 'pending') {
        stored.proposal = {
          status: 'expired',
          changes: msg.proposal.changes,
        };
      } else {
        stored.proposal = {
          status: msg.proposal.status,
          changes: msg.proposal.changes,
        };
      }
    }

    return stored;
  });
}

export function fromStoredMessages(stored: StoredChatMessage[]): AgentChatMessage[] {
  return stored.map((msg) => {
    const runtime: AgentChatMessage = {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    };

    if (msg.proposal) {
      if (msg.proposal.status === 'expired') {
        runtime.proposalSummary = {
          status: 'expired',
          changes: msg.proposal.changes,
        };
      } else {
        runtime.proposalSummary = {
          status: msg.proposal.status,
          changes: msg.proposal.changes,
        };
      }
    }

    return runtime;
  });
}

/** Strip runtime-only proposal payloads before persisting live session. */
export function serializeLiveHistory(messages: AgentChatMessage[]): StoredChatMessage[] {
  return messages.map((msg) => {
    const base: StoredChatMessage = {
      id: msg.id ?? newChatMessageId(),
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt ?? new Date().toISOString(),
    };

    if (msg.proposal && msg.proposal.status !== 'pending') {
      base.proposal = {
        status: msg.proposal.status,
        changes: msg.proposal.changes,
      };
    } else if (msg.proposal?.status === 'pending') {
      base.proposal = {
        status: 'expired',
        changes: msg.proposal.changes,
      };
    }

    return base;
  });
}
