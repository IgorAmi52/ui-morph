import type { ConfigChangeSummary } from '../types.js';
import { getPool } from '../db/client.js';
import { ValidationError } from './validationService.js';

const DEFAULT_SESSION_ID = 'default';

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

function parseMessages(raw: unknown): StoredChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: StoredChatMessage[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (e.role !== 'user' && e.role !== 'assistant') continue;
    if (typeof e.content !== 'string' || typeof e.id !== 'string') continue;
    if (typeof e.createdAt !== 'string') continue;

    let proposal: StoredChatProposal | undefined;
    if (e.proposal && typeof e.proposal === 'object') {
      const p = e.proposal as Record<string, unknown>;
      if (
        (p.status === 'accepted' || p.status === 'discarded' || p.status === 'expired') &&
        Array.isArray(p.changes)
      ) {
        proposal = {
          status: p.status,
          changes: p.changes as ConfigChangeSummary[],
        };
      }
    }

    messages.push({
      id: e.id,
      role: e.role,
      content: e.content,
      createdAt: e.createdAt,
      proposal,
    });
  }
  return messages;
}

export function validateStoredMessages(raw: unknown): StoredChatMessage[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new ValidationError('messages must be an array');
  }
  return parseMessages(raw);
}

export async function getChatHistory(
  userId: string,
  viewId: string,
  sessionId = DEFAULT_SESSION_ID,
  routeId = viewId,
): Promise<StoredChatMessage[]> {
  const db = getPool();
  const result = await db.query<{ messages: unknown }>(
    `SELECT messages FROM morph_chat_history
     WHERE user_id = $1 AND view_id = $2 AND session_id = $3 AND route_id = $4`,
    [userId, viewId, sessionId, routeId],
  );
  if (result.rowCount === 0) return [];
  return parseMessages(result.rows[0].messages);
}

export async function saveChatHistory(
  userId: string,
  viewId: string,
  messages: StoredChatMessage[],
  sessionId = DEFAULT_SESSION_ID,
  routeId = viewId,
): Promise<StoredChatMessage[]> {
  const validated = validateStoredMessages(messages);
  const db = getPool();
  await db.query(
    `INSERT INTO morph_chat_history (user_id, view_id, session_id, route_id, messages)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (user_id, view_id, session_id, route_id)
     DO UPDATE SET messages = EXCLUDED.messages, updated_at = NOW()`,
    [userId, viewId, sessionId, routeId, JSON.stringify(validated)],
  );
  return validated;
}
