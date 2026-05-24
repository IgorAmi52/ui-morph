import type { AgentMessageRequest } from '../types';

export type AgentStreamEventType =
  | 'text_delta'
  | 'tool_start'
  | 'tool_done'
  | 'proposal'
  | 'error'
  | 'done';

export interface AgentStreamHandlers {
  onTextDelta?: (text: string) => void;
  onToolStart?: (name: string, index: number, total: number) => void;
  onToolDone?: (name: string, success: boolean, error?: string) => void;
  onProposal?: (data: {
    reply: string;
    proposedConfig: Record<string, unknown>;
    changes: { path: string; label: string }[];
  }) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n');
  let event = 'message';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return null;
  return { event, data };
}

export async function sendAgentMessageStream(
  apiUrl: string,
  request: AgentMessageRequest,
  handlers: AgentStreamHandlers,
): Promise<void> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/agent/message/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(request),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Agent stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const parsed = parseSseBlock(part.trim());
      if (!parsed) continue;
      const payload = JSON.parse(parsed.data) as Record<string, unknown>;

      switch (parsed.event as AgentStreamEventType) {
        case 'text_delta':
          handlers.onTextDelta?.(String(payload.text ?? ''));
          break;
        case 'tool_start':
          handlers.onToolStart?.(
            String(payload.name ?? ''),
            Number(payload.index ?? 0),
            Number(payload.total ?? 0),
          );
          break;
        case 'tool_done':
          handlers.onToolDone?.(
            String(payload.name ?? ''),
            Boolean(payload.success),
            payload.error ? String(payload.error) : undefined,
          );
          break;
        case 'proposal':
          handlers.onProposal?.(payload as {
            reply: string;
            proposedConfig: Record<string, unknown>;
            changes: { path: string; label: string }[];
          });
          break;
        case 'error':
          handlers.onError?.(String(payload.message ?? 'Unknown error'));
          break;
        case 'done':
          handlers.onDone?.();
          break;
      }
    }
  }

  handlers.onDone?.();
}
